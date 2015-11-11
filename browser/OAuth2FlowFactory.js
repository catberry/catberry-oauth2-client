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

module.exports = OAuth2FlowFactory;

var util = require('util'),
	ResourceServer = require('../lib/ResourceServer');

var ERROR_NO_SUCH_RESOURCE_SERVER = 'Configuration for resource server ' +
	'"%s" not found';

/**
 * Creates new instance of OAuth 2.0 flow factory.
 * @param {ServiceLocator} $serviceLocator Service locator to resolve
 * dependencies.
 * @param {Object} authorization Authorization section of config.
 * @param {Object} authorization.resourceServers Set of resource server configs.
 * @constructor
 */
function OAuth2FlowFactory($serviceLocator, authorization) {
	this._locator = $serviceLocator;
	this._config = authorization || {};
}

/**
 * Current service locator.
 * @type {ServiceLocator}
 * @protected
 */
OAuth2FlowFactory.prototype._locator = null;

/**
 * Current configuration.
 * @type {Object}
 * @protected
 */
OAuth2FlowFactory.prototype._config = null;

/**
 * Creates resource server with specified configuration name.
 * @param {string} name Configuration name.
 * @returns {ResourceServer} Resource server instance.
 */
OAuth2FlowFactory.prototype.createResourceServer = function (name) {
	var resourceServers = this._config.resourceServers || {};
	if (!(name in resourceServers)) {
		throw new Error(util.format(ERROR_NO_SUCH_RESOURCE_SERVER, name));
	}

	return new ResourceServer(this._locator, resourceServers[name]);
};