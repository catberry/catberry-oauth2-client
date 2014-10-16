#OAuth 2.0 Client Plugin for Catberry Framework 2.0 [![Build Status](https://travis-ci.org/catberry/catberry-oauth2-client.png?branch=master)](https://travis-ci.org/catberry/catberry-oauth2-client) [![Coverage Status](https://coveralls.io/repos/catberry/catberry-oauth2-client/badge.png)](https://coveralls.io/r/catberry/catberry-oauth2-client)
[![NPM](https://nodei.co/npm/catberry-oauth2-client.png)](https://nodei.co/npm/catberry-oauth2-client/)

##Description
This plugin implements "client" role from OAuth 2.0 ([RFC-6749](http://www.rfc-base.org/txt/rfc-6749.txt)). 

Supports grant types:

* Client Credentials
* Resource Owner Password Credentials
* Authorization Code Grant (redirect endpoint implementation)

Supports Bearer ([RFC-6750](http://tools.ietf.org/html/rfc6750)) token type.
Supports refresh token and auto-obtaining of new access token.

##Contribution
If you have found a bug, please create pull request with [mocha](https://www.npmjs.org/package/mocha) 
unit-test which reproduces it or describe all details in issue if you can not 
implement test. If you want to propose some improvements just create issue or 
pull request but please do not forget to use `npm test` to be sure that your 
code is awesome.

All changes should satisfy this [Code Style Guide](https://github.com/catberry/catberry/blob/master/docs/code-style-guide.md).

Also your changes should be covered by unit tests using [mocha](https://www.npmjs.org/package/mocha).

Denis Rechkunov <denis.rechkunov@gmail.com>