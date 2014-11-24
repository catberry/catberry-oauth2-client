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

module.exports = AuthorizationCodeFlowEndpoint;

var util = require('util'),
	URI = require('catberry-uri').URI,
	httpHelper = require('../helpers/httpHelper'),
	AuthorizationCodeSender = require('../grants/AuthorizationCodeSender'),
	GrantFlowMiddlewareBase = require('../middlewares/GrantFlowMiddlewareBase');

var FIELD_CODE = 'code',
	TRACE_OBTAIN_TOKEN = 'Obtaining access token for authorization code...',
	ERROR_CODE_REQUIRED = '"code" is required parameter',
	ERROR_REDIRECT_URI = '"redirectUri" not found in config',
	ERROR_RETURN_URI = '"returnUri" not found in config';

util.inherits(AuthorizationCodeFlowEndpoint, GrantFlowMiddlewareBase);

/**
 * Creates new instance of authorization code flow endpoint.
 * @param {ServiceLocator} $serviceLocator Service locator to resolve
 * dependencies.
 *
 * @param {Object} authConfig Endpoint configuration.
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
 * @param {String?} endpointConfig.scope Access scope for endpoint.
 * @param {String} endpointConfig.redirectUri Redirect URI used for
 * obtaining code.
 * @param {String} endpointConfig.returnUri Return URI used to redirect
 * user agent after authorization.
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
function AuthorizationCodeFlowEndpoint($serviceLocator, authConfig,
	endpointConfig) {
	GrantFlowMiddlewareBase.call(this, $serviceLocator, endpointConfig);
	this._sender = new AuthorizationCodeSender(
		$serviceLocator, authConfig
	);
	if (typeof(endpointConfig.redirectUri) !== 'string' ||
		endpointConfig.redirectUri.length === 0) {
		throw new Error(ERROR_REDIRECT_URI);
	}
	this._redirectUri = endpointConfig.redirectUri;

	if (typeof(endpointConfig.returnUri) !== 'string' ||
		endpointConfig.returnUri.length === 0) {
		throw new Error(ERROR_RETURN_URI);
	}
	this._returnUri = new URI(endpointConfig.returnUri);
}

/**
 * Current redirect URI used for obtaining authorization.
 * @type {string}
 * @private
 */
AuthorizationCodeFlowEndpoint.prototype._redirectUri = '';

/**
 * Current return URI used to redirect user agent after authorization.
 * @type {URI}
 * @private
 */
AuthorizationCodeFlowEndpoint.prototype._returnUri = null;

/**
 * Current authorization code sender.
 * @type {AuthorizationCodeSender}
 * @private
 */
AuthorizationCodeFlowEndpoint.prototype._sender = null;

/**
 * Handles endpoint invocation.
 * @param {http.IncomingMessage} request HTTP request.
 * @param {http.ServerResponse} response HTTP response.
 */
AuthorizationCodeFlowEndpoint.prototype.handler =
	function (request, response) {
		var self = this;

		this._logger.trace(TRACE_OBTAIN_TOKEN);
		this._obtainAuthorization(request)
			.then(function (issuedAuth) {
				return self._handleIssuedAuthorization(
					request, response, issuedAuth
				);
			})
			.then(function () {
				httpHelper.redirectResponse(response, self._returnUri);
			})
			.then(null, function (reason) {
				self._logger.error(reason);
				httpHelper.writeError(reason, response);
			});
	};

/**
 * Obtains authorization from authorization server.
 * @param {http.IncomingMessage} request Incoming HTTP request.
 * @returns {Promise<Object>} Promise for issued authorization.
 * @private
 */
AuthorizationCodeFlowEndpoint.prototype._obtainAuthorization =
	function (request) {
		var methodError = httpHelper.checkMethod(request, 'get');
		if (methodError) {
			return Promise.reject(methodError);
		}

		var uri = new URI(request.url);
		if (!uri.query || typeof(uri.query.values.code) !== 'string') {
			var error = new Error(ERROR_CODE_REQUIRED);
			error.code = 400;
			return Promise.reject(error);
		}
		return this._sender
			.send(uri.query.values[FIELD_CODE], this._redirectUri);
	};