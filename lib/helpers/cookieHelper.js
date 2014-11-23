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

module.exports = {
	/**
	 * Gets all cookies from HTTP request headers.
	 * @param {IncomingMessage} request HTTP request.
	 * @returns {Object} Map of all cookie values.
	 */
	getFromRequest: function (request) {
		if (!request.headers || typeof(request.headers.cookie) !== 'string') {
			return {};
		}

		var result = {};
		request.headers.cookie
			.split(';')
			.forEach(function (cookiePair) {
				cookiePair = cookiePair.trim();
				var parts = cookiePair.split('=');
				if (parts.length === 1) {
					result[parts[0]] = true;
				} else if (parts.length === 2) {
					result[parts[0]] = parts[1];
				}
			});

		return result;
	},
	/**
	 * Sets cookies to HTTP response.
	 * @param {ServerResponse} response HTTP server response.
	 * @param {Object} cookieSetup Cookie setup object.
	 * @param {string} cookieSetup.key Cookie key.
	 * @param {string} cookieSetup.value Cookie value.
	 * @param {number?} cookieSetup.maxAge Max cookie age in seconds.
	 * @param {Date?} cookieSetup.expire Expire date.
	 * @param {string?} cookieSetup.path URL path for cookie.
	 * @param {string?} cookieSetup.domain Cookie domain.
	 * @param {boolean?} cookieSetup.secure Is cookie secured.
	 * @param {boolean?} cookieSetup.httpOnly Is cookie HTTP only.
	 */
	/*jshint maxcomplexity:false */
	// http://tools.ietf.org/html/rfc6265#section-4.1.1
	setToResponse: function (response, cookieSetup) {
		if (typeof(cookieSetup.key) !== 'string' ||
			typeof(cookieSetup.value) !== 'string') {
			throw new Error('Wrong key or value');
		}

		var cookie = cookieSetup.key + '=' + cookieSetup.value;

		if (typeof(cookieSetup.maxAge) === 'number') {
			cookie += '; Max-Age=' + cookieSetup.maxAge.toFixed();
			if (!cookieSetup.expire) {
				// by default expire date = current date + max-age in seconds
				cookieSetup.expire = cookieSetup.maxAge === 0 ?
					new Date(0) :
					new Date((new Date()).getTime() +
						cookieSetup.maxAge * 1000);
			}
		}
		if (cookieSetup.expire instanceof Date) {
			cookie += '; Expires=' + cookieSetup.expire.toUTCString();
		}
		if (typeof(cookieSetup.path) === 'string') {
			cookie += '; Path=' + cookieSetup.path;
		}
		if (typeof(cookieSetup.domain) === 'string') {
			cookie += '; Domain=' + cookieSetup.domain;
		}
		if (typeof(cookieSetup.secure) === 'boolean' &&
			cookieSetup.secure) {
			cookie += '; Secure';
		}
		if (typeof(cookieSetup.httpOnly) === 'boolean' &&
			cookieSetup.httpOnly) {
			cookie += '; HttpOnly';
		}

		var currentCookies = response.getHeader('set-cookie');
		if (typeof(currentCookies) === 'string') {
			currentCookies = [currentCookies];
		} else if (!Array.isArray(currentCookies)) {
			currentCookies = [];
		}

		response.removeHeader('Set-Cookie');
		response.setHeader('Set-Cookie', currentCookies.concat(cookie));
	}
};