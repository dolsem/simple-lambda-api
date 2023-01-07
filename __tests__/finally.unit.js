'use strict';

const { API } = require('..');

// Init API instance
const api = new API({ version: 'v1.0' });

// Simulate database module
const fakeDatabase = { connected: true }

// NOTE: Set test to true
api._test = true;

let event = {
  httpMethod: 'get',
  path: '/test',
  body: {},
  multiValueHeaders: {
    'Content-Type': 'application/json'
  }
}

api.handle(function(req,res) {
  res.status(200).json({
    method: 'get',
    status: 'ok',
    connected: fakeDatabase.connected.toString()
  })
})

/******************************************************************************/
/***  DEFINE FINALLY METHOD                                                 ***/
/******************************************************************************/
api.finally(function(req,res) {
  fakeDatabase.connected = false
})

/******************************************************************************/
/***  BEGIN TESTS                                                           ***/
/******************************************************************************/

describe('Finally Tests:', function() {

  it('Connected on first execution and after callback', async function() {
    let _event = Object.assign({},event,{})
    let result = await api.run(_event,{})
    expect(result).toEqual({ multiValueHeaders: { 'content-type': ['application/json'] }, statusCode: 200, body: '{"method":"get","status":"ok","connected":"true"}', isBase64Encoded: false })
  }) // end it

  it('Disconnected on second execution', async function() {
    let _event = Object.assign({},event,{})
    let result = await api.run(_event,{})
    expect(result).toEqual({ multiValueHeaders: { 'content-type': ['application/json'] }, statusCode: 200, body: '{"method":"get","status":"ok","connected":"false"}', isBase64Encoded: false })
  }) // end it

}) // end FINALLY tests
