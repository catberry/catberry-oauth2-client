'use strict';

const GrantSenderBase = require('./GrantSenderBase');

const FIELD_GRANT_TYPE = 'grant_type';
const FIELD_SCOPE = 'scope';
const FIELD_USERNAME = 'username';
const FIELD_PASSWORD = 'password';

/**
 * Creates new instance of resource owner password credentials grant sender.
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
class PasswordCredentialsSender extends GrantSenderBase {

	/**
	 * Sends resource owner password credentials grant to authorization server.
	 * @param {IncomingMessage} request Incoming HTTP request.
	 * @param {string} username Username of resource owner.
	 * @param {string} password Password of resource owner.
	 * @param {string?} scope Required scope string.
	 * @returns {Promise.<Object>} Promise for response content.
	 */
	send(request, username, password, scope) {
		// http://tools.ietf.org/html/rfc6749#section-4.3.2
		const data = {};
		data[FIELD_GRANT_TYPE] = 'password';
		data[FIELD_USERNAME] = username;
		data[FIELD_PASSWORD] = password;

		if (typeof (scope) === 'string' && scope.length > 0) {
			data[FIELD_SCOPE] = scope;
		}

		return super.send(request, data);
	}
}

module.exports = PasswordCredentialsSender;
