'use strict';

module.exports = {

	/**
	 * Gets path for token resource.
	 * @param {string} endpointName Name of endpoint.
	 * @returns {string} URI path string.
	 */
	getPath: endpointName => `/${endpointName}`,

	/**
	 * Gets path for token refresh resource.
	 * @param {string} endpointName Name of endpoint.
	 * @returns {string} URI path string.
	 */
	getRefreshPath: endpointName => `/${endpointName}/refresh`,

	/**
	 * Gets path for token remove resource.
	 * @param {string} endpointName Name of endpoint.
	 * @returns {string} URI path string.
	 */
	getRemovePath: endpointName => `/${endpointName}/remove`
};
