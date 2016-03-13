# OAuth 2.0 Client Plugin for Catberry Framework

[![Build Status](https://travis-ci.org/catberry/catberry-oauth2-client.svg?branch=master)](https://travis-ci.org/catberry/catberry-oauth2-client)
[![Gitter](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/catberry/main?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=body_badge)
[![codecov.io](http://codecov.io/github/catberry/catberry-oauth2-client/coverage.svg?branch=master)](http://codecov.io/github/catberry/catberry-oauth2-client?branch=master)

## Installation

```bash
npm install catberry-oauth2-client --save
```

This plugin requires [UHR](https://github.com/catberry/catberry-uhr) registered to the locator.

## Description
This plugin implements "Client" and "Resource Server"
[roles](http://tools.ietf.org/html/rfc6749#section-1.1) from OAuth 2.0
([RFC-6749](https://tools.ietf.org/html/rfc6749)).

Supports grant types:

* [Client Credentials](https://tools.ietf.org/html/rfc6749#section-4.4) (authorization middleware + endpoint)
* [Resource Owner Password Credentials](https://tools.ietf.org/html/rfc6749#section-4.3) (endpoint)
* [Authorization Code Grant](https://tools.ietf.org/html/rfc6749#section-4.1) (endpoint for callback)
* [Refresh token](https://tools.ietf.org/html/rfc6749#section-6) (endpoint)

Supports [Bearer](http://tools.ietf.org/html/rfc6750#section-6.1.1) ([RFC-6750](http://tools.ietf.org/html/rfc6750)) token type.

This plugin sets "access" and "refresh" tokens to the specified cookie names and uses
them for requesting data from a resource server.

If a resource server returns status code 401, it will try to refresh the access token or
unset all token cookies if refreshing process is failed.

If you need OAuth 2.0 Authorization Server you can use a library like
[node-oauth2-server](https://www.npmjs.org/package/node-oauth2-server) or
a framework for building RESTful APIs like [LoopBack](http://docs.strongloop.com/display/LB/OAuth+2.0).

## Usage
Plugin consists of two parts:

 * set of middlewares and endpoints compatible with
 [express](http://expressjs.com)/[connect](https://github.com/senchalabs/connect)
 application.
 * `ResourceServer` type registered in [Service Locator](https://github.com/catberry/catberry/blob/master/docs/index.md#service-locator)

### At the server

In `server.js` you should register the plugin into the locator and use the factory like this:

```javascript
'use strict';

const http = require('http');
const path = require('path');

// configuration
const config = require('./config/environment.json');
const isRelease = process.argv.length === 3 ?	process.argv[2] === 'release' : undefined;
config.publicPath = path.join(__dirname, 'public');
config.server.port = config.server.port || 3000;
config.isRelease = isRelease === undefined ? config.isRelease : isRelease;

// catberry application
const catberry = require('catberry');
const cat = catberry.create(config); // the Catberry application object
cat.events.on('ready', () => {
	const logger = cat.locator.resolve('logger');
	logger.info(`Ready to handle incoming requests on port ${config.server.port}`);
});

// register Catberry plugins needed on the server
const templateEngine = require('catberry-handlebars');
templateEngine.register(cat.locator);

const loggerPlugin = require('catberry-logger');
loggerPlugin.register(cat.locator);

const uhrPlugin = require('catberry-uhr');
uhrPlugin.register(cat.locator);

const OAuth2Client = require('catberry-oauth2-client');
// register all types of OAuth 2.0 client plugin
OAuth2Client.register(cat.locator);

// web server
const express = require('express');
const app = express();

const serveStatic = require('serve-static');
app.use(serveStatic(config.publicPath));

// create factory instance with current configuration
const OAuth2FlowFactory = cat.locator.resolve('oauth2FlowFactory');
// add all endpoints required for OAuth 2.0 authorization to connect application
OAuth2FlowFactory.addEndpoints(app);

app.use(cat.getMiddleware()); // Catberry app as a middleware

const errorhandler = require('errorhandler');
app.use(errorhandler());

http
	.createServer(app)
	.listen(config.server.port);
```

### In a browser
In `browser.js` just do the following:

```javascript
'use strict';

// this config will be replaced by `./config/browser.json` when building
// because of `browser` field in `package.json`
const config = require('./config/environment.json');

// catberry application
const catberry = require('catberry');
const cat = catberry.create(config);

// register Catberry plugins needed in a browser
const templateEngine = require('catberry-handlebars');
templateEngine.register(cat.locator);

const loggerPlugin = require('catberry-logger');
loggerPlugin.register(cat.locator);

const uhrPlugin = require('catberry-uhr');
uhrPlugin.register(cat.locator);

const OAuth2Client = require('catberry-oauth2-client');
OAuth2Client.register(cat.locator);

// starts the application when DOM is ready
cat.startWhenReady();
```

### Configuration
For server configuration:

```javascript
{
	"authorization": {

		// OAuth 2.0 authorization server with "/token" endpoint
		"authServerUrl": "https://example.org",

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

			// Client Credentials Grant
			// http://tools.ietf.org/html/rfc6749#section-4.4
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
			// another example of grantType with same parameters
			// Resource Owner Password Credentials Grant
			// http://tools.ietf.org/html/rfc6749#section-4.3
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

			// this endpoint for redirection URI endpoint when use
			// OAuth 2.0 Authorization Code Grant
			// http://tools.ietf.org/html/rfc6749#section-4.1
			// 2 additional parameters
			// and scope parameter is unsupported
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
THE BROWSER CONFIGURATION OBJECT IT BREAKS THE WHOLE SECURITY MECHANISM**

### Resource Server Usage
For simple access to a resource server using OAuth 2.0 authorization there is a
`ResourceServer` implementation.

You can use it in your application like this:

```javascript
class ApiClient {
	constructor(locator) {
		const factory = locator.resolve('oauth2FlowFactory');
		this.clientToken = factory.createResourceServer(
			'clientToken' // name of resource server from configuration
		);
		this.passwordToken = factory.createResourceServer(
			'passwordToken' // name of resource server from configuration
		);
	}

	request(context, method, apiPath, query) {
		query = query || {};

		const server = this.passwordToken.isAuthorized(context) ?
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
}
```

As a response you would have:

```json
{
  "status": {
    "code": 200,
    "text": "OK",
    "headers": {
      "Content-Type": "text/html; charset=utf-8",
      "Date": "Sun, 13 Mar 2016 09:55:13 GMT"
    }
  },
  "content": {
    "hello": "world"
  }
}
```


Please remember that you need to have an instance of `ResourceServer` for each
grant type used in your application (like in the example earlier).

`ResourceServer` has following methods:

```javascript
/**
 * Does request to the resource server.
 * @param {Object} context Current module context.
 * @param {Object} options Request options.
 * @param {string} options.path Server URL path.
 * @param {Object} options.headers Object with HTTP headers.
 * @param {string?} options.method HTTP method (GET by default).
 * @param {Object?} options.data Data to send to server.
 * @returns {Promise<Object>} Promise for response content.
 */
request(context, options) {}

/**
 * Gets current access token;
 * @param {Object} context Module context.
 * @returns {string} Access token.
 */
getToken(context) {}

/**
 * Determines if context is now authorized to do requests.
 * @param {Object} context Module context.
 * @returns {boolean} true if access to resource server is authorized.
 */
isAuthorized(context) {}

/**
 * Refreshes authorization or remove access and refresh tokens if failed.
 * @param {Object} context Module context.
 * @returns {Promise} Promise for nothing.
 */
refreshAuthorization(context) {}

/**
 * Removes access and refresh tokens.
 * @param {Object} context Module context.
 * @returns {Promise} Promise for nothing.
 */
removeAuthorization(context) {}
```

## Contributing

There are a lot of ways to contribute:

* Give it a star
* Join the [Gitter](https://gitter.im/catberry/main) room and leave a feedback or help with answering users' questions
* [Submit a bug or a feature request](https://github.com/catberry/catberry-oauth2-client/issues)
* [Submit a PR](https://github.com/catberry/catberry-oauth2-client/blob/develop/CONTRIBUTING.md)

Denis Rechkunov <denis.rechkunov@gmail.com>
