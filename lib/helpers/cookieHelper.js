'use strict';

const COOKIE_CLEAN_REGEXP = /^"|"$/g;
const COOKIE_SPLIT_REGEXP = /; */;

module.exports = {

	/**
	 * Gets cookie from HTTP request headers.
	 * @param {IncomingMessage} request HTTP request.
	 * @returns {Object} Map of all cookie values.
	 */
	getFromRequest(request) {
		if (!request.headers || typeof (request.headers.cookie) !== 'string') {
			return {};
		}

		const result = {};
		request.headers.cookie
			.split(COOKIE_SPLIT_REGEXP)
			.forEach(cookiePair => {
				const equalsIndex = cookiePair.indexOf('=');
				if (equalsIndex < 0) {
					return;
				}

				const key = cookiePair.substr(0, equalsIndex).trim();
				let value = cookiePair.substr(equalsIndex + 1).trim();

				value = value.replace(COOKIE_CLEAN_REGEXP, '');
				result[key] = value;
			});

		return result;
	},

	/**
	 * Sets cookie to HTTP response.
	 *
	 * http://tools.ietf.org/html/rfc6265#section-4.1.1
	 *
	 * @param {ServerResponse} response HTTP server response.
	 * @param {Object} cookieSetup Cookie setup object.
	 * @param {string} cookieSetup.key Cookie key.
	 * @param {string} cookieSetup.value Cookie value.
	 * @param {number?} cookieSetup.maxAge Max cookie age in seconds.
	 * @param {Date?} cookieSetup.expiress Expire date.
	 * @param {string?} cookieSetup.path URL path for cookie.
	 * @param {string?} cookieSetup.domain Cookie domain.
	 * @param {boolean?} cookieSetup.secure Is cookie secured.
	 * @param {boolean?} cookieSetup.httpOnly Is cookie HTTP only.
	 */
	/* eslint complexity: 0 */
	setToResponse(response, cookieSetup) {
		if (typeof (cookieSetup.key) !== 'string' ||
			typeof (cookieSetup.value) !== 'string') {
			throw new Error('Wrong key or value');
		}

		let cookie = `${cookieSetup.key}=${cookieSetup.value}`;

		if (typeof (cookieSetup.maxAge) === 'number') {
			cookie += `; Max-Age=${cookieSetup.maxAge.toFixed()}`;
			if (!cookieSetup.expires) {
				// by default expire date = current date + max-age in seconds
				cookieSetup.expires = cookieSetup.maxAge === 0 ? new Date(0) : new Date((new Date()).getTime() + cookieSetup.maxAge * 1000);
			}
		}

		if (cookieSetup.expires instanceof Date) {
			cookie += `; Expires=${cookieSetup.expires.toUTCString()}`;
		}

		if (typeof (cookieSetup.path) === 'string') {
			cookie += `; Path=${cookieSetup.path}`;
		}

		if (typeof (cookieSetup.domain) === 'string') {
			cookie += `; Domain=${cookieSetup.domain}`;
		}

		if (typeof (cookieSetup.secure) === 'boolean' &&
			cookieSetup.secure) {
			cookie += '; Secure';
		}

		if (typeof (cookieSetup.httpOnly) === 'boolean' &&
			cookieSetup.httpOnly) {
			cookie += '; HttpOnly';
		}

		let currentCookies = response.getHeader('set-cookie');
		if (typeof (currentCookies) === 'string') {
			currentCookies = [currentCookies];
		} else if (!Array.isArray(currentCookies)) {
			currentCookies = [];
		}

		response.removeHeader('Set-Cookie');
		response.setHeader('Set-Cookie', currentCookies.concat(cookie));
	}
};
