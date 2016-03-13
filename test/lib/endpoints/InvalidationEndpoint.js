'use strict';

const testHelper = require('../../helpers/testHelper');
const InvalidationEndpoint = require('../../../lib/endpoints/InvalidationEndpoint');
const configCases = require('../../cases/configs/Invalidation.json');
const endpointCases = require('../../cases/endpoints/InvalidationEndpoint.json');

/* eslint max-nested-callbacks: 0 */
describe('InvalidationEndpoint', () => {
	describe('#constructor', () => {
		configCases.cases.forEach(testCase => testHelper.generateConfigTest(InvalidationEndpoint, testCase));
	});
	describe('#handler', () => {
		endpointCases.cases.forEach(testCase => testHelper.generateEndpointTest(endpointCases.config, testCase));
	});
});
