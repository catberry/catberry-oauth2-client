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
	ResourceServerBrowser = require('../../browser/ResourceServer'),
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
				cookie: {
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
				cookie: {
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
				cookie: {
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
				cookie: {
					get: function () {
						return null;
					}
				}
			});

			assert.strictEqual(isAuthorized, false);
		});
	});
	describe('#refreshAuthorization', function () {
		it('should do UHR to refresh endpoint in browser', function (done) {
			var config = {
				host: 'http://some.org',
				endpoint: {
					name: 'some',
					accessTokenName: 'token'
				}
			};
			config.handler = function (parameters) {
				assert.strictEqual(
					parameters.url,
					'http://some-server.org:9090/some/refresh'
				);
				done();
				return {
					status: {
						code: 200,
						headers: {}
					},
					content: {}
				};
			};

			var locator = environmentHelper.createLocator(config),
				server = new ResourceServerBrowser(locator, config);

			server.refreshAuthorization({
				location: new URI('http://some-server.org:9090/home'),
				cookie: {
					get: function () {
						return 'someaccesstoken';
					}
				}
			})
				.then(null, function (reason) {
					done(reason);
				});
		});
		it('should pass error from when refreshing authorization in browser',
			function (done) {
				var config = {
					host: 'http://some.org',
					endpoint: {
						name: 'some',
						accessTokenName: 'token'
					}
				};
				config.handler = function () {
					throw new Error('some');
				};

				var locator = environmentHelper.createLocator(config),
					server = new ResourceServerBrowser(locator, config);

				server.refreshAuthorization({
					location: new URI('http://some-server.org:9090/home'),
					cookie: {
						get: function () {
							return 'someaccesstoken';
						}
					}
				})
					.then(function () {
						done(new Error('Should be an error'));
					}, function (reason) {
						assert.strictEqual(reason.message, 'some');
						done();
					})
					.then(null, function (reason) {
						done(reason);
					});
			});
		it('should pass error from ' +
			'from authorization server in browser when error code',
			function (done) {
				var config = {
					host: 'http://some.org',
					endpoint: {
						name: 'some',
						accessTokenName: 'token'
					}
				};
				config.handler = function () {
					return {
						status: {
							code: 500,
							headers: {}
						},
						content: {}
					};
				};

				var locator = environmentHelper.createLocator(config),
					server = new ResourceServerBrowser(locator, config);

				server.refreshAuthorization({
					location: new URI('http://some-server.org:9090/home'),
					cookie: {
						get: function () {
							return 'someaccesstoken';
						}
					}
				})
					.then(function () {
						done(new Error('Should be an error'));
					}, function (reason) {
						assert.strictEqual(
							reason.message,
							'Can not refresh this access token'
						);
						done();
					})
					.then(null, function (reason) {
						done(reason);
					});
			});
	});
	describe('#removeAuthorization', function () {
		it('should redirect to remove endpoint', function (done) {
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

			server.removeAuthorization({
				location: new URI('http://some-server.org:9090/home'),
				cookie: {
					get: function () {
						return 'someaccesstoken';
					}
				},
				redirect: function (where) {
					assert.strictEqual(
						where,
						'/some/remove?token=someaccesstoken&return_uri=/home'
					);
					done();
				}
			});
		});
		it('should do UHR to remove endpoint in browser', function (done) {
			var config = {
					host: 'http://some.org',
					endpoint: {
						name: 'some',
						accessTokenName: 'token'
					}
				};
			config.handler = function (parameters) {
				assert.strictEqual(
					parameters.url,
					'http://some-server.org:9090/some/remove'
				);
				done();
				return {
					status: {
						code: 200,
						headers: {}
					},
					content: {}
				};
			};

			var locator = environmentHelper.createLocator(config),
				server = new ResourceServerBrowser(locator, config);

			server.removeAuthorization({
				location: new URI('http://some-server.org:9090/home'),
				cookie: {
					get: function () {
						return 'someaccesstoken';
					}
				}
			})
				.then(null, function (reason) {
					done(reason);
				});
		});
		it('should pass error from when removing authorization in browser',
			function (done) {
				var config = {
					host: 'http://some.org',
					endpoint: {
						name: 'some',
						accessTokenName: 'token'
					}
				};
				config.handler = function () {
					throw new Error('some');
				};

				var locator = environmentHelper.createLocator(config),
					server = new ResourceServerBrowser(locator, config);

				server.removeAuthorization({
					location: new URI('http://some-server.org:9090/home'),
					cookie: {
						get: function () {
							return 'someaccesstoken';
						}
					}
				})
					.then(function () {
						done(new Error('Should be an error'));
					}, function (reason) {
						assert.strictEqual(reason.message, 'some');
						done();
					})
					.then(null, function (reason) {
						done(reason);
					});
			});
		it('should pass error from ' +
			'from authorization server in browser when error code',
			function (done) {
				var config = {
					host: 'http://some.org',
					endpoint: {
						name: 'some',
						accessTokenName: 'token'
					}
				};
				config.handler = function () {
					return {
						status: {
							code: 500,
							headers: {}
						},
						content: {}
					};
				};

				var locator = environmentHelper.createLocator(config),
					server = new ResourceServerBrowser(locator, config);

				server.removeAuthorization({
					location: new URI('http://some-server.org:9090/home'),
					cookie: {
						get: function () {
							return 'someaccesstoken';
						}
					}
				})
					.then(function () {
						done(new Error('Should be an error'));
					}, function (reason) {
						assert.strictEqual(
							reason.message,
							'Can not invalidate current access token'
						);
						done();
					})
					.then(null, function (reason) {
						done(reason);
					});
			});
	});
});