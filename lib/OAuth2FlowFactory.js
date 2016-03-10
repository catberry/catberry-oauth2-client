'use strict';

const uriHelper = require('./helpers/uriHelper');
const BrowserOAuth2FlowFactory = require('../browser/OAuth2FlowFactory');
const AuthorizationCodeFlowEndpoint = require('./endpoints/AuthorizationCodeFlowEndpoint');
const ClientCredentialsFlowMiddleware = require('./middlewares/ClientCredentialsFlowMiddleware');
const ClientCredentialsFlowEndpoint = require('./endpoints/ClientCredentialsFlowEndpoint');
const PasswordCredentialsFlowEndpoint = require('./endpoints/PasswordCredentialsFlowEndpoint');
const RefreshTokenFlowEndpoint = require('./endpoints/RefreshTokenFlowEndpoint');
const InvalidationEndpoint = require('./endpoints/InvalidationEndpoint');

/**
 * Creates new instance of OAuth 2.0 flow factory.
 * @param {ServiceLocator} locator Service locator to resolve dependencies.
 * @param {Object} authorization Authorization section of config.
 * @param {Object} authorization.endpoints Configuration of endpoints.
 * @param {string} authorization.clientId Id of OAuth 2.0 client.
 * @param {string} authorization.clientSecret Secret of OAuth 2.0 client.
 * @param {string} authorization.authServerUrl URL to OAuth 2.0 authentication server.
 * @param {number?} authorization.timeout Grant send timeout (30000 ms by default).
 * @param {boolean?} authorization.unsafeHTTPS Determines if sender will send grant
 * via unsafe HTTPS connection with invalid certificate (false by default).
 * @param {string?} authorization.tokenEndpointPath URL path to OAuth 2.0 token endpoint (/token by default).
 */
class OAuth2FlowFactory extends BrowserOAuth2FlowFactory {

	/**
	 * Creates new instance of endpoint for authorization code flow.
	 * @param {Object} config Endpoint configuration.
	 * @param {string} config.name Endpoint name.
	 * @param {string?} config.scope Access scope for middleware.
	 * @param {string} config.redirectUri Redirect URI used for obtaining code.
	 * @param {string} config.returnUri Return URI used to redirect
	 * user agent after authorization.
	 * @param {Object} config.cookie Token cookie configuration.
	 * @param {string} config.cookie.accessTokenName Name of cookie
	 * with access token.
	 * @param {string?} config.cookie.accessTokenExpiresIn Expiration time
	 * in seconds for access token cookie if it is not specified by authorization
	 * server (3 600 secs by default, 1 hour).
	 * @param {string} config.cookie.refreshTokenName Name of cookie
	 * with refresh token.
	 * @param {string?} config.cookie.refreshTokenExpiresIn Expiration time
	 * in seconds for refresh token cookie
	 * (3 110 400 000 secs by default, 100 years).
	 * @param {string?} config.cookie.path Path attribute for cookie
	 * ('/' by default).
	 * @param {string?} config.cookie.domain Domain attribute for cookie.
	 * @returns {Function} Middleware function.
	 */
	createAuthorizationCodeFlow(config) {
		const middleware = new AuthorizationCodeFlowEndpoint(this._locator, this._config, config);
		return middleware.handler.bind(middleware);
	}

	/**
	 * Creates new instance of endpoint for client credentials flow.
	 * @param {Object} config Endpoint configuration.
	 * @param {string?} config.scope Access scope for middleware.
	 * @param {Object} config.cookie Token cookie configuration.
	 * @param {string} config.cookie.accessTokenName Name of cookie
	 * with access token.
	 * @param {string?} config.cookie.accessTokenExpiresIn Expiration time
	 * in seconds for access token cookie if it is not specified by authorization
	 * server (3 600 secs by default, 1 hour).
	 * @param {string} config.cookie.refreshTokenName Name of cookie
	 * with refresh token.
	 * @param {string?} config.cookie.refreshTokenExpiresIn Expiration time
	 * in seconds for refresh token cookie
	 * (3 110 400 000 secs by default, 100 years).
	 * @param {string?} config.cookie.path Path attribute for cookie
	 * ('/' by default).
	 * @param {string?} config.cookie.domain Domain attribute for cookie.
	 * @returns {Function} Middleware function.
	 */
	createClientCredentialsFlow(config) {
		const middleware = new ClientCredentialsFlowEndpoint(this._locator, this._config, config);
		return middleware.handler.bind(middleware);
	}

	/**
	 * Creates new instance of middleware for client credentials flow.
	 * @param {Object} config Middleware configuration.
	 * @param {string} config.name Endpoint name.
	 * @param {string?} config.scope Access scope for middleware.
	 * @param {Object} config.cookie Token cookie configuration.
	 * @param {string} config.cookie.accessTokenName Name of cookie
	 * with access token.
	 * @param {string?} config.cookie.accessTokenExpiresIn Expiration time
	 * in seconds for access token cookie if it is not specified by authorization
	 * server (3 600 secs by default, 1 hour).
	 * @param {string} config.cookie.refreshTokenName Name of cookie
	 * with refresh token.
	 * @param {string?} config.cookie.refreshTokenExpiresIn Expiration time
	 * in seconds for refresh token cookie
	 * (3 110 400 000 secs by default, 100 years).
	 * @param {string?} config.cookie.path Path attribute for cookie
	 * ('/' by default).
	 * @param {string?} config.cookie.domain Domain attribute for cookie.
	 * @returns {Function} Middleware function.
	 */
	createClientCredentialsMiddleware(config) {
		const middleware = new ClientCredentialsFlowMiddleware(this._locator, this._config, config);
		return middleware.handler.bind(middleware);
	}

