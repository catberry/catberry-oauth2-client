'use strict';

const httpHelper = require('../helpers/httpHelper');
const ClientCredentialsFlowMiddleware = require('../middlewares/ClientCredentialsFlowMiddleware');

/**
 * Creates new instance of client credentials flow endpoint.
 * @param {ServiceLocator} locator Service locator to resolve
 * dependencies.
 *
 * @param {Object} authConfig Authorization configuration.
 * @param {string} authConfig.clientId Id of OAuth 2.0 client.
 * @param {string} authConfig.clientSecret Secret of OAuth 2.0 client.
 * @param {string} authConfig.authServerUrl URL to OAuth 2.0
 * authentication server.
 * @param {number?} authConfig.timeout Grant send timeout (30000 ms by default).
 * @param {boolean?} authConfig.unsafeHTTPS Determines if sender will send grant
 * via unsafe HTTPS connection with invalid certificate (false by default).
 * @param {string?} authConfig.tokenEndpointPath URL path to
 * OAuth 2.0 token endpoint (/token by default).
 *
 * @param {Object} endpointConfig Endpoint configuration.
 * @param {string?} endpointConfig.scope Access scope for endpoint.
 * @param {Object} endpointConfig.cookie Token cookie configuration.
 * @param {string} endpointConfig.cookie.accessTokenName Name of cookie
 * with access token.
 * @param {string?} endpointConfig.cookie.accessTokenExpiresIn Expiration time
 * in seconds for access token cookie if it is not specified by authorization
 * server (3 600 secs by default, 1 hour).
 * @param {string} endpointConfig.cookie.refreshTokenName Name of cookie
 * with refresh token.
 * @param {string?} endpointConfig.cookie.refreshTokenExpiresIn Expiration time
 * in seconds for refresh token cookie
 * (3 110 400 000 secs by default, 100 years).
 * @param {string?} endpointConfig.cookie.path Path attribute for cookie
 * ('/' by default).
 * @param {string?} endpointConfig.cookie.domain Domain attribute for cookie.
 * @extends GrantFlowMiddlewareBase
 */
class ClientCredentialsFlowEndpoint extends ClientCredentialsFlowMiddleware {

	/**
	 * Handles endpoint invocation.
	 * @param {http.IncomingMessage} request HTTP request.
	 * @param {http.ServerResponse} response HTTP response.
	 */
	handler(request, response) {
		const methodError = httpHelper.checkMethod(request, 'get');
		if (methodError) {
			this._logger.error(methodError);
			httpHelper.writeError(methodError, response);
			return;
		}

		this._logger.trace('Obtaining access token for client credentials...');
		this._obtainAuthorization()
			.then(issuedAuth => this._handleIssuedAuthorization(request, response, issuedAuth))
			.then(responseObject => httpHelper.writeToResponse(200, responseObject, response))
			.catch(reason => {
				this._logger.error(reason);
				httpHelper.writeError(reason, response);
			});
	}
}

module.exports = ClientCredentialsFlowEndpoint;
