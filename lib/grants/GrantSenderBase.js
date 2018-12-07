'use strict';

class GrantSenderBase {

	/**
	 * Creates basic grant sender implementation.
	 * @param {ServiceLocator} locator Service locator to resolve
	 * dependencies.
	 * @param {Object} config Configuration object.
	 * @param {string} config.clientId Id of OAuth 2.0 client.
	 * @param {string} config.clientSecret Secret of OAuth 2.0 client.
	 * @param {string} config.authServerUrl URL to OAuth 2.0 authentication server.
	 * @param {number?} config.timeout Grant send timeout (30000 ms by default).
	 * @param {boolean?} config.unsafeHTTPS Determines if sender will send grant via unsafe HTTPS connection with
	 * invalid certificate (false by default).
	 * @param {string?} config.tokenEndpointPath URL path to OAuth 2.0 token endpoint (/token by default).
	 */
	constructor(locator, config) {
		validateConfig(config);

		/**
		 * Current UHR.
		 * @type {UHR}
		 * @private
		 */
		this._uhr = locator.resolve('uhr');

		/**
		 * Utils for building app specific oauth request.
		 * @type {function}
		 * @private
		 */
		this._oauth2Utils = locator.resolve('oauth2Utils');

		if (config.clientId.indexOf(':') !== -1 || config.clientSecret.indexOf(':') !== -1) {
			throw new Error('Client ID or client secret must not contain colon (\':\') character');
		}

		/**
		 * Current path to token endpoint on authorization server.
		 * @type {string}
		 * @private
		 */
		this._tokenEndpointPath = config.tokenEndpointPath ||	'/token';

		/**
		 * Determines ability to use HTTPS protocol with bad certificate.
		 * @type {boolean}
		 * @private
		 */
		this._unsafeHTTPS = typeof (config.unsafeHTTPS) === 'boolean' ? config.unsafeHTTPS : false;

		/**
		 * Timeout for grant sending.
		 * @type {number}
		 * @private
		 */
		this._timeout = isNaN(config.timeout) ? 30000 : config.timeout;

		/**
		 * Current URL to OAuth 2.0 authentication server.
		 * @type {string}
		 * @private
		 */
		this._authServerUrl = config.authServerUrl;

		/**
		 * Current encoded credentials.
		 * @type {string}
		 * @private
		 */
		this._credentials = getBase64(config.clientId, config.clientSecret);
	}

	/**
	 * Prepares HTTP headers for grant sending.
	 * @param {IncomingMessage} request Incoming HTTP request.
	 * @returns {Object} Prepared headers.
	 * @protected
	 */
	_prepareHeaders(request) {
		return Object.assign(
			{
				// http://tools.ietf.org/html/rfc6749#section-2.3.1
				Authorization: `Basic ${this._credentials}`,
				'Content-type': 'application/x-www-form-urlencoded'
			},
			this._oauth2Utils.getSpecificHeaders(request)
		);
	}

	/**
	 * Sends grant to authorization server.
	 * @param {IncomingMessage} request Incoming HTTP request.
	 * @param {Object} data Additional data to send.
	 * @returns {Promise<Object>} Promise for response body.
	 */
	send(request, data) {
		if (!data || typeof (data) !== 'object' || !('grant_type' in data)) {
			return Promise.reject(new Error('Grant data must be specified'));
		}

		return this._uhr.post(this._authServerUrl + this._tokenEndpointPath, {
			headers: this._prepareHeaders(request),
			data,
			timeout: this._timeout,
			unsafeHTTPS: this._unsafeHTTPS
		})
			.then(result => {
				// http://tools.ietf.org/html/rfc6749#section-5.1
				if (result.status.code === 200) {
					return result.content;
				}
				// http://tools.ietf.org/html/rfc6749#section-5.2
				const error = new Error(result.content.error || result.status.text);
				error.code = result.status.code;
				error.details = result.content;
				throw error;
			});
	}
}

/**
 * Validates grant sender configuration
 * @param {Object} config Configuration object.
 */
function validateConfig(config) {
	if (!config || typeof (config) !== 'object') {
		throw new Error('Config object must be specified');
	}

	if (typeof (config.authServerUrl) !== 'string' ||
		config.authServerUrl.length === 0) {
		throw new Error('Config parameter "authServerUrl" must be specified');
	}

	if (typeof (config.clientId) !== 'string' || config.clientId.length === 0) {
		throw new Error('Config parameter "clientId" must be specified');
	}

	if (typeof (config.clientSecret) !== 'string' ||
		config.clientSecret.length === 0) {
		throw new Error('Config parameter "clientSecret" must be specified');
	}
}

/**
 * Gets Base64 encoding for client ID and client secret.
 * @param {string} clientId Client ID.
 * @param {string} clientSecret Client secret.
 * @returns {string} Base64-encoded credentials.
 */
function getBase64(clientId, clientSecret) {
	const buffer = new Buffer(`${clientId}:${clientSecret}`);
	return buffer.toString('base64');
}

module.exports = GrantSenderBase;
