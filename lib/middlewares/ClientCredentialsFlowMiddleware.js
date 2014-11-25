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

module.exports = ClientCredentialsFlowMiddleware;

var util = require('util'),
	httpHelper = require('../helpers/httpHelper'),
	ClientCredentialsSender = require('../grants/ClientCredentialsSender'),
	GrantFlowMiddlewareBase = require('./GrantFlowMiddlewareBase');

var TRACE_OBTAIN_TOKEN = 'Obtaining access token for client credentials...';

util.inherits(ClientCredentialsFlowMiddleware, GrantFlowMiddlewareBase);

/**
 * Creates new instance of client credentials flow middleware.
 * @param {ServiceLocator} $serviceLocator Service locator to resolve
 * dependencies.
 *
 * @param {Object} authConfig Middleware configuration.
 * @param {String} authConfig.clientId Id of OAuth 2.0 client.
 * @param {String} authConfig.clientSecret Secret of OAuth 2.0 client.
 * @param {String} authConfig.authServerUrl URL to OAuth 2.0
 * authentication server.
 * @param {Number?} authConfig.timeout Grant send timeout (30000 ms by default).
 * @param {Boolean?} authConfig.unsafeHTTPS Determines if sender will send grant
 * via unsafe HTTPS connection with invalid certificate (false by default).
 * @param {String?} authConfig.tokenEndpointPath URL path to
 * OAuth 2.0 token endpoint (/token by default).
 *
 * @param {Object} endpointConfig Endpoint configuration.
 * @param {String?} endpointConfig.scope Access scope for middleware.
 * @param {Object} endpointConfig.cookie Token cookie configuration.
 * @param {String} endpointConfig.cookie.accessTokenName Name of cookie
 * with access token.
 * @param {String?} endpointConfig.cookie.accessTokenExpiresIn Expiration time
 * in seconds for access token cookie if it is not specified by authorization
 * server (3 600 secs by default, 1 hour).
 * @param {String} endpointConfig.cookie.refreshTokenName Name of cookie
 * with refresh token.
 * @param {String?} endpointConfig.cookie.refreshTokenExpiresIn Expiration time
 * in seconds for refresh token cookie
 * (3 110 400 000 secs by default, 100 years).
 * @param {String?} endpointConfig.cookie.path Path attribute for cookie
 * ('/' by default).
 * @param {String?} endpointConfig.cookie.domain Domain attribute for cookie.
 * @constructor
 * @extends GrantFlowMiddlewareBase
 */
function ClientCredentialsFlowMiddleware($serviceLocator, authConfig,
	endpointConfig) {
	GrantFlowMiddlewareBase.call(this, $serviceLocator, endpointConfig);
	this._sender = new ClientCredentialsSender(
		$serviceLocator, authConfig
	);
}

/**
 * Current client credentials sender.
 * @type {ClientCredentialsSender}
 * @private
 */
ClientCredentialsFlowMiddleware.prototype._sender = null;

/**
 * Handles middleware invocation.
 * @param {http.IncomingMessage} request HTTP request.
 * @param {http.ServerResponse} response HTTP response.
 * @param {Function} next Next function of middleware queue.
 */
ClientCredentialsFlowMiddleware.prototype.handler =
	function (request, response, next) {
		var accessToken = httpHelper.getCookie(
			this._cookieConfig.accessTokenName, request
		);

		if (typeof(accessToken) === 'string') {
			next();
			return;
		}

		var self = this;

		this._logger.trace(TRACE_OBTAIN_TOKEN);
		this._obtainAuthorization()
			.then(function (issuedAuth) {
				return self._handleIssuedAuthorization(
					request, response, issuedAuth
				);
			})
			.then(function () {
				next();
			}, function (reason) {
				self._logger.error(reason);
				next();
			});
	};

/**
 * Obtains authorization from authorization server.
 * @returns {Promise<Object>} Promise for issued authorization.
 * @protected
 */
ClientCredentialsFlowMiddleware.prototype._obtainAuthorization = function () {
	return this._sender.send(this._scope);
};