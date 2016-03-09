'use strict';

const cookieHelper = require('./cookieHelper');
const BEGINS_WITH_SLASH_REGEXP = /^\//;

const httpHelper = {

	/**
	 * Writes redirection headers to HTTP response.
	 * @param {http.ServerResponse} response HTTP response.
	 * @param {URI} location Location to redirect.
	 */
	redirectResponse(response, location) {
		// check if redirect is URL path, not an absolute URL
		if (location.scheme !== null ||
			location.authority !== null) {

			const error = new Error(`Can not redirect to location "${location}"`);
			error.code = 400;
			httpHelper.writeError(error, response);
			return;
		}

		let locationString = location.toString();

		if (!BEGINS_WITH_SLASH_REGEXP.test(locationString)) {
			locationString = `/${locationString}`;
		}

		response.setHeader('Location', locationString);
		response.writeHead(302);
		response.end();
	},

	/**
	 * Writes error object to HTTP response.
	 * @param {Error} error Error object.
	 * @param {http.ServerResponse} response HTTP response.
	 */
	writeError(error, response) {
		// http://tools.ietf.org/html/rfc6749#section-5.2
		const code = typeof (error.code) === 'number' ? error.code : 400;
		const toSend = error.details && typeof (error.details) === 'object' ? error.details :
			{
				error: code >= 400 && code < 500 ? 'invalid_request' : 'invalid_client',

				/* eslint camelcase: 0 */
				error_description: error.message
			};

		httpHelper.writeToResponse(code, toSend, response);
	},

	/**
	 * Writes specified object as JSON to response with specified code.
	 * @param {number} code HTTP status code.
	 * @param {Object} object Object to send as JSON.
	 * @param {http.ServerResponse} response HTTP response.
	 */
	writeToResponse(code, object, response) {
		response.writeHead(code, {
			'Content-Type': 'application/json; charset=UTF-8',
			'Cache-Control': 'no-store',
			Pragma: 'no-cache'
		});

		const json = JSON.stringify(object);

		response.end(json);
	},

	/**
	 * Checks HTTP request method.
	 * @param {http.IncomingMessage} request HTTP request.
	 * @param {string} method Allowed method name.
	 * @returns {null|Error} Error if HTTP method is wrong.
	 */
	checkMethod(request, method) {
		if (request.method && request.method.toLowerCase() === method) {
			return null;
		}
		const error = new Error(`Only "${method.toUpperCase()}" method is allowed`);
		error.code = 405;
		return error;
	},

	/**
	 * Checks content type in request headers.
	 * @param {http.IncomingMessage} request HTTP request.
	 * @param {string} contentType HTTP content type.
	 * @returns {Error|null} Error if content type if wrong.
	 */
	checkContentType(request, contentType) {
		if (request.headers && request.headers['content-type']) {
			const typeAndParameters = request.headers['content-type'].split(';');
			if (typeAndParameters[0].toLowerCase() === contentType) {
				return null;
			}
		}
		const error = new Error(`Content type must be "${contentType}"`);
		error.code = 406;
		return error;
	},

	/**
	 * Checks upstream length of HTTP request body.
	 * @param {string} upstream Upstream accumulator.
	 * @param {string} chunk Next upstream chunk.
	 * @param {number} length Allowed length.
	 * @returns {null|Error} Error if length exceeds limit.
	 */
	checkLength(upstream, chunk, length) {
		if (upstream.length + chunk.length < length) {
			return null;
		}
		const error = new Error(`Request body is too long, it is limited by ${length} chars`);
		error.code = 413;
		return error;
	},

	/**
	 * Gets access token from Cookie header in request.
	 * @param {string} name Cookie name.
	 * @param {http.IncomingMessage} request HTTP request.
	 * @returns {string?} Access token string.
	 */
	getCookie(name, request) {
		if (!request.headers || !request.headers.cookie) {
			return null;
		}

		const cookie = cookieHelper.getFromRequest(request);
		return cookie[name] || null;
	},

	/**
	 * Sets access token to Set-Cookie response header.
	 * @param {http.IncomingMessage} request HTTP request.
	 * @param {http.ServerResponse} response HTTP response.
	 * @param {Object} cookieSetup Cookie setup object.
	 */
	setCookie(request, response, cookieSetup) {
		// set access token to request as cookie for next middleware
		if (!request.headers) {
			request.headers = {};
		}

		request.headers.cookie = request.headers.cookie ? `${request.headers.cookie}; ` : '';
		request.headers.cookie += `${cookieSetup.key}=${cookieSetup.value}`;

		cookieHelper.setToResponse(response, cookieSetup);
	}
};

module.exports = httpHelper;
