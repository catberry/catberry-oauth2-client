'use strict';

const testHelper = require('../../helpers/testHelper');
const AuthorizationCodeFlowEndpoint = require('../../../lib/endpoints/AuthorizationCodeFlowEndpoint');
const configCases = require('../../cases/configs/AuthorizationCodeFlow.json');
const endpointCases = require('../../cases/endpoints/AuthorizationCodeFlowEndpoint.json');

/* eslint max-nested-callbacks: 0 */
describe('AuthorizationCodeFlowEndpoint', () => {
	describe('#constructor', () => {
		configCases.cases.forEach(testCase => testHelper.generateConfigTest(AuthorizationCodeFlowEndpoint, testCase));
	});
	describe('#handler', () => {
		endpointCases.cases.forEach(testCase => testHelper.generateEndpointTest(endpointCases.config, testCase));
	});
});
