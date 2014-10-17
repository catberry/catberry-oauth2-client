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

var util = require('util');

var TRACE_API_REQUEST_FORMAT =
		'Request to resource %s "%s"',
	TRACE_API_RESPONSE_FORMAT =
		'Response from resource %s "%s" (%dms)',
	ERROR_CONFIG_NOT_SET = 'Config not set',
	ERROR_CONFIG = 'Config must be an object',
	ERROR_UNAUTHORIZED_URL = '"unauthorizedURIPath" parameter not defined',
	ERROR_HOST = '"serverHost" parameter not defined';

/**
 * Creates instance of OAuth 2.0 resource server role.
 * @param {Logger} $logger Logger to log requests.
 * @param {UHR} $uhr Universal HTTP request to do requests to server.
 * @constructor
 */
function ResourceServer($logger, $uhr) {
	this._logger = $logger;
	this._uhr = $uhr;
}

/**
 * Current host of resource server.
 * @type {string}
 * @private
 */
ResourceServer.prototype._serverHost = '';

/**
 * Current URL used for redirection when resource server returns
 * authorization error.
 * @type {string}
 * @private
 */
ResourceServer.prototype._unauthorizedURIPath = '';

/**
 * Current UHR to do request.
 * @type {UHR}
 * @private
 */
ResourceServer.prototype._uhr = null;

/**
 * Determines if requests with invalid SSL certificate are allowed.
 * @type {boolean}
 * @private
 */
ResourceServer.prototype._unsafeHTTPS = false;

/**
 * Determines if config has been successfully set.
 * @type {boolean}
 * @private
 */
ResourceServer.prototype._isConfigSet = false;

/**
 * Sets configuration for resource server.
 * @param {Object} config Resource server config.
 * @param {String} config.serverHost URL to resource server.
 * @param {String} config.unauthorizedURIPath URL to redirect after
 * authorization error.
 * @param {Boolean?} config.unsafeHTTPS Determines if resource server can have
 * invalid SSL certificate.
 */
ResourceServer.prototype.setConfig = function (config) {
	if (!config || typeof(config) !== 'object') {
		throw new Error(ERROR_CONFIG);
	}
	if (typeof(config.serverHost) !== 'string') {
		throw new Error(ERROR_HOST);
	}
	if (typeof(config.unauthorizedURIPath) !== 'string') {
		throw new Error(ERROR_UNAUTHORIZED_URL);
	}

	this._serverHost = config.serverHost;
	this._unauthorizedURIPath = config.unauthorizedURIPath;
	this._unsafeHTTPS = typeof(config.unsafeHTTPS) === 'boolean' ?
		config.unsafeHTTPS :
		this._unsafeHTTPS;
	this._isConfigSet = true;
};

/**
 * Does request to the resource server.
 * @param {Object} context Current module context.
 * @param {String} token Access token to do request.
 * @param {Object} options Request options.
 * @param {String} options.path Server URL path.
 * @param {Object} options.headers Object with HTTP headers.
 * @param {String?} options.method HTTP method (GET by default).
 * @param {Object?} options.data Data to send to server.
 * @returns {Promise<Object>} Promise for response content.
 */
ResourceServer.prototype.request = function (context, token, options) {
	if (!this._isConfigSet) {
		return Promise.reject(new Error(ERROR_CONFIG_NOT_SET));
	}
	options.method = typeof(options.method) === 'string' ?
		options.method.toLowerCase() : 'get';

	options.path = typeof(options.path) === 'string' ?
		options.path : '';

	var self = this,
		headers = {},
		requestUrl = this._serverHost + options.path;

	if (options.headers && typeof(options.headers) === 'object') {
		Object.keys(options.headers)
			.forEach(function (headerName) {
				headers[headerName] = options.headers[headerName];
			});
	}

	headers.Authorization = 'Bearer ' + token;

	var now = new Date();
	this._logger.trace(util.format(
		TRACE_API_REQUEST_FORMAT, options.method, requestUrl
	));
	return this._uhr[options.method](requestUrl, {
		data: options.data || {},
		headers: headers,
		unsafeHTTPS: this._unsafeHTTPS
	})
		.then(function (result) {
			self._logger.trace(util.format(
				TRACE_API_RESPONSE_FORMAT,
				options.method, requestUrl, (new Date() - now)
			));

			result.content = typeof(result.content) === 'object' ?
				result.content : {};

			if (isStatusCodeBad(result.status.code)) {
				if (result.status.code === 401) {
					var redirectUrl = self._unauthorizedURIPath +
						'?return_uri=' + context.urlPath;
					context.redirect(redirectUrl);
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
 * Does request to the resource server.
 * @param {Object} context Current module context.
 * @param {String} cookieName Name of cookie where access token is stored.
 * @param {Object} options Request options.
 * @param {String} options.path Server URL path.
 * @param {Object} options.headers Object with HTTP headers.
 * @param {String?} options.method HTTP method (GET by default).
 * @param {Object?} options.data Data to send to server.
 * @returns {Promise<Object>} Promise for response content.
 */
ResourceServer.prototype.requestWithCookie =
	function (context, cookieName, options) {
		var token = context.cookies.get(cookieName);
		return this.request(context, token, options);
	};

/**
 * Determines is status code is error.
 * @param {number} statusCode HTTP status code.
 * @returns {boolean} true of code is error.
 */
function isStatusCodeBad(statusCode) {
	return statusCode < 200 || statusCode >= 400;
}
