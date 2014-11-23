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

module.exports = OAuth2FlowFactory;

var util = require('util'),
	uriHelper = require('./helpers/uriHelper'),
	BrowserOAuth2FlowFactory = require('../browser/OAuth2FlowFactory'),
	AuthorizationCodeFlowEndpoint =
		require('./endpoints/AuthorizationCodeFlowEndpoint'),
	ClientCredentialsFlowMiddleware =
		require('./middlewares/ClientCredentialsFlowMiddleware'),
	ClientCredentialsFlowEndpoint =
		require('./endpoints/ClientCredentialsFlowEndpoint'),
	PasswordCredentialsFlowEndpoint =
		require('./endpoints/PasswordCredentialsFlowEndpoint'),
	RefreshTokenFlowEndpoint =
		require('./endpoints/RefreshTokenFlowEndpoint'),
	InvalidationEndpoint = require('./endpoints/InvalidationEndpoint');

var ERROR_ENDPOINTS = 'Authorization endpoints not found',
	ERROR_GRANT_TYPE = 'Wrong grant type "%s"';

util.inherits(OAuth2FlowFactory, BrowserOAuth2FlowFactory);

/**
 * Creates new instance of OAuth 2.0 flow factory.
 * @param {ServiceLocator} $serviceLocator Service locator to resolve
 * dependencies.
 * @param {Object} authorization Authorization section of config.
 * @param {Object} authorization.endpoints Configuration of endpoints.
 * @param {String} authorization.clientId Id of OAuth 2.0 client.
 * @param {String} authorization.clientSecret Secret of OAuth 2.0 client.
 * @param {String} authorization.authServerUrl URL to OAuth 2.0
 * authentication server.
 * @param {Number?} authorization.timeout Grant send timeout
 * (30000 ms by default).
 * @param {Boolean?} authorization.unsafeHTTPS Determines if sender
 * will send grant
 * via unsafe HTTPS connection with invalid certificate (false by default).
 * @param {String?} authorization.tokenEndpointPath URL path to
 * OAuth 2.0 token endpoint (/token by default).
 * @constructor
 * @extends browser/OAuth2FlowFactory
 */
function OAuth2FlowFactory($serviceLocator, authorization) {
	BrowserOAuth2FlowFactory.call(this, $serviceLocator, authorization);
}

/**
 * Creates new instance of endpoint for authorization code flow.
 * @param {Object} config Endpoint configuration.
 * @param {String} config.name Endpoint name.
 * @param {String?} config.scope Access scope for middleware.
 * @param {String} config.redirectUri Redirect URI used for obtaining code.
 * @param {String} config.returnUri Return URI used to redirect
 * user agent after authorization.
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
 * @returns {Function} Middleware function.
 */
OAuth2FlowFactory.prototype.createAuthorizationCodeFlow = function (config) {
	var middleware = new AuthorizationCodeFlowEndpoint(
		this._locator, this._config, config
	);
	return middleware.handler.bind(middleware);
};

/**
 * Creates new instance of endpoint for client credentials flow.
 * @param {Object} config Endpoint configuration.
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
 * @returns {Function} Middleware function.
 */
OAuth2FlowFactory.prototype.createClientCredentialsFlow = function (config) {
	var middleware = new ClientCredentialsFlowEndpoint(
		this._locator, this._config, config
	);
	return middleware.handler.bind(middleware);
};

/**
 * Creates new instance of middleware for client credentials flow.
 * @param {Object} config Middleware configuration.
 * @param {String} config.name Endpoint name.
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
 * @returns {Function} Middleware function.
 */
OAuth2FlowFactory.prototype.createClientCredentialsMiddleware =
	function (config) {
		var middleware = new ClientCredentialsFlowMiddleware(
			this._locator, this._config, config
		);
		return middleware.handler.bind(middleware);
	};

/**
 * Creates new instance of endpoint for resource owner password
 * credentials flow.
 * @param {Object} config Endpoint configuration.
 * @param {String} config.name Endpoint name.
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
 * @returns {Function} Middleware function.
 */
OAuth2FlowFactory.prototype.createPasswordCredentialsFlow = function (config) {
	var middleware = new PasswordCredentialsFlowEndpoint(
		this._locator, this._config, config
	);
	return middleware.handler.bind(middleware);
};

/**
 * Creates new instance of middleware for resource owner password
 * credentials flow.
 * @param {Object} config Middleware configuration.
 * @param {String} config.name Endpoint name.
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
 * @returns {Function} Middleware function.
 */
OAuth2FlowFactory.prototype.createRefreshTokenFlow = function (config) {
	var middleware = new RefreshTokenFlowEndpoint(
		this._locator, this._config, config
	);
	return middleware.handler.bind(middleware);
};

/**
 * Creates middleware for token invalidation.
 * @param {Object} config Middleware configuration.
 * @param {Object} config.cookie Token cookie configuration.
 * @param {String} config.cookie.accessTokenName Name of cookie
 * with access token.
 * @param {String?} config.cookie.path Path attribute for cookie
 * ('/' by default).
 * @param {String?} config.cookie.domain Domain attribute for cookie.
 * @returns {Function} Middleware function.
 */
OAuth2FlowFactory.prototype.createInvalidationFlow = function (config) {
	var middleware = new InvalidationEndpoint(config);
	return middleware.handler.bind(middleware);
};

/**
 * Adds all requires endpoints and middlewares of current configuration.
 * @param {Object} app Connect/Express application object.
 */
OAuth2FlowFactory.prototype.addEndpoints = function (app) {
	var self = this,
		endpoints = this._config.endpoints;

	if (!endpoints ||
		typeof(endpoints) !== 'object' ||
		Object.keys(endpoints).length === 0) {
		throw new Error(ERROR_ENDPOINTS);
	}

	Object.keys(endpoints)
		.forEach(function (name) {
			var grantType = endpoints[name].grantType,
				endpointConfig = Object.create(endpoints[name]);
			endpointConfig.name = name;

			app.use(
				uriHelper.getRefreshPath(name),
				self.createRefreshTokenFlow(endpointConfig)
			);
			app.use(
				uriHelper.getRemovePath(name),
				self.createInvalidationFlow(endpointConfig)
			);

			switch (endpoints[name].grantType) {
				case 'client_credentials':
					app.use(
						uriHelper.getPath(name),
						self.createClientCredentialsFlow(endpointConfig)
					);
					app.use(
						self.createClientCredentialsMiddleware(endpointConfig)
					);
					break;
				case 'password':
					app.use(
						uriHelper.getPath(name),
						self.createPasswordCredentialsFlow(endpointConfig)
					);
					break;
				case 'authorization_code':
					app.use(
						uriHelper.getPath(name),
						self.createAuthorizationCodeFlow(endpointConfig)
					);
					break;
				default:
					throw new Error(util.format(ERROR_GRANT_TYPE, grantType));
			}
		});
};