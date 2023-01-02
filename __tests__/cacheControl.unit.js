'use strict';

const { API } = require('..');

// Init API instance
const createApi = () => {
  const api = new API({ version: 'v1.0' });
  // NOTE: Set test to true
  api._test = true;
  return api;
};

let event = {
  httpMethod: 'get',
  path: '/test',
  body: {},
  multiValueHeaders: {
    'Content-Type': ['application/json']
  }
}

/******************************************************************************/
/***  BEGIN TESTS                                                           ***/
/******************************************************************************/

describe('cacheControl Tests:', function() {

  it('Basic cacheControl (no options)', async function() {
    const api = createApi().handle(function(req,res) {
      res.cache().send('cache')
    });

    let _event = Object.assign({},event,{ path: '/cache' })
    let result = await api.run(_event,{})
    expect(result).toEqual({
      multiValueHeaders: {
        'content-type': ['application/json'],
        'cache-control': ['max-age=0'],
        'expires': result.multiValueHeaders.expires
      },
      statusCode: 200,
      body: 'cache',
      isBase64Encoded: false
    })
  }) // end it

  it('Basic cacheControl (true)', async function() {
    const api = createApi().handle(function(req,res) {
      res.cache(true).send('cache')
    });

    let _event = Object.assign({},event,{ path: '/cacheTrue' })
    let result = await api.run(_event,{})
    expect(result).toEqual({
      multiValueHeaders: {
        'content-type': ['application/json'],
        'cache-control': ['max-age=0'],
        'expires': result.multiValueHeaders.expires
      },
      statusCode: 200,
      body: 'cache',
      isBase64Encoded: false
    })
  }) // end it

  it('Basic cacheControl (false)', async function() {
    const api = createApi().handle(function(req,res) {
      res.cache(false).send('cache')
    });

    let _event = Object.assign({},event,{ path: '/cacheFalse' })
    let result = await api.run(_event,{})
    expect(result).toEqual({
      multiValueHeaders: {
        'content-type': ['application/json'],
        'cache-control': ['no-cache, no-store, must-revalidate']
      },
      statusCode: 200,
      body: 'cache',
      isBase64Encoded: false
    })
  }) // end it

  it('Basic cacheControl (maxAge)', async function() {
    const api = createApi().handle(function(req,res) {
      res.cache(1000).send('cache')
    });

    let _event = Object.assign({},event,{ path: '/cacheMaxAge' })
    let result = await api.run(_event,{})
    expect(result).toEqual({
      multiValueHeaders: {
        'content-type': ['application/json'],
        'cache-control': ['max-age=1'],
        'expires': result.multiValueHeaders.expires
      },
      statusCode: 200,
      body: 'cache',
      isBase64Encoded: false
    })
  }) // end it

  it('Basic cacheControl (private)', async function() {
    const api = createApi().handle(function(req,res) {
      res.cache(1000,true).send('cache')
    });

    let _event = Object.assign({},event,{ path: '/cachePrivate' })
    let result = await api.run(_event,{})
    expect(result).toEqual({
      multiValueHeaders: {
        'content-type': ['application/json'],
        'cache-control': ['private, max-age=1'],
        'expires': result.multiValueHeaders.expires
      },
      statusCode: 200,
      body: 'cache',
      isBase64Encoded: false
    })
  }) // end it

  it('Basic cacheControl (disable private)', async function() {
    const api = createApi().handle(function(req,res) {
      res.cache(1000,false).send('cache')
    });

    let _event = Object.assign({},event,{ path: '/cachePrivateFalse' })
    let result = await api.run(_event,{})
    expect(result).toEqual({
      multiValueHeaders: {
        'content-type': ['application/json'],
        'cache-control': ['max-age=1'],
        'expires': result.multiValueHeaders.expires
      },
      statusCode: 200,
      body: 'cache',
      isBase64Encoded: false
    })
  }) // end it

  it('Basic cacheControl (invalid private value)', async function() {
    const api = createApi().handle(function(req,res) {
      res.cache(1000,'test').send('cache')
    });

    let _event = Object.assign({},event,{ path: '/cachePrivateInvalid' })
    let result = await api.run(_event,{})
    expect(result).toEqual({
      multiValueHeaders: {
        'content-type': ['application/json'],
        'cache-control': ['max-age=1'],
        'expires': result.multiValueHeaders.expires
      },
      statusCode: 200,
      body: 'cache',
      isBase64Encoded: false
    })
  }) // end it

  it('Basic cacheControl (undefined)', async function() {
    const api = createApi().handle(function(req,res) {
      res.cache(undefined).send('cache')
    });

    let _event = Object.assign({},event,{ path: '/cacheCustomUndefined' })
    let result = await api.run(_event,{})
    expect(result).toEqual({
      multiValueHeaders: {
        'content-type': ['application/json'],
        'cache-control': ['max-age=0'],
        'expires': result.multiValueHeaders.expires
      },
      statusCode: 200,
      body: 'cache',
      isBase64Encoded: false
    })
  }) // end it

  it('Basic cacheControl (null)', async function() {
    const api = createApi().handle(function(req,res) {
      res.cache(null).send('cache')
    });

    let _event = Object.assign({},event,{ path: '/cacheCustomNull' })
    let result = await api.run(_event,{})
    expect(result).toEqual({
      multiValueHeaders: {
        'content-type': ['application/json'],
        'cache-control': ['max-age=0'],
        'expires': result.multiValueHeaders.expires
      },
      statusCode: 200,
      body: 'cache',
      isBase64Encoded: false
    })
  }) // end it

  it('Custom cacheControl (string)', async function() {
    const api = createApi().handle(function(req,res) {
      res.cache('custom value').send('cache')
    });

    let _event = Object.assign({},event,{ path: '/cacheCustom' })
    let result = await api.run(_event,{})
    expect(result).toEqual({
      multiValueHeaders: {
        'content-type': ['application/json'],
        'cache-control': ['custom value']
      },
      statusCode: 200,
      body: 'cache',
      isBase64Encoded: false
    })
  }) // end it

}) // end UNIT tests
