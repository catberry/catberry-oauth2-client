'use strict';

class UHRMock {
	constructor(locator) {
		const config = locator.resolve('config');
		this._handler = config.handler;
	}

	get(url, options) {
		const parameters = Object.create(options);
		parameters.method = 'GET';
		parameters.url = url;
		return this.request(parameters);
	}

	post(url, options) {
		const parameters = Object.create(options);
		parameters.method = 'POST';
		parameters.url = url;
		return this.request(parameters);
	}

	request(parameters) {
		try {
			const result = this._handler(parameters);
			return Promise.resolve(result);
		} catch (e) {
			return Promise.reject(e);
		}
	}
}

module.exports = UHRMock;
