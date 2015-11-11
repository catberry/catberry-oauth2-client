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

module.exports = UHRMock;

// if V8 still does not have promises then add it.
if (!('Promise' in global)) {
	global.Promise = require('promise');
}

function UHRMock($config) {
	this._handler = $config.handler;
}

UHRMock.prototype._handler = null;

UHRMock.prototype.get = function (url, options) {
	var parameters = Object.create(options);
	parameters.method = 'GET';
	parameters.url = url;
	return this.request(parameters);
};

UHRMock.prototype.post = function (url, options) {
	var parameters = Object.create(options);
	parameters.method = 'POST';
	parameters.url = url;
	return this.request(parameters);
};

UHRMock.prototype.request = function (parameters) {
	try {
		var result = this._handler(parameters);
		return Promise.resolve(result);
	} catch (e) {
		return Promise.reject(e);
	}
};