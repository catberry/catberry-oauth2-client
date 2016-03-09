'use strict';

const environmentHelper = require('../helpers/environmentHelper');
const URI = require('catberry-uri').URI;
const ResourceServerBrowser = require('../../browser/ResourceServer');
const testHelper = require('../helpers/testHelper');
const configCases = require('../cases/configs/ResourceServer.json');
const requestCases = require('../cases/ResourceServer/request.json');
const assert = require('assert');

/* eslint max-nested-callbacks: 0 */
describe('ResourceServer', () => {
	describe('#constructor', () => {
		configCases.cases.forEach(testCase => {
			testHelper.generateResourceServerConfigTest(testCase);
		});
	});
	describe('#request', () => {
		requestCases.cases.forEach(testCase => {
			testHelper.generateResourceServerRequestTest(testCase);
		});
	});
	describe('#getToken', () => {
		it('should return valid token from context', () => {
			const config = {
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

			const factory = environmentHelper.createFactory(config);
			const server = factory.createResourceServer('server');

			const token = server.getToken({
				cookie: {
					get: name => {
						assert.strictEqual(
							name,
							config.authorization.resourceServers.server.endpoint.accessTokenName
						);
						return 'someaccesstoken';
					}
				}
			});

			assert.strictEqual(token, 'someaccesstoken');
		});
		it('should return null if token not found in context', () => {
			const config = {
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

			const factory = environmentHelper.createFactory(config);
			const server = factory.createResourceServer('server');

			const token = server.getToken({
				cookie: {
					get: name => {
						assert.strictEqual(
							name,
							config.authorization.resourceServers.server.endpoint.accessTokenName
						);
						return null;
					}
				}
			});

			assert.strictEqual(token, null);
		});
	});
	describe('#isAuthorized', () => {
		it('should return true if token exists', () => {
			const config = {
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

			const factory = environmentHelper.createFactory(config);
			const server = factory.createResourceServer('server');

			const isAuthorized = server.isAuthorized({
				cookie: {
					get: () => {
						return 'someaccesstoken';
					}
				}
			});

			assert.strictEqual(isAuthorized, true);
		});
		it('should return false if token does not exists', () => {
			const config = {
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

			const factory = environmentHelper.createFactory(config);
			const server = factory.createResourceServer('server');

			const isAuthorized = server.isAuthorized({
				cookie: {
					get: () => {
						return null;
					}
				}
			});

			assert.strictEqual(isAuthorized, false);
		});
	});
	describe('#refreshAuthorization', () => {
		it('should do UHR to refresh endpoint in browser', done => {
			const config = {
				host: 'http://some.org',
				endpoint: {
					name: 'some',
					accessTokenName: 'token'
				}
			};
			config.handler = parameters => {
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

			const locator = environmentHelper.createLocator(config);
			const server = new ResourceServerBrowser(locator, config);

			server.refreshAuthorization({
				location: new URI('http://some-server.org:9090/home'),
				cookie: {
					get: () => {
						return 'someaccesstoken';
					}
				}
			})
				.catch(reason => done(reason));
		});
		it('should pass error from when refreshing authorization in browser',
			done => {
				const config = {
					host: 'http://some.org',
					endpoint: {
						name: 'some',
						accessTokenName: 'token'
					}
				};
				config.handler = () => {
					throw new Error('some');
				};

				const locator = environmentHelper.createLocator(config);
				const server = new ResourceServerBrowser(locator, config);

				server.refreshAuthorization({
					location: new URI('http://some-server.org:9090/home'),
					cookie: {
						get: () => {
							return 'someaccesstoken';
						}
					}
				})
					.then(() => {
						done(new Error('Should be an error'));
					}, reason => {
						assert.strictEqual(reason.message, 'some');
						done();
					})
					.catch(reason => done(reason));
			});
		it('should pass error from ' +
			'from authorization server in browser when error code',
			done => {
				const config = {
					host: 'http://some.org',
					endpoint: {
						name: 'some',
						accessTokenName: 'token'
					}
				};
				config.handler = () => {
					return {
						status: {
							code: 500,
							headers: {}
						},
						content: {}
					};
				};

				const locator = environmentHelper.createLocator(config);
				const server = new ResourceServerBrowser(locator, config);

				server.refreshAuthorization({
					location: new URI('http://some-server.org:9090/home'),
					cookie: {
						get: () => {
							return 'someaccesstoken';
						}
					}
				})
					.then(() => {
						done(new Error('Should be an error'));
					}, reason => {
						assert.strictEqual(
							reason.message,
							'Can not refresh this access token'
						);
						done();
					})
					.catch(reason => done(reason));
			});
	});
	describe('#removeAuthorization', () => {
		it('should redirect to remove endpoint', done => {
			const config = {
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

			const factory = environmentHelper.createFactory(config);
			const server = factory.createResourceServer('server');

			server.removeAuthorization({
				location: new URI('http://some-server.org:9090/home'),
				cookie: {
					get: () => {
						return 'someaccesstoken';
					}
				},
				redirect: where => {
					assert.strictEqual(
						where,
						'/some/remove?token=someaccesstoken&return_uri=/home'
					);
					done();
				}
			});
		});
		it('should do UHR to remove endpoint in browser', done => {
			const config = {
				host: 'http://some.org',
				endpoint: {
					name: 'some',
					accessTokenName: 'token'
				}
			};
			config.handler = parameters => {
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

			const locator = environmentHelper.createLocator(config);
			const server = new ResourceServerBrowser(locator, config);

			server.removeAuthorization({
				location: new URI('http://some-server.org:9090/home'),
				cookie: {
					get: () => {
						return 'someaccesstoken';
					}
				}
			})
				.catch(reason => done(reason));
		});
		it('should pass error from when removing authorization in browser',
			done => {
				const config = {
					host: 'http://some.org',
					endpoint: {
						name: 'some',
						accessTokenName: 'token'
					}
				};
				config.handler = () => {
					throw new Error('some');
				};

				const locator = environmentHelper.createLocator(config);
				const server = new ResourceServerBrowser(locator, config);

				server.removeAuthorization({
					location: new URI('http://some-server.org:9090/home'),
					cookie: {
						get: () => {
							return 'someaccesstoken';
						}
					}
				})
					.then(() => {
						done(new Error('Should be an error'));
					}, reason => {
						assert.strictEqual(reason.message, 'some');
						done();
					})
					.catch(reason => done(reason));
			});
		it('should pass error from ' +
			'from authorization server in browser when error code',
			done => {
				const config = {
					host: 'http://some.org',
					endpoint: {
						name: 'some',
						accessTokenName: 'token'
					}
				};
				config.handler = () => {
					return {
						status: {
							code: 500,
							headers: {}
						},
						content: {}
					};
				};

				const locator = environmentHelper.createLocator(config);
				const server = new ResourceServerBrowser(locator, config);

				server.removeAuthorization({
					location: new URI('http://some-server.org:9090/home'),
					cookie: {
						get: () => {
							return 'someaccesstoken';
						}
					}
				})
					.then(() => {
						done(new Error('Should be an error'));
					}, reason => {
						assert.strictEqual(
							reason.message,
							'Can not invalidate current access token'
						);
						done();
					})
					.catch(reason => done(reason));
			});
	});
});
