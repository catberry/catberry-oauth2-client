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

var cookieHelper = require('./cookieHelper'),
	url = require('url'),
	util = require('util');

var ERROR_METHOD_FORMAT = 'Only "%s" method is allowed',
	ERROR_TOO_LONG = 'Request body is too long, it is limited by %d chars',
	ERROR_LOCATION = 'Can not redirect to location "%s"',
	ERROR_CONTENT_TYPE = 'Content type must be "%s"',
	BEGINS_WITH_SLASH_REGEXP = /^\//;

var httpHelper = {
	/**
	 * Writes redirection headers to HTTP response.
	 * @param {http.ServerResponse} response HTTP response.
	 * @param {String} location Location to redirect.
	 */
	redirectResponse: function (response, location) {
		var redirectInfo = url.parse(location);
		// check if redirect is URL path, not an absolute URL
		if (redirectInfo.protocol !== null ||
			redirectInfo.slashes !== null ||
			redirectInfo.auth !== null ||
			redirectInfo.host !== null ||
			redirectInfo.hostname !== null ||
			redirectInfo.port !== null) {

			var error = new Error(util.format(ERROR_LOCATION, location));
			error.code = 400;
			httpHelper.writeError(error, response);
			return;
		}

		if (!BEGINS_WITH_SLASH_REGEXP.test(location)) {
			location = '/' + location;
		}
		response.setHeader('Location', location);
		response.writeHead(302);
		response.end();
	},
	/**
	 * Writes error object to HTTP response.
	 * @param {Error} error Error object.
	 * @param {http.ServerResponse} response HTTP response.
	 */
	writeError: function (error, response) {
		// http://tools.ietf.org/html/rfc6749#section-5.2
		var toSend = error.details && typeof(error.details) === 'object' ?
				error.details :
			{
				error: 'invalid_request',
				// jscs:disable requireCamelCaseOrUpperCaseIdentifiers
				error_description: error.message
			},
			code = typeof(error.code) === 'number' ? error.code : 400;

		httpHelper.writeToResponse(code, toSend, response);
	},
	/**
	 * Writes specified object as JSON to response with specified code.
	 * @param {Number} code HTTP status code.
	 * @param {Object} object Object to send as JSON.
	 * @param {http.ServerResponse} response HTTP response.
	 */
	writeToResponse: function (code, object, response) {
		response.writeHead(code, {
			'Content-Type': 'application/json;charset=UTF-8',
			'Cache-Control': 'no-store',
			Pragma: 'no-cache'
		});
		var json = JSON.stringify(object);
		response.end(json);
	},
	/**
	 * Checks HTTP request method.
	 * @param {http.IncomingMessage} request HTTP request.
	 * @param {String} method Allowed method name.
	 * @returns {null|Error} Error if HTTP method is wrong.
	 */
	checkMethod: function (request, method) {
		if (request.method && request.method.toLowerCase() === method) {
			return null;
		}
		var error = new Error(util.format(ERROR_METHOD_FORMAT, method));
		error.code = 405;
		return error;
	},
	/**
	 * Checks content type in request headers.
	 * @param {http.IncomingMessage} request HTTP request.
	 * @param {String} contentType HTTP content type.
	 * @returns {Error|null} Error if content type if wrong.
	 */
	checkContentType: function (request, contentType) {
		if (request.headers && request.headers['content-type'] &&
			request.headers['content-type'].toLowerCase() === contentType) {
			return null;
		}
		var error = new Error(util.format(ERROR_CONTENT_TYPE, contentType));
		error.code = 406;
		return error;
	},
	/**
	 * Checks upstream length of HTTP request body.
	 * @param {String} upstream Upstream accumulator.
	 * @param {String} chunk Next upstream chunk.
	 * @param {Number} length Allowed length.
	 * @returns {null|Error} Error if length exceeds limit.
	 */
	checkLength: function (upstream, chunk, length) {
		if (upstream.length + chunk.length < length) {
			return null;
		}
		var error = new Error(util.format(ERROR_TOO_LONG, length));
		error.code = 413;
		return error;
	},
	/**
	 * Gets access token from Cookie header in request.
	 * @param {String} name Cookie name.
	 * @param {http.IncomingMessage} request HTTP request.
	 * @returns {string}
	 */
	getCookie: function (name, request) {
		if (!request.headers || !request.headers.cookie) {
			return null;
		}

		var cookies = cookieHelper.getFromRequest(request);
		return cookies[name] || null;
	},
	/**
	 * Sets access token to Set-Cookie response header.
	 * @param {http.IncomingMessage} request HTTP request.
	 * @param {http.ServerResponse} response HTTP response.
	 * @param {Object} cookieSetup Cookie setup object.
	 */
	setCookie: function (request, response, cookieSetup) {
		// set access token to request as cookie for next middleware
		if (!request.headers) {
			request.headers = {};
		}
		request.headers.cookie = request.headers.cookie ?
			request.headers.cookie + '; ' :
			'';
		request.headers.cookie += cookieSetup.key + '=' + cookieSetup.value;

		cookieHelper.setToResponse(response, cookieSetup);
	}
};

module.exports = httpHelper;