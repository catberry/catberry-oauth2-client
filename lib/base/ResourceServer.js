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
	uriHelper = require('../helpers/uriHelper'),
	catberryURI = require('catberry-uri'),
	URI = catberryURI.URI,
	Query = catberryURI.Query;

var FIELD_RETURN_URI = 'return_uri',
	TRACE_API_REQUEST_FORMAT =
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
 * @protected
 */
ResourceServer.prototype._config = null;

/**
 * Current UHR to do request.
 * @type {UHR}
 * @protected
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
		requestUri = new URI(this._config.host);

	if (!token) {
		return this._redirectToRefreshEndpoint(context);
	}

	requestUri.path += options.path;
	requestUri = requestUri.toString();

	if (options.headers && typeof(options.headers) === 'object') {
		Object.keys(options.headers)
			.forEach(function (headerName) {
				headers[headerName] = options.headers[headerName];
			});
	}

	headers.Authorization = 'Bearer ' + token;

	var now = new Date();
	this._logger.trace(util.format(
		TRACE_API_REQUEST_FORMAT, upperMethod, requestUri
	));
	return this._uhr[options.method](requestUri, {
		data: options.data || {},
		headers: headers,
		unsafeHTTPS: this._config.unsafeHTTPS
	})
		.then(function (result) {
			self._logger.trace(util.format(
				TRACE_API_RESPONSE_FORMAT,
				upperMethod, requestUri, (new Date() - now)
			));

			result.content = typeof(result.content) === 'object' ?
				result.content : {};
			return self._responseHandler(context, result);
		});
};

/**
 * Gets current access token;
 * @param {Object} context Module context.
 * @returns {String} Access token.
 */
ResourceServer.prototype.getToken = function (context) {
	return context.cookie.get(this._config.endpoint.accessTokenName);
};

/**
 * Determines if context is now authorized to do requests.
 * @param {Object} context Module context.
 * @returns {Boolean} true if access to resource server is authorized.
 */
ResourceServer.prototype.isAuthorized = function (context) {
	var token = this.getToken(context);
	return (typeof(token) === 'string' && token.length > 0);
};

/**
 * Refreshes authorization or remove access and refresh tokens if failed.
 * @param {Object} context Module context.
 * @returns {Promise} Promise for nothing.
 */
ResourceServer.prototype.refreshAuthorization = function (context) {
	return this._redirectToRefreshEndpoint(context);
};

/**
 * Redirects to token remove endpoint.
 * @param {Object} context Module context.
 * @protected
 */
ResourceServer.prototype._redirectToRefreshEndpoint = function (context) {
	var redirectUri = context.location.clone(),
		returnUri = context.location.clone();

	returnUri.scheme = null;
	returnUri.authority = null;

	redirectUri.path = uriHelper.getRefreshPath(this._config.endpoint.name);
	redirectUri.scheme = null;
	redirectUri.authority = null;
	redirectUri.fragment = null;
	redirectUri.query = new Query();
	redirectUri.query.values = {};
	redirectUri.query.values[FIELD_RETURN_URI] = returnUri.toString();
	return context.redirect(redirectUri.toString());
};

/**
 * Determines is status code is error.
 * @param {number} statusCode HTTP status code.
 * @returns {boolean} true if code means error.
 * @protected
 */
ResourceServer.prototype._isStatusCodeBad = function (statusCode) {
	return statusCode < 200 || statusCode >= 400;
};

/**
 * Handles response from resource server.
 * @param {Object} context Module context.
 * @param {Object} result Response result.
 * @protected
 * @abstract
 */
ResourceServer.prototype._responseHandler = function (context, result) {
	if (this._isStatusCodeBad(result.status.code)) {
		if (result.status.code === 401) {
			return this._redirectToRefreshEndpoint(context);
		}
		var reason = new Error(result.status.text);
		reason.code = result.status.code;
		reason.details = result.content;
		throw reason;
	}
	return result.content;
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