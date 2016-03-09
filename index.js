'use strict';

const OAuth2FlowFactory = require('./lib/OAuth2FlowFactory');
const ResourceServer = require('./lib/ResourceServer');

module.exports = {

	/**
	 * Registers all OAuth components in service locator.
	 * @param {ServiceLocator} locator Catberry's service locator.
	 */
	register(locator) {
		locator.register('oauth2FlowFactory', OAuth2FlowFactory, true);
		locator.register('resourceServer', ResourceServer);
	},
	OAuth2FlowFactory,
	ResourceServer
};
