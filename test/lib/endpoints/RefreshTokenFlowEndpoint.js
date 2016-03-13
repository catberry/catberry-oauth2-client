'use strict';

const testHelper = require('../../helpers/testHelper');
const RefreshTokenFlowEndpoint = require('../../../lib/endpoints/RefreshTokenFlowEndpoint');
const configCases = require('../../cases/configs/RefreshTokenFlow.json');
const endpointCases = require('../../cases/endpoints/RefreshTokenFlowEndpoint.json');

/* eslint max-nested-callbacks: 0 */
describe('RefreshTokenFlowEndpoint', () => {
	describe('#constructor', () => {
		configCases.cases.forEach(testCase => testHelper.generateConfigTest(RefreshTokenFlowEndpoint, testCase));
	});
	describe('#handler', () => {
		endpointCases.cases.forEach(testCase => testHelper.generateEndpointTest(endpointCases.config, testCase));
	});
});
