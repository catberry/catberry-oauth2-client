'use strict';

const Query = require('catberry-uri').Query;
const ResourceServerBase = require('./base/ResourceServer');
const uriHelper = require('./helpers/uriHelper');
const FIELD_RETURN_URI = 'return_uri';

/**
 * Creates instance of OAuth 2.0 resource server role.
 * @param {ServiceLocator} locator Service locator to resolve
 * dependencies.
 *
 * @param {Object} config Configuration object.
 * @param {string} config.host Resource server host.
 * @param {boolean?} config.unsafeHTTPS Determines if sender will send grant
 * via unsafe HTTPS connection with invalid certificate (false by default).
 *
 * @param {Object} config.endpoint Configuration of endpoint used
 * for authorization.
 * @param {string} config.endpoint.name Name of endpoint.
 * @param {string} config.endpoint.accessTokenName Name of access token cookie.
 * @extends base/ResourceServer
 */
class ResourceServer extends ResourceServerBase {

	/**
	 * Removes access and refresh tokens.
	 * @param {Object} context Module context.
	 * @returns {Promise} Promise for nothing.
	 */
	removeAuthorization(context) {
		const token = this.getToken(context);
		const redirectUri = context.location.clone();
		const returnUri = context.location.clone();

		returnUri.scheme = null;
		returnUri.authority = null;

		redirectUri.path = uriHelper.getRemovePath(this._config.endpoint.name);
		redirectUri.scheme = null;
		redirectUri.authority = null;
		redirectUri.fragment = null;
		redirectUri.query = new Query();
		redirectUri.query.values = {};
		redirectUri.query.values.token = token;
		redirectUri.query.values[FIELD_RETURN_URI] = returnUri.toString();

		return context.redirect(redirectUri.toString());
	}
}

module.exports = ResourceServer;
