'use strict';

const { API, ConfigurationError } = require('..');

// Init API instance
const api = new API({ version: 'v1.0' })
const api_error = new API({ version: 'v1.0' })
const api_without_handler = new API({ version: 'v1.0' })

// NOTE: Set test to true
api._test = true;
api_error._test = true;
api_without_handler._test = true;

let event = {
  httpMethod: 'get',
  path: '/test',
  body: {},
  multiValueHeaders: {
    'content-type': ['application/json']
  }
}

/******************************************************************************/
/***  DEFINE TEST ROUTE                                                     ***/
/******************************************************************************/

api.handler((req, res) => {
  if (req.path === '/') {
    res.status(200).json({
      method: 'get',
      status: 'ok'
    });
  } else if (req.path === '/test') {
    res.status(200).json({
      method: 'get',
      status: 'ok'
    });
  } else if (req.path === '/testError') {
    res.error(404,'some error');
  }
});

api_error.handler((req,res) => {
  throw new Error('some thrown error')
});

/******************************************************************************/
/***  BEGIN TESTS                                                           ***/
/******************************************************************************/

describe('Main handler Async/Await:', function() {

  it('With context object', async function() {
    let _event = Object.assign({},event,{})
    let result = await api.run(_event,{})
    expect(result).toEqual({ multiValueHeaders: { 'content-type': ['application/json'] }, statusCode: 200, body: '{"method":"get","status":"ok"}', isBase64Encoded: false })
  }) // end it

  it('Without context object', async function() {
    let _event = Object.assign({},event,{})
    let result = await api.run(_event)
    expect(result).toEqual({ multiValueHeaders: { 'content-type': ['application/json'] }, statusCode: 200, body: '{"method":"get","status":"ok"}', isBase64Encoded: false })
  }) // end it

  it('With callback', async function() {
    let _event = Object.assign({},event,{})
    let result = await api.run(_event,{},(err,res) => {})
    expect(result).toEqual({ multiValueHeaders: { 'content-type': ['application/json'] }, statusCode: 200, body: '{"method":"get","status":"ok"}', isBase64Encoded: false })
  }) // end it

  it('Triggered Error', async function() {
    let _event = Object.assign({},event,{ path: '/testError' })
    let result = await api.run(_event,{})
    expect(result).toEqual({ multiValueHeaders: { 'content-type': ['application/json'] }, statusCode: 404, body: '{"error":"some error"}', isBase64Encoded: false })
  }) // end it

  it('Thrown Error', async function() {
    let _event = Object.assign({},event,{ path: '/testErrorThrown' })
    let result = await api_error.run(_event,{})
    expect(result).toEqual({ multiValueHeaders: { 'content-type': ['application/json'] }, statusCode: 500, body: '{"error":"some thrown error"}', isBase64Encoded: false })
  }) // end it

  it('Without handler', async function() {
    let _event = Object.assign({},event,{ path: '/testRoute' })
    expect(api_without_handler.run(_event,{})).rejects.toEqual(new ConfigurationError('No handler or middleware specified.'));
  }) // end it

  // TODO: uncomment
  // it('Without event', async function() {
  //   let _event = {}
  //   let result = await api.run(_event,{})
  //   expect(result).toEqual({ headers: { 'content-type': 'application/json' }, statusCode: 405, body: '{"error":"Method not allowed"}', isBase64Encoded: false })
  // }) // end it

  // it('With undefined event', async function() {
  //   let _event = undefined
  //   let result = await api.run(_event,{})
  //   expect(result).toEqual({ headers: { 'content-type': 'application/json' }, statusCode: 405, body: '{"error":"Method not allowed"}', isBase64Encoded: false })
  // }) // end it

  // it('With null event', async function() {
  //   let _event = null
  //   let result = await api.run(_event,{})
  //   expect(result).toEqual({ headers: { 'content-type': 'application/json' }, statusCode: 405, body: '{"error":"Method not allowed"}', isBase64Encoded: false })
  // }) // end it


}) // end tests
