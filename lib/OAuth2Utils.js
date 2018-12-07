'use strict';

const cookieHelper = require('./helpers/cookieHelper');

class OAuth2Utils {

  /**
   * Get app specific headers for authorization request.
   * @param {IncomingMessage} request
   * @return {IncomingMessage.headers}
   */
	getSpecificHeaders(request) {
		return {};
	}
}

module.exports = OAuth2Utils;
