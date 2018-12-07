'use strict';

const GrantSenderBase = require('./GrantSenderBase');

const FIELD_GRANT_TYPE = 'grant_type';
const FIELD_CODE = 'code';
const FIELD_REDIRECT_URI = 'redirect_uri';

/**
 * Creates new instance of authorization code sender.
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
class AuthorizationCodeSender extends GrantSenderBase {

	/**
	 * Sends authorization code grant to authorization server.
	 * @param {IncomingMessage} request Incoming HTTP request.
	 * @param {string} code Authorization code.
	 * @param {string} redirectUri Redirect URI used for code receiving.
	 * @returns {Promise.<Object>} Promise for response content.
	 */
	send(request, code, redirectUri) {
		// http://tools.ietf.org/html/rfc6749#section-4.1.3
		const data = {};
		data[FIELD_GRANT_TYPE] = 'authorization_code';
		data[FIELD_CODE] = code;
		data[FIELD_REDIRECT_URI] = redirectUri;

		return super.send(request, data);
	}
}

module.exports = AuthorizationCodeSender;
