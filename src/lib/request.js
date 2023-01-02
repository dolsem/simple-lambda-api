'use strict';

/**
 * Lightweight web framework for your serverless applications
 * @author Jeremy Daly <jeremy@jeremydaly.com>
 * @license MIT
 */

const QS = require('querystring'); // Require the querystring library
const UTILS = require('./utils'); // Require utils library
const LOGGER = require('./logger'); // Require logger library

class REQUEST {
  // Create the constructor function.
  constructor(app) {
    // Record start time
    this._start = Date.now();

    // Create a reference to the app
    this.app = app;

    // Flag cold starts
    this.coldStart = app._requestCount === 0 ? true : false;

    // Increment the requests counter
    this.requestCount = ++app._requestCount;

    // Init the handler
    this._handler;

    // Set the version
    this.version = app._version;

    // Init headers
    this.headers = {};

    // Init multi-value support flag
    this._multiValueSupport = null;

    // Init log helpers (message,custom) and create app reference
    app.log = this.log = Object.keys(app._logLevels).reduce(
      (acc, lvl) =>
        Object.assign(acc, {
          [lvl]: (m, c) => this.logger(lvl, m, this, this.context, c),
        }),
      {}
    );

    // Init _logs array for storage
    this._logs = [];
  } // end constructor

  // Parse the request
  async parseRequest() {
    // Set the payload version
    this.payloadVersion = this.app._event.version
      ? this.app._event.version
      : null;

    // Detect multi-value support
    this._multiValueSupport = 'multiValueHeaders' in this.app._event;

    // Set the method
    this.method = this.app._event.httpMethod
      ? this.app._event.httpMethod.toUpperCase()
      : this.app._event.requestContext && this.app._event.requestContext.http
      ? this.app._event.requestContext.http.method.toUpperCase()
      : 'GET';

    // Set the path
    this.path =
      this.payloadVersion === '2.0'
        ? this.app._event.rawPath
        : this.app._event.path;

    // Set the query parameters (backfill for ALB)
    this.query = Object.assign(
      {},
      this.app._event.queryStringParameters,
      'queryStringParameters' in this.app._event
        ? {} // do nothing
        : Object.keys(
            Object.assign({}, this.app._event.multiValueQueryStringParameters)
          ).reduce(
            (qs, key) =>
              Object.assign(
                qs, // get the last value of the array
                {
                  [key]: decodeURIComponent(
                    this.app._event.multiValueQueryStringParameters[key].slice(
                      -1
                    )[0]
                  ),
                }
              ),
            {}
          )
    );

    // Set the multi-value query parameters (simulate if no multi-value support)
    this.multiValueQuery = Object.assign(
      {},
      this._multiValueSupport
        ? {}
        : Object.keys(this.query).reduce(
            (qs, key) =>
              Object.assign(qs, { [key]: this.query[key].split(',') }),
            {}
          ),
      this.app._event.multiValueQueryStringParameters
    );

    // Set the raw headers (normalize multi-values)
    // per https://www.w3.org/Protocols/rfc2616/rfc2616-sec4.html#sec4.2
    this.rawHeaders =
      this._multiValueSupport && this.app._event.multiValueHeaders !== null
        ? Object.keys(this.app._event.multiValueHeaders).reduce(
            (headers, key) =>
              Object.assign(headers, {
                [key]: UTILS.fromArray(this.app._event.multiValueHeaders[key]),
              }),
            {}
          )
        : this.app._event.headers || {};

    // Set the headers to lowercase
    this.headers = Object.keys(this.rawHeaders).reduce(
      (acc, header) =>
        Object.assign(acc, { [header.toLowerCase()]: this.rawHeaders[header] }),
      {}
    );

    this.multiValueHeaders = this._multiValueSupport
      ? this.app._event.multiValueHeaders
      : Object.keys(this.headers).reduce(
          (headers, key) =>
            Object.assign(headers, {
              [key.toLowerCase()]: this.headers[key].split(','),
            }),
          {}
        );

    // Extract user agent
    this.userAgent = this.headers['user-agent'];

    // Get cookies from event
    let cookies = this.app._event.cookies
      ? this.app._event.cookies
      : this.headers.cookie
      ? this.headers.cookie.split(';')
      : [];

    // Set and parse cookies
    this.cookies = cookies.reduce((acc, cookie) => {
      cookie = cookie.trim().split('=');
      return Object.assign(acc, {
        [cookie[0]]: UTILS.parseBody(decodeURIComponent(cookie[1])),
      });
    }, {});

    // Attempt to parse the auth
    this.auth = UTILS.parseAuth(this.headers.authorization);

    // Set the requestContext
    this.requestContext = this.app._event.requestContext || {};

    // Extract IP (w/ sourceIp fallback)
    this.ip =
      (this.headers['x-forwarded-for'] &&
        this.headers['x-forwarded-for'].split(',')[0].trim()) ||
      (this.requestContext['identity'] &&
        this.requestContext['identity']['sourceIp'] &&
        this.requestContext['identity']['sourceIp'].split(',')[0].trim());

    // Assign the requesting interface
    this.interface = this.requestContext.elb ? 'alb' : 'apigateway';

    // Set the pathParameters
    this.params = this.pathParameters = this.app._event.pathParameters || {};

    // Set the stageVariables
    this.stageVariables = this.app._event.stageVariables || {};

    // Set the isBase64Encoded
    this.isBase64Encoded = this.app._event.isBase64Encoded || false;

    // Add context
    this.context =
      this.app._context && typeof this.app._context === 'object'
        ? this.app._context
        : {};

    // Parse id from context
    this.id = this.context.awsRequestId ? this.context.awsRequestId : null;

    // Determine client type
    this.clientType =
      this.headers['cloudfront-is-desktop-viewer'] === 'true'
        ? 'desktop'
        : this.headers['cloudfront-is-mobile-viewer'] === 'true'
        ? 'mobile'
        : this.headers['cloudfront-is-smarttv-viewer'] === 'true'
        ? 'tv'
        : this.headers['cloudfront-is-tablet-viewer'] === 'true'
        ? 'tablet'
        : 'unknown';

    // Parse country
    this.clientCountry = this.headers['cloudfront-viewer-country']
      ? this.headers['cloudfront-viewer-country'].toUpperCase()
      : 'unknown';

    // Capture the raw body
    this.rawBody = this.app._event.body;

    // Set the body (decode it if base64 encoded)
    this.body = this.app._event.isBase64Encoded
      ? Buffer.from(this.app._event.body || '', 'base64').toString()
      : this.app._event.body;

    // Set the body
    if (
      this.headers['content-type'] &&
      this.headers['content-type'].includes('application/x-www-form-urlencoded')
    ) {
      this.body = QS.parse(this.body);
    } else if (typeof this.body === 'object') {
      // Do nothing
    } else {
      this.body = UTILS.parseBody(this.body);
    }

    // Set the stack reporter
    this.stack = this.app._stack.map((x) =>
      x.name.trim() !== '' ? x.name : 'unnamed'
    );

    // Reference to sample rule
    this._sampleRule = {};

    // Enable sampling
    this._sample = LOGGER.sampler(this.app, this);
  } // end parseRequest

  // Main logger
  logger(...args) {
    this.app._logger.level !== 'none' &&
      this.app._logLevels[args[0]] >=
        this.app._logLevels[
          this._sample ? this._sample : this.app._logger.level
        ] &&
      this._logs.push(this.app._logger.log(...args));
  }
} // end REQUEST class

// Export the response object
module.exports = REQUEST;
