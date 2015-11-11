/*
 * catberry-oauth
 *
 * Copyright (c) 2014 Denis Rechkunov and project contributors.
 *
 * catberry-oauth's license follows:
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge,
 * publish, distribute, sublicense, and/or sell copies of the Software,
 * and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * This license applies to all parts of catberry-oauth that are not externally
 * maintained libraries.
 */

'use strict';

module.exports = GrantSenderBase;

var util = require('util');

var CREDENTIAL_FORMAT = '%s:%s',
	ERROR_GRANT_DATA = 'Grant data must be specified',
	ERROR_CONFIG = 'Config object must be specified',
	ERROR_AUTH_SERVER = 'Config parameter "authServerUrl" must be specified',
	ERROR_CLIENT_ID = 'Config parameter "clientId" must be specified',
	ERROR_CLIENT_SECRET = 'Config parameter "clientSecret" must be specified',
	ERROR_COLON_FOUND = 'Client ID or client secret must not ' +
		'contain colon (\':\') character';

/**
 * Creates basic grant sender implementation.
 * @param {ServiceLocator} $serviceLocator Service locator to resolve
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
 * @constructor
 */
function GrantSenderBase($serviceLocator, config) {
	validateConfig(config);

	this._uhr = $serviceLocator.resolve('uhr');

	if (config.clientId.indexOf(':') !== -1 ||
		config.clientSecret.indexOf(':') !== -1) {
		throw new Error(ERROR_COLON_FOUND);
	}
	this._tokenEndpointPath = config.tokenEndpointPath ||
		this._tokenEndpointPath;
	this._unsafeHTTPS = typeof (config.unsafeHTTPS) === 'boolean' ?
		config.unsafeHTTPS :
		this._unsafeHTTPS;
	this._timeout = isNaN(config.timeout) ? this._timeout : config.timeout;
	this._authServerUrl = config.authServerUrl;
	this._credentials = getBase64(config.clientId, config.clientSecret);
}

/**
 * Current UHR.
 * @type {UHR}
 * @private
 */
GrantSenderBase.prototype._uhr = null;

/**
 * Current URL to OAuth 2.0 authentication server.
 * @type {string}
 * @private
 */
GrantSenderBase.prototype._authServerUrl = '';

/**
 * Current encoded credentials.
 * @type {string}
 * @private
 */
GrantSenderBase.prototype._credentials = '';

/**
 * Timeout for grant sending.
 * @type {number}
 * @private
 */
GrantSenderBase.prototype._timeout = 30000;

/**
 * Determines ability to use HTTPS protocol with bad certificate.
 * @type {boolean}
 * @private
 */
GrantSenderBase.prototype._unsafeHTTPS = false;

/**
 * Current path to token endpoint on authorization server.
 * @type {string}
 * @private
 */
GrantSenderBase.prototype._tokenEndpointPath = '/token';

/**
 * Prepares HTTP headers for grant sending.
 * @returns {Object} Prepared headers.
 * @protected
 */
GrantSenderBase.prototype._prepareHeaders = function () {
	return {
		// http://tools.ietf.org/html/rfc6749#section-2.3.1
		Authorization: 'Basic ' + this._credentials,
		'Content-type': 'application/x-www-form-urlencoded'
	};
};

/**
 * Sends grant to authorization server.
 * @param {Object} data Additional data to send.
 * @returns {Promise<Object>} Promise for response body.
 */
GrantSenderBase.prototype.send = function (data) {
	if (!data || typeof (data) !== 'object' || !('grant_type' in data)) {
		return Promise.reject(new Error(ERROR_GRANT_DATA));
	}

	return this._uhr.post(this._authServerUrl + this._tokenEndpointPath, {
		headers: this._prepareHeaders(),
		data: data,
		timeout: this._timeout,
		unsafeHTTPS: this._unsafeHTTPS
	})
		.then(function (result) {
			// http://tools.ietf.org/html/rfc6749#section-5.1
			if (result.status.code === 200) {
				return result.content;
			}
			// http://tools.ietf.org/html/rfc6749#section-5.2
			var error = new Error(result.content.error || result.status.text);
			error.code = result.status.code;
			error.details = result.content;
			throw error;
		});
};

/**
 * Validates grant sender configuration
 * @param {Object} config Configuration object.
 */
function validateConfig(config) {
	if (!config || typeof (config) !== 'object') {
		throw new Error(ERROR_CONFIG);
	}

	if (typeof (config.authServerUrl) !== 'string' ||
		config.authServerUrl.length === 0) {
		throw new Error(ERROR_AUTH_SERVER);
	}

	if (typeof (config.clientId) !== 'string' || config.clientId.length === 0) {
		throw new Error(ERROR_CLIENT_ID);
	}

	if (typeof (config.clientSecret) !== 'string' ||
		config.clientSecret.length === 0) {
		throw new Error(ERROR_CLIENT_SECRET);
	}
}

/**
 * Gets Base64 encoding for client ID and client secret.
 * @param {string} clientId Client ID.
 * @param {string} clientSecret Client secret.
 * @returns {string} Base64-encoded credentials.
 */
function getBase64(clientId, clientSecret) {
	var credentials = util.format(CREDENTIAL_FORMAT, clientId, clientSecret),
		buffer = new Buffer(credentials);

	return buffer.toString('base64');
}