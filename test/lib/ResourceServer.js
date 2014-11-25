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

var environmentHelper = require('../helpers/environmentHelper'),
	URI = require('catberry-uri').URI,
	testHelper = require('../helpers/testHelper'),
	configCases = require('../cases/configs/ResourceServer.json'),
	requestCases = require('../cases/ResourceServer/request.json'),
	assert = require('assert');

describe('ResourceServer', function () {
	describe('#constructor', function () {
		configCases.cases.forEach(function (testCase) {
			testHelper.generateResourceServerConfigTest(testCase);
		});
	});
	describe('#request', function () {
		requestCases.cases.forEach(function (testCase) {
			testHelper.generateResourceServerRequestTest(testCase);
		});
	});
	describe('#getToken', function () {
		it('should return valid token from context', function () {
			var config = {
				authorization: {
					resourceServers: {
						server: {
							host: 'http://some.org',
							endpoint: {
								name: 'some',
								accessTokenName: 'token'
							}
						}
					}
				}
			};

			var factory = environmentHelper.createFactory(config),
				server = factory.createResourceServer('server');

			var token = server.getToken({
				cookies: {
					get: function (name) {
						assert.strictEqual(
							name,
							config.authorization.resourceServers
								.server.endpoint.accessTokenName
						);
						return 'someaccesstoken';
					}
				}
			});

			assert.strictEqual(token, 'someaccesstoken');
		});
		it('should return null if token not found in context', function () {
			var config = {
				authorization: {
					resourceServers: {
						server: {
							host: 'http://some.org',
							endpoint: {
								name: 'some',
								accessTokenName: 'token'
							}
						}
					}
				}
			};

			var factory = environmentHelper.createFactory(config),
				server = factory.createResourceServer('server');

			var token = server.getToken({
				cookies: {
					get: function (name) {
						assert.strictEqual(
							name,
							config.authorization.resourceServers
								.server.endpoint.accessTokenName
						);
						return null;
					}
				}
			});

			assert.strictEqual(token, null);
		});
	});
	describe('#isAuthorized', function () {
		it('should return true if token exists', function () {
			var config = {
				authorization: {
					resourceServers: {
						server: {
							host: 'http://some.org',
							endpoint: {
								name: 'some',
								accessTokenName: 'token'
							}
						}
					}
				}
			};

			var factory = environmentHelper.createFactory(config),
				server = factory.createResourceServer('server');

			var isAuthorized = server.isAuthorized({
				cookies: {
					get: function () {
						return 'someaccesstoken';
					}
				}
			});

			assert.strictEqual(isAuthorized, true);
		});
		it('should return false if token does not exists', function () {
			var config = {
				authorization: {
					resourceServers: {
						server: {
							host: 'http://some.org',
							endpoint: {
								name: 'some',
								accessTokenName: 'token'
							}
						}
					}
				}
			};

			var factory = environmentHelper.createFactory(config),
				server = factory.createResourceServer('server');

			var isAuthorized = server.isAuthorized({
				cookies: {
					get: function () {
						return null;
					}
				}
			});

			assert.strictEqual(isAuthorized, false);
		});
	});

	describe('#removeAuthorization', function () {
		it('should redirect to remove endpoint', function () {
			var config = {
				authorization: {
					resourceServers: {
						server: {
							host: 'http://some.org',
							endpoint: {
								name: 'some',
								accessTokenName: 'token'
							}
						}
					}
				}
			};

			var factory = environmentHelper.createFactory(config),
				server = factory.createResourceServer('server');

			var isRedirected = false;
			server.removeAuthorization({
				location: new URI('http://some-server.org:9090/home'),
				cookies: {
					get: function () {
						return 'someaccesstoken';
					}
				},
				redirect: function (where) {
					assert.strictEqual(
						where,
						'/some/remove?token=someaccesstoken&return_uri=/home'
					);
					isRedirected = true;
				}
			});

			assert.strictEqual(isRedirected, true);
		});
	});
});