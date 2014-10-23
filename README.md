#OAuth 2.0 Client Plugin for Catberry Framework 2.0 [![Build Status](https://travis-ci.org/catberry/catberry-oauth2-client.png?branch=master)](https://travis-ci.org/catberry/catberry-oauth2-client) [![Coverage Status](https://coveralls.io/repos/catberry/catberry-oauth2-client/badge.png)](https://coveralls.io/r/catberry/catberry-oauth2-client)
[![NPM](https://nodei.co/npm/catberry-oauth2-client.png)](https://nodei.co/npm/catberry-oauth2-client/)

##Description
This plugin implements "client" and "resource server" 
[roles](http://tools.ietf.org/html/rfc6749#section-1.1) from OAuth 2.0 
([RFC-6749](http://www.rfc-base.org/txt/rfc-6749.txt)). 

Supports grant types:

* Client Credentials (authorization middleware + endpoint)
* Resource Owner Password Credentials (endpoint)
* Authorization Code Grant (endpoint for callback)
* Refresh token (endpoint)

Supports Bearer ([RFC-6750](http://tools.ietf.org/html/rfc6750)) token type.

This plugin sets access and refresh token to specified cookies and uses them
to do all requests to resource server.

If resource server returns 401 status code it tries to refresh token or
unset all token cookies if refreshing is failed.

##Usage
Plugin consists of two parts:
 
 * set of middlewares and endpoints compatible with 
 [express](http://expressjs.com)/[connect](https://github.com/senchalabs/connect) 
 application.
 * `ResourceServer` type registered in [Service Locator](https://github.com/catberry/catberry/blob/master/docs/index.md#service-locator)

###At Server

In `server.js` you must register library in locator and use factory like this:

```javascript
var OAuth2Client = require('catberry-oauth2-client'),
	catberry = require('catberry');

var http = require('http'),
	path = require('path'),
	publicPath = path.join(__dirname, 'public'),
	connect = require('connect'),
	config = require('./configs/server.json'),
	cat = catberry.create(config),
	app = connect();

config.publicPath = publicPath;
config.port = config.port || 3000;
config.isRelease = typeof(config.isRelease) === 'boolean' ?
	config.isRelease : false;

var serveStatic = require('serve-static');
app.use(serveStatic(publicPath));

// register all types of OAuth 2.0 client plugin
OAuth2Client.register(cat.locator);
// create factory instance with current configuration
var OAuth2FlowFactory = cat.locator.resolve('oauth2FlowFactory');
// add all endpoints required for OAuth 2.0 authorization to connect application
OAuth2FlowFactory.addEndpoints(app);

// and only then add catberry middleware
app.use(cat.getMiddleware());

var errorhandler = require('errorhandler');
app.use(errorhandler());

http
	.createServer(app)
	.listen(config.port);
```

###In Browser
In `browser.js` just do the following:

```javascript
var OAuth2Client = require('catberry-oauth2-client'),
	catberry = require('catberry'),
	config = require('.configs/browser.json'),
	cat = catberry.create(config);

OAuth2Client.register(cat.locator);
cat.startWhenReady();
```

###Configuration
For server configuration:
```javascript
{
	"authorization": {
		
		// OAuth 2.0 authorization server with "/token" endpoint
		"authServerUrl": "https://example.org/",
		
		// client credentials
		"clientId": "some_client_id",
		"clientSecret": "some_client_secret",
		
		// request timeout (Optional, 30 seconds by default)
		"timeout": 30000,
		
		// authorization server token endpoint path (Optional, /token by default)
		"tokenEndpointPath": "/token",
		
		// is invalid SSL certificate allowed
		"unsafeHTTPS": true,
		
		// proxy-endpoints for obtaining access token using client credentials
		"endpoints":{
			
			// this grantType also adds middleware that sets access token for
			// every http request to connect/express application
			// name of endpoint is a connect/express routing
			"auth/guest":{
				
				// grant type from 
				"grantType": "client_credentials",
				
				// some scopes specified by resource provider (Optional)
				"scope": "wall",
				
				"cookie":{
					// name of cookie with access token
					"accessTokenName": "ccat",
					
					// name of cookie with refresh token
					"refreshTokenName": "reccat",
					
					// expiration time in seconds for access token cookie 
					// if it is not specified by authorization server 
					// (Optional, 1 hour by default)
					"accessTokenExpiresIn": 3600,
					
					// expiration time in seconds for refresh token cookie
                    // (Optional 100 years by default)
					"refreshTokenExpiresIn": 3110400000,
					
					// domain for cookie (Optional)
					"domain": "some.example.org",
					
					// Path attribute for cookie ('/' by default).
					"path": "/"
				}
			},
			"auth/user":{
				"grantType": "password",
				"scope": "wall, profile, email",
				"cookie":{
					"accessTokenName": "pcat",
					"refreshTokenName": "repcat",
					"accessTokenExpiresIn": 3600,
					"refreshTokenExpiresIn": 3110400000,
					"domain": "some.example.org",
					"path": "/"
				}
			},
			
			// this endpoint for callback endpoint when use 
			// OAuth 2.0 Authorization Code Grant
			// http://tools.ietf.org/html/rfc6749#section-4.1
			"auth/social":{
				"grantType": "authorization_code",
				
				// redirect URI used for obtaining authorization code 
				"redirectUri": "https://example.org/social",
				
				// where to return after access token has been obtained
				"returnUri": "/",
				 
				"cookie":{
					"accessTokenName": "acat",
					"refreshTokenName": "reacat",
					"accessTokenExpiresIn": 3600,
					"refreshTokenExpiresIn": 3110400000,
					"domain": "some.example.org",
					"path": "/"
				}
			}
		}
	}
}
```

For both server and browser configuration:
```javascript
{
	"authorization": {
		"resourceServers": {
			"clientToken": {
			
				// is invalid SSL certificate allowed
				"unsafeHTTPS": true,
				
				// resource server host
				"host": "https://example.org",
				
				// endpoint to use for authorization
				"endpoint": {
				
					// name of endpoint from server configuration
					"name": "auth/guest",
				
					// name of cookie with access token
					"accessTokenName": "ccat"
				}
			},
			"passwordToken": {
				"unsafeHTTPS": true,
				"host": "https://example.org",
				"endpoint": {
					"name": "auth/user",
					"accessTokenName": "pcat"
				}
			}
		}
	}
}
```

**WARNING! DO NOT STORE `clientId` AND `clientSecret` PARAMETERS IN 
BROWSER CONFIGURATION OBJECT IT BREAKS WHOLE SECURITY MECHANISM**

###Resource Server Usage
For simple access to resource server using OAuth 2.0 authorization there is a
`ResourceServer` implementation.

You can use it in your catberry module like this:

```javascript
function ApiClient($oauth2FlowFactory) {
	this.clientToken = $oauth2FlowFactory.createResourceServer(
		'clientToken' // name of resource server from configuration
	);
	this.passwordToken = $oauth2FlowFactory.createResourceServer(
		'passwordToken' // name of resource server from configuration
	);
}

ApiClient.prototype.request = function (context, method, apiPath, query) {
	query = query || {};

	var server = this.passwordToken.isAuthorized(context) ?
			this.passwordToken : this.clientToken;

	return server.request(context, {
			headers: {
				Accept: 'application/json;q=1'
			},
			path: apiPath,
			method: method,
			data: query
		});
};
```

`ResourceServer` has following methods:

```javascript
/**
 * Does request to the resource server.
 * @param {Object} context Current module context.
 * @param {Object} options Request options.
 * @param {String} options.path Server URL path.
 * @param {Object} options.headers Object with HTTP headers.
 * @param {String?} options.method HTTP method (GET by default).
 * @param {Object?} options.data Data to send to server.
 * @returns {Promise<Object>} Promise for response content.
 */
ResourceServer.prototype.request = function (context, options) { }

/**
 * Gets current access token;
 * @param {Object} context Module context.
 * @returns {String} Access token.
 */
ResourceServer.prototype.getToken = function (context) { }

/**
 * Determines if context is now authorized to do requests.
 * @param {Object} context Module context.
 * @returns {Boolean} true if access to resource server is authorized.
 */
ResourceServer.prototype.isAuthorized = function (context) { }

/**
 * Refreshes authorization or remove access and refresh tokens if failed.
 * @param {Object} context Module context.
 * @returns {Promise} Promise for nothing.
 */
ResourceServer.prototype.refreshAuthorization = function (context) { }

/**
 * Removes access and refresh tokens.
 * @param {Object} context Module context.
 * @returns {Promise} Promise for nothing.
 */
ResourceServer.prototype.removeAuthorization = function (context) { }

```

##Contribution
If you have found a bug, please create pull request with [mocha](https://www.npmjs.org/package/mocha) 
unit-test which reproduces it or describe all details in issue if you can not 
implement test. If you want to propose some improvements just create issue or 
pull request but please do not forget to use `npm test` to be sure that your 
code is awesome.

All changes should satisfy this [Code Style Guide](https://github.com/catberry/catberry/blob/master/docs/code-style-guide.md).

Also your changes should be covered by unit tests using [mocha](https://www.npmjs.org/package/mocha).

Denis Rechkunov <denis.rechkunov@gmail.com>