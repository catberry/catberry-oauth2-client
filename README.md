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

##Contribution
If you have found a bug, please create pull request with [mocha](https://www.npmjs.org/package/mocha) 
unit-test which reproduces it or describe all details in issue if you can not 
implement test. If you want to propose some improvements just create issue or 
pull request but please do not forget to use `npm test` to be sure that your 
code is awesome.

All changes should satisfy this [Code Style Guide](https://github.com/catberry/catberry/blob/master/docs/code-style-guide.md).

Also your changes should be covered by unit tests using [mocha](https://www.npmjs.org/package/mocha).

Denis Rechkunov <denis.rechkunov@gmail.com>