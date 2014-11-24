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

module.exports = PasswordCredentialsFlowEndpoint;

var util = require('util'),
	httpHelper = require('../helpers/httpHelper'),
	Query = require('catberry-uri').Query,
	PasswordCredentialsSender = require('../grants/PasswordCredentialsSender'),
	GrantFlowMiddlewareBase = require('../middlewares/GrantFlowMiddlewareBase');

var CONTENT_TYPE = 'application/x-www-form-urlencoded',
	TRACE_OBTAIN_TOKEN = 'Obtaining access token for password credentials...',
	MAX_UPSTREAM_LENGTH = 5120, // 5KB
	FIELD_USERNAME = 'username',
	FIELD_PASSWORD = 'password',
	FIELD_SCOPE = 'scope';

util.inherits(PasswordCredentialsFlowEndpoint, GrantFlowMiddlewareBase);

/**
 * Creates new instance of password credentials flow endpoint.
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
function PasswordCredentialsFlowEndpoint($serviceLocator, authConfig,
	endpointConfig) {
	GrantFlowMiddlewareBase.call(this, $serviceLocator, endpointConfig);
	this._passwordCredentialsSender = new PasswordCredentialsSender(
		$serviceLocator, authConfig
	);
}

/**
 * Current password credentials sender.
 * @type {PasswordCredentialsSender}
 * @private
 */
PasswordCredentialsFlowEndpoint.prototype._passwordCredentialsSender = null;

/**
 * Handles middleware endpoint.
 * @param {http.IncomingMessage} request HTTP request.
 * @param {http.ServerResponse} response HTTP response.
 */
PasswordCredentialsFlowEndpoint.prototype.handler =
	function (request, response) {
		this._logger.trace(TRACE_OBTAIN_TOKEN);
		var self = this;
		this._obtainAuthorization(request)
			.then(function (issuedAuth) {
				return self._handleIssuedAuthorization(
					request, response, issuedAuth
				);
			})
			.then(function (responseObject) {
				httpHelper.writeToResponse(200, responseObject, response);
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
PasswordCredentialsFlowEndpoint.prototype._obtainAuthorization =
	function (request) {
		var self = this;
		var methodError = httpHelper.checkMethod(request, 'post');
		if (methodError) {
			return Promise.reject(methodError);
		}
		var contentTypeError = httpHelper.checkContentType(
			request, CONTENT_TYPE
		);
		if (contentTypeError) {
			return Promise.reject(contentTypeError);
		}
		return new Promise(function (fulfill, reject) {
			var upstream = '';
			request.setEncoding('utf8');
			request
				.on('data', function (chunk) {
					var lengthError = httpHelper.checkLength(
						upstream, chunk, MAX_UPSTREAM_LENGTH
					);
					if (lengthError) {
						reject(lengthError);
						return;
					}
					upstream += chunk;
				})
				.on('error', function (error) {
					reject(error);
				})
				.on('end', function () {
					var parsed = new Query(upstream.replace('+', '%20')).values;
					parsed[FIELD_SCOPE] = parsed[FIELD_SCOPE] || self._scope;
					self._passwordCredentialsSender.send(
						parsed[FIELD_USERNAME],
						parsed[FIELD_PASSWORD],
						parsed[FIELD_SCOPE]
					)
						.then(fulfill, reject);
				});
		});
	};