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

module.exports = PasswordCredentialsSender;

var util = require('util'),
	GrantSenderBase = require('./GrantSenderBase');

var FIELD_GRANT_TYPE = 'grant_type',
	FIELD_SCOPE = 'scope',
	FIELD_USERNAME = 'username',
	FIELD_PASSWORD = 'password';

util.inherits(PasswordCredentialsSender, GrantSenderBase);

/**
 * Creates new instance of resource owner password credentials grant sender.
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
 * @extends GrantSenderBase
 */
function PasswordCredentialsSender($serviceLocator, config) {
	GrantSenderBase.call(this, $serviceLocator, config);
}

/**
 * Sends resource owner password credentials grant to authorization server.
 * @param {string} username Username of resource owner.
 * @param {string} password Password of resource owner.
 * @param {string?} scope Required scope string.
 * @returns {Promise.<Object>} Promise for response content.
 */
PasswordCredentialsSender.prototype.send =
	function (username, password, scope) {
		// http://tools.ietf.org/html/rfc6749#section-4.3.2
		var data = {};
		data[FIELD_GRANT_TYPE] = 'password';
		data[FIELD_USERNAME] = username;
		data[FIELD_PASSWORD] = password;

		if (typeof (scope) === 'string' && scope.length > 0) {
			data[FIELD_SCOPE] = scope;
		}
		return GrantSenderBase.prototype.send.call(this, data);
	};