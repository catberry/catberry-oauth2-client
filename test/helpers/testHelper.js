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
	Query = require('catberry-uri').Query,
	environmentHelper = require('./environmentHelper'),
	http = require('http');

module.exports = {
	generateTest: function (config, testCase) {
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