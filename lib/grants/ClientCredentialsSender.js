'use strict';

const GrantSenderBase = require('./GrantSenderBase');
const FIELD_GRANT_TYPE = 'grant_type';
const FIELD_SCOPE = 'scope';

/**
 * Creates new instance of client credentials sender.
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
class ClientCredentialsSender extends GrantSenderBase {

	/**
	 * Sends client credentials grant to authorization server.
	 * @param {IncomingMessage} request Incoming HTTP request.
	 * @param {string?} scope Required scope string.
	 * @returns {Promise.<Object>} Promise for response content.
	 */
	send(request, scope) {
		// http://tools.ietf.org/html/rfc6749#section-4.4.2
		const data = {};
		data[FIELD_GRANT_TYPE] = 'client_credentials';
		if (typeof (scope) === 'string' && scope.length > 0) {
			data[FIELD_SCOPE] = scope;
		}
		return super.send(request, data);
	}
}

module.exports = ClientCredentialsSender;
