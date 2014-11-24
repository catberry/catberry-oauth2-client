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

var UHRMock = require('../mocks/UHRMock'),
	LoggerMock = require('../mocks/LoggerMock'),
	express = require('express'),
	OAuth2FlowFactory = require('../../lib/OAuth2FlowFactory'),
	ServiceLocator = require('catberry-locator');

module.exports = {
	createLocator: function (config) {
		var locator = new ServiceLocator();
		locator.registerInstance('serviceLocator', locator);
		locator.registerInstance('config', config);
		locator.registerInstance('logger', new LoggerMock());
		locator.register('oauth2FlowFactory', OAuth2FlowFactory, config, true);
		locator.register('uhr', UHRMock, config, true);
		return locator;
	},
	createApp: function (config) {
		var locator = module.exports.createLocator(config);

		var app = express(),
			factory = locator.resolve('oauth2FlowFactory');

		factory.addEndpoints(app);
		app.use(function (request, response) {
			response.writeHead(200);
			response.end();
		});
		return app;
	}
};