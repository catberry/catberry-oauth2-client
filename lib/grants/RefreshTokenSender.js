'use strict';

const GrantSenderBase = require('./GrantSenderBase');
const FIELD_GRANT_TYPE = 'grant_type';
const	FIELD_REFRESH_TOKEN = 'refresh_token';
const	FIELD_SCOPE = 'scope';

/**
 * Creates new instance of refresh token sender.
 * @param {ServiceLocator} locator Service locator to resolve
 * dependencies.
 * @param {Object} config Configuration object.
 * @param {string} config.clientId Id of OAuth 2.0 client.
 * @param {string} config.clientSecret Secret of OAuth 2.0 client.
 * @param {string} config.authServerUrl URL to OAuth 2.0 authentication server.
 * @param {number?} config.timeout Grant send timeout (30000 ms by default).
 * @param {boolean?} config.unsafeHTTPS Determines if sender will send grant
 * via unsafe HTTPS connection with invalid certificate (false by default).
 * @param {string?} config.tokenEndpointPath URL path to
 * OAuth 2.0 token endpoint (/token by default).
 */
class RefreshTokenSender extends GrantSenderBase {

	/**
	 * Sends refresh token to authorization server.
	 * @param {string} refreshToken Refresh token to obtain new access token.
	 * @param {string?} scope Required scope string.
	 * @returns {Promise.<Object>} Promise for response content.
	 */
	send(refreshToken, scope) {
		// http://tools.ietf.org/html/rfc6749#section-6
		const data = {};
		data[FIELD_GRANT_TYPE] = 'refresh_token';
		data[FIELD_REFRESH_TOKEN] = refreshToken;
		if (typeof (scope) === 'string' && scope.length > 0) {
			data[FIELD_SCOPE] = scope;
		}
		return super.send(data);
	}
}

module.exports = RefreshTokenSender;
