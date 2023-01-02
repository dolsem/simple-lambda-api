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

describe('Context Tests:', function() {

  it('Parse ID and context object', async function() {
    const api = createApi().handler(function(req,res) {
      res.send({
        id: req.id,
        context: req.context
      })
    });

    let _event = Object.assign({},event,{ path: '/'})
    let result = await api.run(_event,{
      functionName: 'testFunction',
      awsRequestId: '1234',
      log_group_name: 'testLogGroup',
      log_stream_name: 'testLogStream',
      clientContext: {},
      identity: { cognitoIdentityId: 321 }
    })
    expect(result).toEqual({
      multiValueHeaders: { 'content-type': ['application/json'] },
      statusCode: 200,
      body: '{"id":"1234","context":{"functionName":"testFunction","awsRequestId":"1234","log_group_name":"testLogGroup","log_stream_name":"testLogStream","clientContext":{},"identity":{"cognitoIdentityId":321}}}',
      isBase64Encoded: false })
  }) // end it

}) // end ERROR HANDLING tests