	/**
	 * Creates new instance of endpoint for resource owner password
	 * credentials flow.
	 * @param {Object} config Endpoint configuration.
	 * @param {string} config.name Endpoint name.
	 * @param {string?} config.scope Access scope for middleware.
	 * @param {Object} config.cookie Token cookie configuration.
	 * @param {string} config.cookie.accessTokenName Name of cookie
	 * with access token.
	 * @param {string?} config.cookie.accessTokenExpiresIn Expiration time
	 * in seconds for access token cookie if it is not specified by authorization
	 * server (3 600 secs by default, 1 hour).
	 * @param {string} config.cookie.refreshTokenName Name of cookie
	 * with refresh token.
	 * @param {string?} config.cookie.refreshTokenExpiresIn Expiration time
	 * in seconds for refresh token cookie
	 * (3 110 400 000 secs by default, 100 years).
	 * @param {string?} config.cookie.path Path attribute for cookie
	 * ('/' by default).
	 * @param {string?} config.cookie.domain Domain attribute for cookie.
	 * @returns {Function} Middleware function.
	 */
	createPasswordCredentialsFlow(config) {
		const middleware = new PasswordCredentialsFlowEndpoint(this._locator, this._config, config);
		return middleware.handler.bind(middleware);
	}

	/**
	 * Creates new instance of middleware for resource owner password
	 * credentials flow.
	 * @param {Object} config Middleware configuration.
	 * @param {string} config.name Endpoint name.
	 * @param {string?} config.scope Access scope for middleware.
	 * @param {Object} config.cookie Token cookie configuration.
	 * @param {string} config.cookie.accessTokenName Name of cookie
	 * with access token.
	 * @param {string?} config.cookie.accessTokenExpiresIn Expiration time
	 * in seconds for access token cookie if it is not specified by authorization
	 * server (3 600 secs by default, 1 hour).
	 * @param {string} config.cookie.refreshTokenName Name of cookie
	 * with refresh token.
	 * @param {string?} config.cookie.refreshTokenExpiresIn Expiration time
	 * in seconds for refresh token cookie
	 * (3 110 400 000 secs by default, 100 years).
	 * @param {string?} config.cookie.path Path attribute for cookie
	 * ('/' by default).
	 * @param {string?} config.cookie.domain Domain attribute for cookie.
	 * @returns {Function} Middleware function.
	 */
	createRefreshTokenFlow(config) {
		const middleware = new RefreshTokenFlowEndpoint(this._locator, this._config, config);
		return middleware.handler.bind(middleware);
	}

	/**
	 * Creates middleware for token invalidation.
	 * @param {Object} config Middleware configuration.
	 * @param {Object} config.cookie Token cookie configuration.
	 * @param {string} config.cookie.accessTokenName Name of cookie
	 * with access token.
	 * @param {string?} config.cookie.path Path attribute for cookie
	 * ('/' by default).
	 * @param {string?} config.cookie.domain Domain attribute for cookie.
	 * @returns {Function} Middleware function.
	 */
	createInvalidationFlow(config) {
		const middleware = new InvalidationEndpoint(this._locator, this._config, config);
		return middleware.handler.bind(middleware);
	}

	/**
	 * Adds all requires endpoints and middlewares of current configuration.
	 * @param {Object} app Connect/Express application object.
	 */
	addEndpoints(app) {
		const endpoints = this._config.endpoints;

		if (!endpoints || typeof (endpoints) !== 'object' || Object.keys(endpoints).length === 0) {
			throw new Error('Authorization endpoints not found');
		}

		Object.keys(endpoints)
			.forEach(name => {
				const grantType = endpoints[name].grantType;
				const endpointConfig = Object.create(endpoints[name]);

				endpointConfig.name = name;

				app.use(uriHelper.getRefreshPath(name), this.createRefreshTokenFlow(endpointConfig));
				app.use(uriHelper.getRemovePath(name), this.createInvalidationFlow(endpointConfig));

				switch (endpoints[name].grantType) {
				case 'client_credentials':
					app.use(uriHelper.getPath(name), this.createClientCredentialsFlow(endpointConfig));
					app.use(this.createClientCredentialsMiddleware(endpointConfig));
					break;
				case 'password':
					app.use(uriHelper.getPath(name), this.createPasswordCredentialsFlow(endpointConfig));
					break;
				case 'authorization_code':
					app.use(uriHelper.getPath(name), this.createAuthorizationCodeFlow(endpointConfig));
					break;
				default:
					throw new Error(`Wrong grant type "${grantType}"`);
				}
			});
	}
}

module.exports = OAuth2FlowFactory;
