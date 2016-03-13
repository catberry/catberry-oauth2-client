'use strict';

const testHelper = require('../../helpers/testHelper');
const ClientCredentialsFlowEndpoint = require('../../../lib/endpoints/ClientCredentialsFlowEndpoint');
const configCases = require('../../cases/configs/ClientCredentialsFlow.json');
const endpointCases = require('../../cases/endpoints/ClientCredentialsFlowEndpoint.json');

/* eslint max-nested-callbacks: 0 */
describe('ClientCredentialsFlowEndpoint', () => {
	describe('#constructor', () => {
		configCases.cases.forEach(testCase => testHelper.generateConfigTest(ClientCredentialsFlowEndpoint, testCase));
	});
	describe('#handler', () => {
		endpointCases.cases.forEach(testCase => testHelper.generateEndpointTest(endpointCases.config, testCase));
	});
});
