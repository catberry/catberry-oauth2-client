'use strict';

const ResourceServerBase = require('../lib/base/ResourceServer');
const uriHelper = require('../lib/helpers/uriHelper');

/**
 * Creates instance of OAuth 2.0 resource server role.
 * @param {ServiceLocator} locator Service locator to resolve dependencies.
 * @param {Object} config Configuration object.
 * @param {string} config.host Resource server host.
 * @param {boolean?} config.unsafeHTTPS Determines if sender will send grant
 * via unsafe HTTPS connection with invalid certificate (false by default).
 * @param {Object} config.endpoint Configuration of endpoint used for authorization.
 * @param {string} config.endpoint.name Name of endpoint.
 * @param {string} config.endpoint.accessTokenName Name of access token cookie.
 */
class ResourceServer extends ResourceServerBase {

	/**
	 * Refreshes authorization or remove access and refresh tokens if failed.
	 * @param {Object} context Module context.
	 * @returns {Promise} Promise for nothing.
	 */
	refreshAuthorization(context) {
		const refreshUri = context.location.clone();

		refreshUri.path = uriHelper.getRefreshPath(this._config.endpoint.name);
		refreshUri.query = null;
		refreshUri.fragment = null;

		return this._uhr.get(refreshUri.toString(), {
			unsafeHTTPS: this._config.unsafeHTTPS
		})
			.then(result => {
				if (result.status.code !== 200) {
					throw new Error('Can not refresh this access token');
				}
			});
	}

	/**
	 * Removes access and refresh tokens.
	 * @param {Object} context Module context.
	 * @returns {Promise} Promise for nothing.
	 */
	removeAuthorization(context) {
		const token = this.getToken(context);
		const removeUri = context.location.clone();

		removeUri.path = uriHelper.getRemovePath(this._config.endpoint.name);
		removeUri.query = null;
		removeUri.fragment = null;

		return this._uhr.get(removeUri.toString(), {
			unsafeHTTPS: this._config.unsafeHTTPS,
			data: {
				token
			}
		})
			.then(result => {
				if (result.status.code !== 200) {
					throw new Error('Can not invalidate current access token');
				}
			});
	}
}

module.exports = ResourceServer;
