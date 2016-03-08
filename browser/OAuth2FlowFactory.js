'use strict';

const ResourceServer = require('../lib/ResourceServer');

class OAuth2FlowFactory {

	/**
	 * Creates new instance of OAuth 2.0 flow factory.
	 * @param {ServiceLocator} locator Service locator to resolve dependencies.
	 * @param {Object} authorization Authorization section of config.
	 * @param {Object} authorization.resourceServers Set of resource server configs.
	 */
	constructor(locator) {
		const config = locator.resolve('config') || {};

		/**
		 * Current service locator.
		 * @type {ServiceLocator}
		 * @protected
		 */
		this._locator = locator;

		/**
		 * Current configuration.
		 * @type {Object}
		 * @protected
		 */
		this._config = config.authorization || {};
	}

	/**
	 * Creates resource server with specified configuration name.
	 * @param {string} name Configuration name.
	 * @returns {ResourceServer} Resource server instance.
	 */
	createResourceServer(name) {
		const resourceServers = this._config.resourceServers || {};
		if (!(name in resourceServers)) {
			throw new Error(`Configuration for resource server "${name}" not found`);
		}

		return new ResourceServer(this._locator, resourceServers[name]);
	}
}

module.exports = OAuth2FlowFactory;
