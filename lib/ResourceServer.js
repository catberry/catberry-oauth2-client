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
	Query = require('catberry-uri').Query,
	ResourceServerBase = require('./base/ResourceServer'),
	uriHelper = require('./helpers/uriHelper');

var FIELD_RETURN_URI = 'return_uri';

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
	var redirectUri = context.location.clone(),
		returnUri = context.location.clone();

	returnUri.scheme = null;
	returnUri.authority = null;

	redirectUri.path = uriHelper.getRefreshPath(this._config.endpoint.name);
	redirectUri.fragment = null;
	redirectUri.query = new Query();
	redirectUri.query.values = {};
	redirectUri.query.values[FIELD_RETURN_URI] = returnUri.toString();
	return context.redirect(redirectUri.toString());
};

/**
 * Removes access and refresh tokens.
 * @param {Object} context Module context.
 * @returns {Promise} Promise for nothing.
 */
ResourceServer.prototype.removeAuthorization = function (context) {
	var token = this.getToken(context),
		redirectUri = context.location.clone(),
		returnUri = context.location.clone();

	returnUri.scheme = null;
	returnUri.authority = null;

	redirectUri.path = uriHelper.getRemovePath(this._config.endpoint.name);
	redirectUri.fragment = null;
	redirectUri.query = new Query();
	redirectUri.query.values = {};
	redirectUri.query.values.token = token;
	redirectUri.query.values[FIELD_RETURN_URI] = returnUri.toString();
	return context.redirect(redirectUri.toString());
};

/**
 * Handles response from resource server.
 * @param {Object} context Module context.
 * @param {Object} result Response result.
 * @protected
 */
ResourceServer.prototype._responseHandler = function (context, result) {
	if (this._isStatusCodeBad(result.status.code)) {
		if (result.status.code === 401) {
			this.refreshAuthorization(context);
		}
		var reason = new Error(result.status.text);
		reason.code = result.status.code;
		reason.details = result.content;
		throw reason;
	}
	return result.content;
};