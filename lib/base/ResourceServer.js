'use strict';

const uriHelper = require('../helpers/uriHelper');
const catberryURI = require('catberry-uri');
const URI = catberryURI.URI;
const Query = catberryURI.Query;

const FIELD_RETURN_URI = 'return_uri';

class ResourceServer {

	/**
	 * Creates instance of OAuth 2.0 resource server role.
	 * @param {ServiceLocator} locator Service locator to resolve
	 * dependencies.
	 * @param {Object} config Configuration object.
	 * @param {string} config.host Resource server host.
	 * @param {boolean?} config.unsafeHTTPS Determines if sender will send grant
	 * via unsafe HTTPS connection with invalid certificate (false by default).
	 * @param {Object} config.endpoint Configuration of endpoint used
	 * for authorization.
	 * @param {string} config.endpoint.name Name of endpoint.
	 * @param {string} config.endpoint.accessTokenName Name of access token cookie.
	 */
	constructor(locator, config) {
		this.validateConfig(config);

		/**
		 * Current configuration.
		 * @type {Object}
		 * @protected
		 */
		this._config = Object.create(config);

		/**
		 * Current logger.
		 * @type {Logger}
		 * @private
		 */
		this._logger = locator.resolve('logger');

		/**
		 * Current UHR to do request.
		 * @type {UHR}
		 * @protected
		 */
		this._uhr = locator.resolve('uhr');

		this._config.unsafeHTTPS = typeof (this._config.unsafeHTTPS) === 'boolean' ? this._config.unsafeHTTPS : false;
	}

	/**
	 * Does request to the resource server.
	 * @param {Object} context Current module context.
	 * @param {Object} options Request options.
	 * @param {string} options.path Server URL path.
	 * @param {Object} options.headers Object with HTTP headers.
	 * @param {string?} options.method HTTP method (GET by default).
	 * @param {Object?} options.data Data to send to server.
	 * @returns {Promise<Object>} Promise for response content.
	 */
	request(context, options) {
		options.method = typeof (options.method) === 'string' ? options.method.toLowerCase() : 'get';
		options.path = typeof (options.path) === 'string' ? options.path : '';

		const token = this.getToken(context);
		const headers = {};
		const upperMethod = options.method.toUpperCase();

		let requestUri = new URI(this._config.host);

		if (!token) {
			return this._redirectToRefreshEndpoint(context);
		}

		requestUri.path += options.path;
		requestUri = requestUri.toString();

		if (options.headers && typeof (options.headers) === 'object') {
			Object.keys(options.headers)
				.forEach(headerName => {
					headers[headerName] = options.headers[headerName];
				});
		}

		headers.Authorization = `Bearer ${token}`;

		const now = new Date();

		this._logger.trace(`Request to resource ${upperMethod} "${requestUri}"`);

		return this._uhr[options.method](requestUri, {
			data: options.data || {},
			headers,
			unsafeHTTPS: this._config.unsafeHTTPS
		})
			.then(result => {
				this._logger.trace(`Response from resource ${upperMethod} "${requestUri}" (${new Date() - now}ms)`);

				result.content = typeof (result.content) === 'object' ? result.content : {};

				return this._responseHandler(context, result);
			});
	}

	/**
	 * Gets current access token;
	 * @param {Object} context Module context.
	 * @returns {string} Access token.
	 */
	getToken(context) {
		return context.cookie.get(this._config.endpoint.accessTokenName);
	}

	/**
	 * Determines if context is now authorized to do requests.
	 * @param {Object} context Module context.
	 * @returns {boolean} true if access to resource server is authorized.
	 */
	isAuthorized(context) {
		const token = this.getToken(context);
		return (typeof (token) === 'string' && token.length > 0);
	}

	/**
	 * Refreshes authorization or remove access and refresh tokens if failed.
	 * @param {Object} context Module context.
	 * @returns {Promise} Promise for nothing.
	 */
	refreshAuthorization(context) {
		return this._redirectToRefreshEndpoint(context);
	}

	/**
	 * Redirects to token remove endpoint.
	 * @param {Object} context Module context.
	 * @protected
	 */
	_redirectToRefreshEndpoint(context) {
		const redirectUri = context.location.clone();
		const returnUri = context.location.clone();

		returnUri.scheme = null;
		returnUri.authority = null;

		redirectUri.path = uriHelper.getRefreshPath(this._config.endpoint.name);
		redirectUri.scheme = null;
		redirectUri.authority = null;
		redirectUri.fragment = null;
		redirectUri.query = new Query();
		redirectUri.query.values = {};
		redirectUri.query.values[FIELD_RETURN_URI] = returnUri.toString();

		return context.redirect(redirectUri.toString());
	}

	/**
	 * Determines is status code is error.
	 * @param {number} statusCode HTTP status code.
	 * @returns {boolean} true if code means error.
	 * @protected
	 */
	_isStatusCodeBad(statusCode) {
		return statusCode < 200 || statusCode >= 400;
	}

	/**
	 * Handles response from resource server.
	 * @param {Object} context Module context.
	 * @param {Object} result Response result.
	 * @protected
	 * @abstract
	 */
	_responseHandler(context, result) {
		if (this._isStatusCodeBad(result.status.code)) {
			if (result.status.code === 401) {
				return this._redirectToRefreshEndpoint(context);
			}
			const reason = new Error(result.status.text);
			reason.code = result.status.code;
			reason.details = result.content;
			throw reason;
		}
		return result.content;
	}

	/**
	 * Validates resource server configuration.
	 * @param {Object} config Config object.
	 */
	/* eslint complexity: 0 */
	validateConfig(config) {
		if (!config || typeof (config) !== 'object') {
			throw new Error('Config must be an object');
		}
		if (typeof (config.host) !== 'string' || config.host.length === 0) {
			throw new Error('"host" parameter not defined');
		}
		if (!config.endpoint || typeof (config.endpoint) !== 'object') {
			throw new Error('"endpoint" parameters must be an object');
		}
		if (typeof (config.endpoint.name) !== 'string' || config.endpoint.name.length === 0) {
			throw new Error('"endpoint.name" parameter not defined');
		}
		if (typeof (config.endpoint.accessTokenName) !== 'string' || config.endpoint.accessTokenName.length === 0) {
			throw new Error('"endpoint.accessTokenName" parameter not defined');
		}
	}
}

module.exports = ResourceServer;
