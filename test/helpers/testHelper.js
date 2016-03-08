'use strict';

const assert = require('assert');
const URI = require('catberry-uri').URI;
const Query = require('catberry-uri').Query;
const environmentHelper = require('./environmentHelper');
const http = require('http');

module.exports = {
	generateResourceServerConfigTest(testCase) {
		it(testCase.name, () => {
			const factory = environmentHelper.createFactory(testCase.config);
			if (testCase.error) {
				assert.throws(
					() => factory.createResourceServer(testCase.createName),
					error => error.message === testCase.error
				);
				return;
			}

			const server = factory.createResourceServer(testCase.createName);

			/* eslint no-underscore-dangle: 0 */
			Object.keys(testCase.expectedConfig)
				.forEach(key => assert.deepEqual(server._config[key], testCase.expectedConfig[key]));
		});
	},

	generateConfigTest(Constructor, testCase) {
		it(testCase.name, () => {
			if (testCase.error) {
				assert.throws(
					() => {
						const locator = environmentHelper.createLocator(testCase.config);
						const endpoint = new Constructor(locator, testCase.config.authorization, testCase.config.endpoint);
					},
					error => error.message === testCase.error);
				return;
			}

			const locator = environmentHelper.createLocator(testCase.config);
			const endpoint = new Constructor(locator, testCase.config.authorization, testCase.config.endpoint);

			if (testCase.expected.sender) {
				Object.keys(testCase.expected.sender)
					.forEach(key => assert.deepEqual(endpoint._sender[key], testCase.expected.sender[key]));
			}

			/* eslint max-nested-callbacks: 0 */
			Object.keys(testCase.expected.endpoint)
				.forEach(key => {
					if (testCase.expected.endpoint[key] && typeof (testCase.expected.endpoint[key]) === 'object') {
						Object.keys(testCase.expected.endpoint[key])
							.forEach(innerKey => assert.strictEqual(endpoint[key][innerKey], testCase.expected.endpoint[key][innerKey]));
					} else {
						assert.deepEqual(endpoint[key], testCase.expected.endpoint[key]);
					}
				});
		});
	},

	generateResourceServerRequestTest(testCase) {
		it(testCase.name, done => {
			const config = Object.create(testCase.config);
			config.handler = parameters => {
				assert.strictEqual(
					parameters.url,
					testCase.config.authorization.resourceServers.server.host +
					testCase.request.path
				);

				testCase.request.headers.Authorization = `Bearer ${testCase.accessToken}`;

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

			const factory = environmentHelper.createFactory(config);
			const resourceServer = factory.createResourceServer('server');
			const context = {
				location: new URI(testCase.location),
				cookie: {
					get(name) {
						assert.strictEqual(
							name,
							testCase.config.authorization
								.resourceServers.server
								.endpoint.accessTokenName
						);

						return testCase.accessToken;
					}
				},
				redirect(url) {
					assert.strictEqual(url, testCase.redirect);
					return Promise.resolve();
				}
			};

			resourceServer.request(context, testCase.request)
				.then(result => {
					if (testCase.error) {
						done(new Error('Should be an error'));
						return;
					}

					assert.deepEqual(
						result, testCase.response.content
					);
					done();
				})
				.catch(error => {
					if (testCase.error && error.message === testCase.error) {
						done();
						return;
					}

					done(error);
				});
		});
	},

	generateEndpointTest(config, testCase) {
		it(testCase.name, done => {
			const localConfig = Object.create(config);
			let isError = false;

			localConfig.handler = parameters => {
				// validate request that Client does to Authorization Server
				try {
					assert.strictEqual(parameters.method, testCase.authServer.request.method);
					assert.strictEqual(parameters.url, testCase.authServer.request.url);
					if (testCase.authServer.request.data) {
						assert.deepEqual(parameters.data, testCase.authServer.request.data);
					} else {
						assert.strictEqual(parameters.data, '');
					}

					validateHeaders(parameters.headers, testCase.authServer.request.headers);
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
			const app = environmentHelper.createApp(localConfig);
			app.listen(testCase.request.port, () => {
				// do request from Resource Owner to Client
				// described in test case and validate response
				const request = http.request(testCase.request,
					response => {
						validateResponse(response, testCase.response,
							error => {
								if (!isError) {
									done(error);
								}
							});
					});

				const entity = new Query();
				entity.values = testCase.request.data;
				request.end(entity.toString());
			});
		});
	}
};

/**
 * Validate Response
 *
 * @param actual
 * @param expected
 * @param callback
 */
function validateResponse(actual, expected, callback) {
	let content = '';
	actual
		.on('data', chunk => {
			content += chunk;
		})
		.on('end', () => {
			try {
				assert.strictEqual(actual.statusCode, expected.code);
				validateHeaders(actual.headers, expected.headers);
				if (expected.content) {
					assert.notEqual(content, '');
					const object = JSON.parse(content);
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

/**
 * Validate headers
 *
 * @param actual
 * @param expected
 */
function validateHeaders(actual, expected) {
	const normalizedActual = {};
	const normalizedExpected = {};
	const actualKeys = Object.keys(actual);
	const expectedKeys = Object.keys(expected);

	actualKeys.forEach(key => {
		normalizedActual[key.toLocaleLowerCase()] = actual[key];
	});
	expectedKeys.forEach(key => {
		normalizedExpected[key.toLocaleLowerCase()] = expected[key];
	});

	Object.keys(normalizedExpected)
		.forEach(headerName => {
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
				assert.strictEqual(normalizedActual[headerName] instanceof Array, true);
				assert.strictEqual(normalizedActual[headerName].length, normalizedExpected[headerName].length);

				normalizedExpected[headerName].forEach((item, index) => {
					if (typeof (item) === 'string') {
						assert.notEqual(normalizedActual[headerName][index].indexOf(item), -1);
						return;
					}
					throw new Error(`Wrong type: ${typeof (item)}`);
				});
				return;
			}

			if (normalizedExpected[headerName] === null) {
				assert.strictEqual(normalizedActual[headerName], undefined);
				return;
			}
			throw new Error(
				`Wrong type: ${typeof (normalizedExpected[headerName])}`
			);
		});
}
