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

module.exports = ResourceServer;

var util = require('util'),
	ResourceServerBase = require('../lib/base/ResourceServer'),
	uriHelper = require('../lib/helpers/uriHelper');

var ERROR_REFRESHING = 'Can not refresh this access token',
	ERROR_REMOVE = 'Can not invalidate current access token';

util.inherits(ResourceServer, ResourceServerBase);

/**
 * Creates instance of OAuth 2.0 resource server role.
 * @param {ServiceLocator} $serviceLocator Service locator to resolve
 * dependencies.
 *
 * @param {Object} config Configuration object.
 * @param {String} config.host Resource server host.
 * @param {Boolean?} config.unsafeHTTPS Determines if sender will send grant
 * via unsafe HTTPS connection with invalid certificate (false by default).
 *
 * @param {Object} config.endpoint Configuration of endpoint used
 * for authorization.
 * @param {String} config.endpoint.name Name of endpoint.
 * @param {String} config.endpoint.accessTokenName Name of access token cookie.
 * @extends base/ResourceServer
 * @constructor
 */
function ResourceServer($serviceLocator, config) {
	ResourceServerBase.call(this, $serviceLocator, config);
}

/**
 * Refreshes authorization or remove access and refresh tokens if failed.
 * @param {Object} context Module context.
 * @returns {Promise} Promise for nothing.
 */
ResourceServer.prototype.refreshAuthorization = function (context) {
	var refreshUri = context.location.clone();
	refreshUri.path = uriHelper.getRefreshPath(this._config.endpoint.name);
	refreshUri.query = null;
	refreshUri.fragment = null;

	return this._uhr.get(refreshUri.toString(), {
		unsafeHTTPS: this._config.unsafeHTTPS
	})
		.then(function (result) {
			if (result.status.code !== 200) {
				throw new Error(ERROR_REFRESHING);
			}
		});
};

/**
 * Removes access and refresh tokens.
 * @param {Object} context Module context.
 * @returns {Promise} Promise for nothing.
 */
ResourceServer.prototype.removeAuthorization = function (context) {
	var token = this.getToken(context),
		removeUri = context.location.clone();
	removeUri.path = uriHelper.getRemovePath(this._config.endpoint.name);
	removeUri.query = null;
	removeUri.fragment = null;

	return this._uhr.get(removeUri.toString(), {
		unsafeHTTPS: this._config.unsafeHTTPS,
		data: {
			token: token
		}
	})
		.then(function (result) {
			if (result.status.code !== 200) {
				throw new Error(ERROR_REMOVE);
			}
		});
};