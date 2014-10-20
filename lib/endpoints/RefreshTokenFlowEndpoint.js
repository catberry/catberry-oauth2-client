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

module.exports = RefreshTokenFlowEndpoint;

var util = require('util'),
	url = require('url'),
	httpHelper = require('../helpers/httpHelper'),
	RefreshTokenSender = require('../grants/RefreshTokenSender'),
	GrantFlowMiddlewareBase = require('../middlewares/GrantFlowMiddlewareBase');

var FIELD_RETURN_URI = 'return_uri',
	TRACE_OBTAIN_TOKEN = 'Obtaining access token for refresh token...',
	ERROR_REFRESH_TOKEN = 'Refresh token must be specified';

util.inherits(RefreshTokenFlowEndpoint, GrantFlowMiddlewareBase);

/**
 * Creates new instance of refresh token flow endpoint.
 * @param {ServiceLocator} $serviceLocator Service locator to resolve
 * dependencies.
 * @param {Object} config Middleware configuration.
 * @param {String?} config.scope Access scope for middleware.
 * @param {Object} config.cookie Token cookie configuration.
 * @param {String} config.cookie.accessTokenName Name of cookie
 * with access token.
 * @param {String?} config.cookie.accessTokenExpiresIn Expiration time
 * in seconds for access token cookie if it is not specified by authorization
 * server (3 600 secs by default, 1 hour).
 * @param {String} config.cookie.refreshTokenName Name of cookie
 * with refresh token.
 * @param {String?} config.cookie.refreshTokenExpiresIn Expiration time
 * in seconds for refresh token cookie
 * (3 110 400 000 secs by default, 100 years).
 * @param {String?} config.cookie.path Path attribute for cookie
 * ('/' by default).
 * @param {String?} config.cookie.domain Domain attribute for cookie.
 * @param {String} config.clientId Id of OAuth 2.0 client.
 * @param {String} config.clientSecret Secret of OAuth 2.0 client.
 * @param {String} config.authServerUrl URL to OAuth 2.0 authentication server.
 * @param {Number?} config.timeout Grant send timeout (30000 ms by default).
 * @param {Boolean?} config.unsafeHTTPS Determines if sender will send grant
 * via unsafe HTTPS connection with invalid certificate (false by default).
 * @param {String?} config.tokenEndPointPath URL path to
 * OAuth 2.0 token endpoint (/token by default).
 * @constructor
 * @extends GrantFlowMiddlewareBase
 */
function RefreshTokenFlowEndpoint($serviceLocator, config) {
	GrantFlowMiddlewareBase.call(this, $serviceLocator, config);
	this._refreshTokenSender = new RefreshTokenSender(
		$serviceLocator, config
	);
}

/**
 * Current client credentials sender.
 * @type {RefreshTokenSender}
 * @private
 */
RefreshTokenFlowEndpoint.prototype._refreshTokenSender = null;

/**
 * Handles middleware invocation.
 * @param {http.IncomingMessage} request HTTP request.
 * @param {http.ServerResponse} response HTTP response.
 */
RefreshTokenFlowEndpoint.prototype.handler = function (request, response) {
	this._logger.trace(TRACE_OBTAIN_TOKEN);
	var self = this;
	this._obtainAuthorization(request)
		.then(function (issuedAuth) {
			return self._handleIssuedAuthorization(
				request, response, issuedAuth
			);
		})
		.then(function (responseObject) {
			var urlInfo = url.parse(request.url, true),
				returnUri = urlInfo.query[FIELD_RETURN_URI];
			if (returnUri) {
				httpHelper.redirectResponse(response, returnUri);
			} else {
				httpHelper.writeToResponse(200, responseObject, response);
			}
		})
		.then(null, function (reason) {
			self._logger.error(reason);
			// unset refresh token
			httpHelper.setCookie(request, response, {
				key: this._cookieConfig.refreshTokenName,
				value: 'null',
				path: this._cookieConfig.path,
				domain: this._cookieConfig.domain,
				expires: new Date(0),
				maxAge: 0
			});
			httpHelper.writeError(reason, response);
		});
};

/**
 * Obtains authorization from authorization server.
 * @returns {Promise<Object>} Promise for issued authorization.
 * @private
 */
RefreshTokenFlowEndpoint.prototype._obtainAuthorization = function (request) {
	var refreshToken = httpHelper.getCookie(
		this._cookieConfig.refreshTokenName, request
	);

	if (typeof(refreshToken) !== 'string') {
		return Promise.reject(new Error(ERROR_REFRESH_TOKEN));
	}
	return this._refreshTokenSender
		.send(refreshToken, this._scope);
};