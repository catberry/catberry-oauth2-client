'use strict';

const UHRMock = require('../mocks/UHRMock');
const express = require('express');
const events = require('events');
const OAuth2FlowFactory = require('../../lib/OAuth2FlowFactory');
const OAuth2Utils = require('../../lib/OAuth2Utils');
const ServiceLocator = require('catberry-locator');

module.exports = {
	createLocator(config) {
		const locator = new ServiceLocator();

		locator.registerInstance('serviceLocator', locator);
		locator.registerInstance('config', config);
		const eventBus = new events.EventEmitter();
		eventBus.on('error', () => {});
		locator.registerInstance('eventBus', eventBus);
		locator.register('oauth2FlowFactory', OAuth2FlowFactory, true);
		locator.register('oauth2Utils', OAuth2Utils, true);
		locator.register('uhr', UHRMock, true);

		return locator;
	},

	createFactory(config) {
		const locator = module.exports.createLocator(config);
		return locator.resolve('oauth2FlowFactory');
	},

	createApp(config) {
		const factory = module.exports.createFactory(config);
		const app = express();

		factory.addEndpoints(app);
		app.use((request, response) => {
			response.writeHead(200);
			response.end();
		});
		return app;
	}
};
