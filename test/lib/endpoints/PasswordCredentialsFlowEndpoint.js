'use strict';

const testHelper = require('../../helpers/testHelper');
const PasswordCredentialsFlowEndpoint = require('../../../lib/endpoints/PasswordCredentialsFlowEndpoint');
const configCases = require('../../cases/configs/PasswordCredentialsFlow.json');
const endpointCases = require('../../cases/endpoints/PasswordCredentialsFlowEndpoint.json');

/* eslint max-nested-callbacks: 0 */
describe('PasswordCredentialsFlowEndpoint', () => {
	describe('#constructor', () => {
		configCases.cases.forEach(testCase => testHelper.generateConfigTest(PasswordCredentialsFlowEndpoint, testCase));
	});
	describe('#handler', () => {
		endpointCases.cases.forEach(testCase => testHelper.generateEndpointTest(endpointCases.config, testCase));
	});
});
