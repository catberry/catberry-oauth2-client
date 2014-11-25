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

var assert = require('assert'),
	URI = require('catberry-uri').URI,
	Query = require('catberry-uri').Query,
	environmentHelper = require('./environmentHelper'),
	http = require('http');

module.exports = {
	generateResourceServerConfigTest: function (testCase) {
		it(testCase.name, function () {
			var factory = environmentHelper.createFactory(testCase.config);
			if (testCase.error) {
				assert.throws(function () {
					factory.createResourceServer(testCase.createName);
				}, function (error) {
					return (error.message === testCase.error);
				});
				return;
			}

			var server = factory.createResourceServer(testCase.createName);
			Object.keys(testCase.expectedConfig)
				.forEach(function (key) {
					assert.deepEqual(
						server._config[key], testCase.expectedConfig[key]
					);
				});
		});
	},
	generateConfigTest: function (Constructor, testCase) {
		it(testCase.name, function () {
			if (testCase.error) {
				assert.throws(function () {
					var locator = environmentHelper.createLocator(
							testCase.config
						),
						endpoint = new Constructor(
							locator, testCase.config.authorization,
							testCase.config.endpoint
						);
				}, function (error) {
					return (error.message === testCase.error);
				});
				return;
			}
			var locator = environmentHelper.createLocator(testCase.config),
				endpoint = new Constructor(
					locator, testCase.config.authorization,
					testCase.config.endpoint
				);

			if (testCase.expected.sender) {
				Object.keys(testCase.expected.sender)
					.forEach(function (key) {
						assert.deepEqual(
							endpoint._sender[key],
							testCase.expected.sender[key]
						);
					});
			}
			Object.keys(testCase.expected.endpoint)
				.forEach(function (key) {
					if (testCase.expected.endpoint[key] &&
						typeof(testCase.expected.endpoint[key]) === 'object'
					) {
						Object.keys(testCase.expected.endpoint[key])
							.forEach(function (innerKey) {
								assert.strictEqual(
									endpoint[key][innerKey],
									testCase.expected.endpoint[key][innerKey]
								);
							});
					} else {
						assert.deepEqual(
							endpoint[key],
							testCase.expected.endpoint[key]
						);
					}
				});
		});
	},
	generateResourceServerRequestTest: function (testCase) {
		it (testCase.name, function (done) {
			var config = Object.create(testCase.config);
			config.handler = function (parameters) {
				assert.strictEqual(
					parameters.url,
					testCase.config.authorization.resourceServers.server.host +
						testCase.request.path
				);

				testCase.request.headers.Authorization = 'Bearer ' +
					testCase.accessToken;

				assert.deepEqual(
					parameters.headers,
					testCase.request.headers
				);
				assert.deepEqual(
					parameters.data,
					testCase.request.data
				);

				return {
					status: {
						code: testCase.response.code,
						text: http.STATUS_CODES[testCase.response.code],
						headers: testCase.response.headers
					},
					content: testCase.response.content
				};
			};

			var factory = environmentHelper.createFactory(config),
				resourceServer = factory.createResourceServer('server'),
				context = {
					location: new URI(testCase.location),
					cookies: {
						get: function (name) {
							assert.strictEqual(
								name,
								testCase.config.authorization
									.resourceServers.server
									.endpoint.accessTokenName
							);

							return testCase.accessToken;
						}
					},
					redirect: function (url) {
						assert.strictEqual(url, testCase.redirect);
						return Promise.resolve();
					}
				};

			resourceServer.request(context, testCase.request)
				.then(function (result) {
					if (testCase.error) {
						done(new Error('Should be an error'));
						return;
					}

					assert.deepEqual(
						result, testCase.response.content
					);
					done();
				})
				.then(null, function (error) {
					if (testCase.error && error.message === testCase.error) {
						done();
						return;
					}

					done(error);
				});
		});
	},
	generateEndpointTest: function (config, testCase) {
		it(testCase.name, function (done) {
			var isError = false,
				localConfig = Object.create(config);
			localConfig.handler = function (parameters) {
				// validate request that Client does to Authorization Server
				try {
					assert.strictEqual(
						parameters.method, testCase.authServer.request.method
					);
					assert.strictEqual(
						parameters.url, testCase.authServer.request.url
					);
					if (testCase.authServer.request.data) {
						assert.deepEqual(
							parameters.data, testCase.authServer.request.data
						);
					} else {
						assert.strictEqual(
							parameters.data, ''
						);
					}

					validateHeaders(
						parameters.headers, testCase.authServer.request.headers
					);
				} catch (e) {
					isError = true;
					done(e);
				}

				// emulate response from Authorization Server
				return {
					status: {
						code: testCase.authServer.response.code,
						headers: testCase.authServer.response.headers
					},
					content: testCase.authServer.response.content
				};
			};

			// create HTTP server for hosting OAuth 2.0 Client Endpoint
			var app = environmentHelper.createApp(localConfig);
			app.listen(testCase.request.port, function () {
				// do request from Resource Owner to Client
				// described in test case and validate response
				var request = http.request(testCase.request,
					function (response) {
						validateResponse(response, testCase.response,
							function (error) {
								if (!isError) {
									done(error);
								}
							});
					});

				var entity = new Query();
				entity.values = testCase.request.data;
				request.end(entity.toString());
			});
		});
	}
};

function validateResponse(actual, expected, callback) {
	var content = '';
	actual
		.on('data', function (chunk) {
			content += chunk;
		})
		.on('end', function () {
			try {
				assert.strictEqual(actual.statusCode, expected.code);
				validateHeaders(actual.headers, expected.headers);
				if (expected.content) {
					assert.notEqual(content, '');
					var object = JSON.parse(content);
					assert.deepEqual(object, expected.content);
				} else {
					assert.strictEqual(content, '');
				}

				callback();
			} catch (e) {
				callback(e);
			}
		});
}

function validateHeaders(actual, expected) {
	var normalizedActual = {},
		normalizedExpected = {},
		actualKeys = Object.keys(actual),
		expectedKeys = Object.keys(expected);

	actualKeys.forEach(function (key) {
		normalizedActual[key.toLocaleLowerCase()] = actual[key];
	});
	expectedKeys.forEach(function (key) {
		normalizedExpected[key.toLocaleLowerCase()] = expected[key];
	});

	Object.keys(normalizedExpected)
		.forEach(function (headerName) {
			if (typeof (normalizedExpected[headerName]) === 'string') {
				assert.notEqual(
					normalizedActual[headerName].indexOf(
						normalizedExpected[headerName]
					),
					-1
				);
				return;
			}

			if (normalizedExpected[headerName] instanceof Array) {
				assert.strictEqual(
					normalizedActual[headerName] instanceof Array, true
				);
				assert.strictEqual(
					normalizedActual[headerName].length,
					normalizedExpected[headerName].length
				);
				normalizedExpected[headerName].forEach(function (item, index) {
					if (typeof (item) === 'string') {
						assert.notEqual(
							normalizedActual[headerName][index].indexOf(item),
							-1
						);
						return;
					}
					throw new Error('Wrong type: ' + typeof (item));
				});
				return;
			}

			if (normalizedExpected[headerName] === null) {
				assert.strictEqual(normalizedActual[headerName], undefined);
				return;
			}
			throw new Error(
				'Wrong type: ' + typeof (normalizedExpected[headerName])
			);
		});
}