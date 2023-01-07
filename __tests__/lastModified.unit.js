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
    'content-type': ['application/json']
  }
}

/******************************************************************************/
/***  BEGIN TESTS                                                           ***/
/******************************************************************************/

describe('modified Tests:', function() {

  it('modified (no options)', async function() {
    const api = createApi().handle(function(req,res) {
      res.modified().send('cache')
    });

    let _event = Object.assign({},event,{ path: '/modified' })
    let result = await api.run(_event,{})
    expect(result).toEqual({
      multiValueHeaders: {
        'content-type': ['application/json'],
        'last-modified': result.multiValueHeaders['last-modified']
      },
      statusCode: 200,
      body: 'cache',
      isBase64Encoded: false
    })
    expect(typeof result.multiValueHeaders['last-modified']).toBe('object')
    // expect(typeof result.multiValueHeaders['last-modified']).to.not.be.empty
  }) // end it

  it('modified (true)', async function() {
    const api = createApi().handle(function(req,res) {
      res.modified(true).send('cache')
    });

    let _event = Object.assign({},event,{ path: '/modifiedTrue' })
    let result = await api.run(_event,{})
    expect(result).toEqual({
      multiValueHeaders: {
        'content-type': ['application/json'],
        'last-modified': result.multiValueHeaders['last-modified']
      },
      statusCode: 200,
      body: 'cache',
      isBase64Encoded: false
    })
    expect(typeof result.multiValueHeaders['last-modified']).toBe('object')
    // expect(typeof result.multiValueHeaders['last-modified']).to.not.be.empty
  }) // end it

  it('modified (false)', async function() {
    const api = createApi().handle(function(req,res) {
      res.modified(false).send('cache')
    });

    let _event = Object.assign({},event,{ path: '/modifiedFalse' })
    let result = await api.run(_event,{})
    expect(result).toEqual({
      multiValueHeaders: {
        'content-type': ['application/json']
      },
      statusCode: 200,
      body: 'cache',
      isBase64Encoded: false
    })
  }) // end it

  it('modified (date)', async function() {
    const api = createApi().handle(function(req,res) {
      res.modified(new Date('2018-08-01')).send('cache')
    });

    let _event = Object.assign({},event,{ path: '/modifiedDate' })
    let result = await api.run(_event,{})
    expect(result).toEqual({
      multiValueHeaders: {
        'content-type': ['application/json'],
        'last-modified': ['Wed, 01 Aug 2018 00:00:00 GMT']
      },
      statusCode: 200,
      body: 'cache',
      isBase64Encoded: false
    })
  }) // end it

  it('modified (string)', async function() {
    const api = createApi().handle(function(req,res) {
      res.modified('2018-08-01').send('cache')
    });

    let _event = Object.assign({},event,{ path: '/modifiedString' })
    let result = await api.run(_event,{})
    expect(result).toEqual({
      multiValueHeaders: {
        'content-type': ['application/json'],
        'last-modified': ['Wed, 01 Aug 2018 00:00:00 GMT']
      },
      statusCode: 200,
      body: 'cache',
      isBase64Encoded: false
    })

  }) // end it

  it('modified (invalid date)', async function() {
    const api = createApi().handle(function(req,res) {
      res.modified('test').send('cache')
    });

    let _event = Object.assign({},event,{ path: '/modifiedBadString' })
    let result = await api.run(_event,{})
    expect(result).toEqual({
      multiValueHeaders: {
        'content-type': ['application/json'],
        'last-modified': result.multiValueHeaders['last-modified']
      },
      statusCode: 200,
      body: 'cache',
      isBase64Encoded: false
    })
    expect(new Date(result.multiValueHeaders['last-modified']).getTime()).toBeGreaterThan(new Date('2018-08-02').getTime())

  }) // end it

}) // end lastModified tests
