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

describe('Cookie Tests:', function() {

  describe("Set", function() {
    it('Basic Session Cookie', async function() {
      const api = createApi().handle(function(req,res) {
        res.cookie('test','value').send({})
      });

      let _event = Object.assign({},event,{ path: '/cookie' })
      let result = await api.run(_event,{})
      expect(result).toEqual({
        multiValueHeaders: {
          'content-type': ['application/json'],
          'set-cookie': ['test=value; Path=/']
        }, statusCode: 200, body: '{}', isBase64Encoded: false
      })
    }) // end it

    it('Basic Session Cookie (multi-header)', async function() {
      const api = createApi().handle(function(req,res) {
        res.cookie('test','value').cookie('test2','value2').send({})
      });

      let _event = Object.assign({},event,{ path: '/cookieMultiple' })
      let result = await api.run(_event,{})
      expect(result).toEqual({
        multiValueHeaders: {
          'content-type': ['application/json'],
          'set-cookie': ['test=value; Path=/','test2=value2; Path=/']
        }, statusCode: 200, body: '{}', isBase64Encoded: false
      })
    }) // end it

    it('Basic Session Cookie (encoded value)', async function() {
      const api = createApi().handle(function(req,res) {
        res.cookie('test','http:// [] foo;bar').send({})
      });

      let _event = Object.assign({},event,{ path: '/cookieEncoded' })
      let result = await api.run(_event,{})
      expect(result).toEqual({
        multiValueHeaders: {
          'content-type': ['application/json'],
          'set-cookie': ['test=http%3A%2F%2F%20%5B%5D%20foo%3Bbar; Path=/']
        }, statusCode: 200, body: '{}', isBase64Encoded: false
      })
    }) // end it


    it('Basic Session Cookie (object value)', async function() {
      const api = createApi().handle(function(req,res) {
        res.cookie('test',{ foo: "bar" }).send({})
      });

      let _event = Object.assign({},event,{ path: '/cookieObject' })
      let result = await api.run(_event,{})
      expect(result).toEqual({
        multiValueHeaders: {
          'content-type': ['application/json'],
          'set-cookie': ['test=%7B%22foo%22%3A%22bar%22%7D; Path=/']
        }, statusCode: 200, body: '{}', isBase64Encoded: false
      })
    }) // end it


    it('Basic Session Cookie (non-string name)', async function() {
      const api = createApi().handle(function(req,res) {
        res.cookie(123,'value').send({})
      });

      let _event = Object.assign({},event,{ path: '/cookieNonString' })
      let result = await api.run(_event,{})
      expect(result).toEqual({
        multiValueHeaders: {
          'content-type': ['application/json'],
          'set-cookie': ['123=value; Path=/']
        }, statusCode: 200, body: '{}', isBase64Encoded: false
      })
    }) // end it


    it('Permanent Cookie (set expires)', async function() {
      const api = createApi().handle(function(req,res) {
        res.cookie('test','value', { expires: new Date('January 1, 2019 00:00:00 GMT') }).send({})
      });

      let _event = Object.assign({},event,{ path: '/cookieExpire' })
      let result = await api.run(_event,{})
      expect(result).toEqual({
        multiValueHeaders: {
          'content-type': ['application/json'],
          'set-cookie': ['test=value; Expires=Tue, 01 Jan 2019 00:00:00 GMT; Path=/']
        }, statusCode: 200, body: '{}', isBase64Encoded: false
      })
    }) // end it

    it('Permanent Cookie (set maxAge)', async function() {
      const api = createApi().handle(function(req,res) {
        res.cookie('test','value', { maxAge: 60*60*1000 }).send({})
      });

      let _event = Object.assign({},event,{ path: '/cookieMaxAge' })
      let result = await api.run(_event,{})
      expect(result).toEqual({
        multiValueHeaders: {
          'content-type': ['application/json'],
          'set-cookie': ['test=value; MaxAge=3600; Expires='+ new Date(Date.now()+3600000).toUTCString() + '; Path=/']
        }, statusCode: 200, body: '{}', isBase64Encoded: false
      })
    }) // end it

    it('Permanent Cookie (set domain)', async function() {
      const api = createApi().handle(function(req,res) {
        res.cookie('test','value', {
          domain: 'test.com',
          expires: new Date('January 1, 2019 00:00:00 GMT')
        }).send({})
      });

      let _event = Object.assign({},event,{ path: '/cookieDomain' })
      let result = await api.run(_event,{})
      expect(result).toEqual({
        multiValueHeaders: {
          'content-type': ['application/json'],
          'set-cookie': ['test=value; Domain=test.com; Expires=Tue, 01 Jan 2019 00:00:00 GMT; Path=/']
        }, statusCode: 200, body: '{}', isBase64Encoded: false
      })
    }) // end it

    it('Permanent Cookie (set httpOnly)', async function() {
      const api = createApi().handle(function(req,res) {
        res.cookie('test','value', {
          domain: 'test.com',
          httpOnly: true,
          expires: new Date('January 1, 2019 00:00:00 GMT')
        }).send({})
      });

      let _event = Object.assign({},event,{ path: '/cookieHttpOnly' })
      let result = await api.run(_event,{})
      expect(result).toEqual({
        multiValueHeaders: {
          'content-type': ['application/json'],
          'set-cookie': ['test=value; Domain=test.com; Expires=Tue, 01 Jan 2019 00:00:00 GMT; HttpOnly; Path=/']
        }, statusCode: 200, body: '{}', isBase64Encoded: false
      })
    }) // end it

    it('Permanent Cookie (set secure)', async function() {
      const api = createApi().handle(function(req,res) {
        res.cookie('test','value', {
          domain: 'test.com',
          secure: true,
          expires: new Date('January 1, 2019 00:00:00 GMT')
        }).send({})
      });

      let _event = Object.assign({},event,{ path: '/cookieSecure' })
      let result = await api.run(_event,{})
      expect(result).toEqual({
        multiValueHeaders: {
          'content-type': ['application/json'],
          'set-cookie': ['test=value; Domain=test.com; Expires=Tue, 01 Jan 2019 00:00:00 GMT; Path=/; Secure']
        }, statusCode: 200, body: '{}', isBase64Encoded: false
      })
    }) // end it

    it('Permanent Cookie (set path)', async function() {
      const api = createApi().handle(function(req,res) {
        res.cookie('test','value', {
          domain: 'test.com',
          secure: true,
          path: '/test',
          expires: new Date('January 1, 2019 00:00:00 GMT')
        }).send({})
      });

      let _event = Object.assign({},event,{ path: '/cookiePath' })
      let result = await api.run(_event,{})
      expect(result).toEqual({
        multiValueHeaders: {
          'content-type': ['application/json'],
          'set-cookie': ['test=value; Domain=test.com; Expires=Tue, 01 Jan 2019 00:00:00 GMT; Path=/test; Secure']
        }, statusCode: 200, body: '{}', isBase64Encoded: false
      })
    }) // end it

    it('Permanent Cookie (set sameSite - true)', async function() {
      const api = createApi().handle(function(req,res) {
        res.cookie('test','value', {
          domain: 'test.com',
          sameSite: true,
          expires: new Date('January 1, 2019 00:00:00 GMT')
        }).send({})
      });

      let _event = Object.assign({},event,{ path: '/cookieSameSiteTrue' })
      let result = await api.run(_event,{})
      expect(result).toEqual({
        multiValueHeaders: {
          'content-type': ['application/json'],
          'set-cookie': ['test=value; Domain=test.com; Expires=Tue, 01 Jan 2019 00:00:00 GMT; Path=/; SameSite=Strict']
        }, statusCode: 200, body: '{}', isBase64Encoded: false
      })
    }) // end it

    it('Permanent Cookie (set sameSite - false)', async function() {
      const api = createApi().handle(function(req,res) {
        res.cookie('test','value', {
          domain: 'test.com',
          sameSite: false,
          expires: new Date('January 1, 2019 00:00:00 GMT')
        }).send({})
      });

      let _event = Object.assign({},event,{ path: '/cookieSameSiteFalse' })
      let result = await api.run(_event,{})
      expect(result).toEqual({
        multiValueHeaders: {
          'content-type': ['application/json'],
          'set-cookie': ['test=value; Domain=test.com; Expires=Tue, 01 Jan 2019 00:00:00 GMT; Path=/; SameSite=Lax']
        }, statusCode: 200, body: '{}', isBase64Encoded: false
      })
    }) // end it

    it('Permanent Cookie (set sameSite - string)', async function() {
      const api = createApi().handle(function(req,res) {
        res.cookie('test','value', {
          domain: 'test.com',
          sameSite: 'Test',
          expires: new Date('January 1, 2019 00:00:00 GMT')
        }).send({})
      });

      let _event = Object.assign({},event,{ path: '/cookieSameSiteString' })
      let result = await api.run(_event,{})
      expect(result).toEqual({
        multiValueHeaders: {
          'content-type': ['application/json'],
          'set-cookie': ['test=value; Domain=test.com; Expires=Tue, 01 Jan 2019 00:00:00 GMT; Path=/; SameSite=Test']
        }, statusCode: 200, body: '{}', isBase64Encoded: false
      })
    }) // end it

  }) // end set tests


  describe("Parse", function() {
    const api = createApi().handle(function(req,res) {
      res.send({ cookies: req.cookies })
    });

    it('Parse single cookie', async function() {
      let _event = Object.assign({},event,{
        path: '/cookieParse',
        multiValueHeaders: {
          cookie: ["test=some%20value"]
        }
      })
      let result = await api.run(_event,{})
      expect(result).toEqual({
        multiValueHeaders: {
          'content-type': ['application/json'],
        }, statusCode: 200, body: '{"cookies":{"test":"some value"}}', isBase64Encoded: false
      })
    }) // end it

    it('Parse & decode two cookies', async function() {
      let _event = Object.assign({},event,{
        path: '/cookieParse',
        multiValueHeaders: {
          cookie: ["test=some%20value; test2=%7B%22foo%22%3A%22bar%22%7D"]
        }
      })
      let result = await api.run(_event,{})
      expect(result).toEqual({
        multiValueHeaders: {
          'content-type': ['application/json'],
        }, statusCode: 200, body: '{\"cookies\":{\"test\":\"some value\",\"test2\":{\"foo\":\"bar\"}}}', isBase64Encoded: false
      })
    }) // end it


    it('Parse & decode multiple cookies', async function() {
      let _event = Object.assign({},event,{
        path: '/cookieParse',
        multiValueHeaders: {
          cookie: ["test=some%20value; test2=%7B%22foo%22%3A%22bar%22%7D; test3=domain"]
        }
      })
      let result = await api.run(_event,{})
      expect(result).toEqual({
        multiValueHeaders: {
          'content-type': ['application/json'],
        }, statusCode: 200, body: '{\"cookies\":{\"test\":\"some value\",\"test2\":{\"foo\":\"bar\"},\"test3\":\"domain\"}}', isBase64Encoded: false
      })
    }) // end it

  }) // end parse tests

  describe("Clear", function() {

    it('Clear cookie (no options)', async function() {
      const api = createApi().handle(function(req,res) {
        res.clearCookie('test').send({})
      });

      let _event = Object.assign({},event,{
        path: '/cookieClear'
      })
      let result = await api.run(_event,{})
      expect(result).toEqual({
        multiValueHeaders: {
          'content-type': ['application/json'],
          'set-cookie': ['test=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; MaxAge=-1; Path=/']
        }, statusCode: 200, body: '{}', isBase64Encoded: false
      })
    }) // end it

    it('Clear cookie (w/ options)', async function() {
      const api = createApi().handle(function(req,res) {
        res.clearCookie('test', { domain: 'test.com', httpOnly: true, secure: true }).send({})
      });

      let _event = Object.assign({},event,{
        path: '/cookieClearOptions'
      })
      let result = await api.run(_event,{})
      expect(result).toEqual({
        multiValueHeaders: {
          'content-type': ['application/json'],
          'set-cookie': ['test=; Domain=test.com; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; MaxAge=-1; Path=/; Secure']
        }, statusCode: 200, body: '{}', isBase64Encoded: false
      })
    }) // end it

  }) // end Clear tests

}) // end COOKIE tests
