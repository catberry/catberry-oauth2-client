/*
 * catberry-oauth
 *
 * Copyright (c) 2014 Denis Rechkunov and project contributors.
 *
 * catberry-oauth's license follows:
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge,
 * publish, distribute, sublicense, and/or sell copies of the Software,
 * and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * This license applies to all parts of catberry-oauth that are not externally
 * maintained libraries.
 */

'use strict';

module.exports = ResourceServer;

var util = require('util'),
	urlHelper = require('./helpers/urlHelper');

var TRACE_API_REQUEST_FORMAT =
		'Request to resource %s "%s"',
	TRACE_API_RESPONSE_FORMAT =
		'Response from resource %s "%s" (%dms)',
	ERROR_CONFIG = 'Config must be an object',
	ERROR_ENDPOINT_CONFIG = '"endpoint" parameters must be an object',
	ERROR_ENDPOINT_NAME = '"endpoint.name" parameter not defined',
	ERROR_TOKEN_NAME = '"endpoint.accessTokenName" parameter not defined',
	ERROR_HOST = '"host" parameter not defined';

/**
 * Creates instance of OAuth 2.0 resource server role.
 * @param {ServiceLocator} $serviceLocator Service locator to resolve
 * dependencies.
 *
 * @param {Object} config Configuration object.
 * @param {String} config.host Resource server host.
 * @param {Boolean?} config.unsafeHTTPS Determines if sender will send grant
 * via unsafe HTTPS connection with invalid certificate (false by default).
 *
 * @param {Object} config.endpoint Configuration of endpoint used
 * for authorization.
 * @param {String} config.endpoint.name Name of endpoint.
 * @param {String} config.endpoint.accessTokenName Name of access token cookie.
 * @constructor
 */
function ResourceServer($serviceLocator, config) {
	validateConfig(config);
	this._config = Object.create(config);
	this._logger = $serviceLocator.resolve('logger');
	this._uhr = $serviceLocator.resolve('uhr');

	this._config.unsafeHTTPS = typeof(this._config.unsafeHTTPS) === 'boolean' ?
		this._config.unsafeHTTPS : false;
}

/**
 * Current configuration.
 * @type {Object}
 * @private
 */
ResourceServer.prototype._config = null;

/**
 * Current UHR to do request.
 * @type {UHR}
 * @private
 */
ResourceServer.prototype._uhr = null;

/**
 * Does request to the resource server.
 * @param {Object} context Current module context.
 * @param {Object} options Request options.
 * @param {String} options.path Server URL path.
 * @param {Object} options.headers Object with HTTP headers.
 * @param {String?} options.method HTTP method (GET by default).
 * @param {Object?} options.data Data to send to server.
 * @returns {Promise<Object>} Promise for response content.
 */
ResourceServer.prototype.request = function (context, options) {
	options.method = typeof(options.method) === 'string' ?
		options.method.toLowerCase() : 'get';

	options.path = typeof(options.path) === 'string' ?
		options.path : '';

	var self = this,
		token = this.getToken(context),
		headers = {},
		upperMethod = options.method.toUpperCase(),
		requestUrl = this._config.host + options.path;

	if (options.headers && typeof(options.headers) === 'object') {
		Object.keys(options.headers)
			.forEach(function (headerName) {
				headers[headerName] = options.headers[headerName];
			});
	}

	headers.Authorization = 'Bearer ' + token;

	var now = new Date();
	this._logger.trace(util.format(
		TRACE_API_REQUEST_FORMAT, upperMethod, requestUrl
	));
	return this._uhr[options.method](requestUrl, {
		data: options.data || {},
		headers: headers,
		unsafeHTTPS: this._config.unsafeHTTPS
	})
		.then(function (result) {
			self._logger.trace(util.format(
				TRACE_API_RESPONSE_FORMAT,
				upperMethod, requestUrl, (new Date() - now)
			));

			result.content = typeof(result.content) === 'object' ?
				result.content : {};

			if (isStatusCodeBad(result.status.code)) {
				if (result.status.code === 401) {
					self.refreshAuthorization(context);
				}
				var reason = new Error(result.status.text);
				reason.code = result.status.code;
				reason.details = result.content;
				throw reason;
			}
			return result.content;
		});
};

/**
 * Gets current access token;
 * @param {Object} context Module context.
 * @returns {String} Access token.
 */
ResourceServer.prototype.getToken = function (context) {
	return context.cookies.get(this._config.endpoint.accessTokenName);
};

/**
 * Determines if context is now authorized to do requests.
 * @param {Object} context
 */
ResourceServer.prototype.isAuthorized = function (context) {
	var token = this.getToken(context);
	return typeof(token) === 'string' && token.length > 0;
};

/**
 * Refreshes authorization or remove all tokens if failed.
 * @param {Object} context Module context.
 */
ResourceServer.prototype.refreshAuthorization = function (context) {
	var redirectUrl = urlHelper.getRefreshPath(this._config.endpoint.name);

	redirectUrl += '?return_uri=' + context.urlPath;
	context.redirect(redirectUrl);
};

/**
 * Removes all tokens.
 * @param {Object} context Module context.
 */
ResourceServer.prototype.removeAuthorization = function (context) {
	var token = this.getToken(context),
		redirectUrl = urlHelper.getRemovePath(this._config.endpoint.name);

	redirectUrl += '?token=' + token + '&return_uri=' + context.urlPath;
	context.redirect(redirectUrl);
};

/**
 * Validates resource server configuration.
 * @param {Object} config Config object.
 */
/*jshint maxcomplexity:false */
function validateConfig(config) {
	if (!config || typeof(config) !== 'object') {
		throw new Error(ERROR_CONFIG);
	}
	if (typeof(config.host) !== 'string' ||
		config.host.length === 0) {
		throw new Error(ERROR_HOST);
	}
	if (!config.endpoint || typeof(config.endpoint) !== 'object') {
		throw new Error(ERROR_ENDPOINT_CONFIG);
	}
	if (typeof(config.endpoint.name) !== 'string' ||
		config.endpoint.name.length === 0) {
		throw new Error(ERROR_ENDPOINT_NAME);
	}
	if (typeof(config.endpoint.accessTokenName) !== 'string' ||
		config.endpoint.accessTokenName.length === 0) {
		throw new Error(ERROR_TOKEN_NAME);
	}
}

/**
 * Determines is status code is error.
 * @param {number} statusCode HTTP status code.
 * @returns {boolean} true of code is error.
 */
function isStatusCodeBad(statusCode) {
	return statusCode < 200 || statusCode >= 400;
}
