'use strict';

const delay = ms => new Promise(res => setTimeout(res, ms))

const { gzipSync } = require('zlib')

const { API } = require('..');

class CustomError extends Error {
  constructor(message,code) {
    super(message)
    this.name = this.constructor.name
    this.code = code
  }
}

let event = {
  httpMethod: 'get',
  path: '/test',
  body: {},
  multiValueHeaders: {
    'content-type': ['application/json']
  }
}

/******************************************************************************/
/***  DEFINE TEST MIDDLEWARE & ERRORS                                       ***/
/******************************************************************************/

const createApi1 = () => {
  const api = new API({ version: 'v1.0' });

  api.use(function(req,res,next) {
    req.testMiddleware = '123'
    next()
  });
  
  api.handleErrors(function(err,req,res,next) {
    req.testError1 = '123'
    next()
  });
  
  api.handleErrors(function(err,req,res,next) {
    req.testError2 = '456'
    if (req.path === '/testErrorMiddleware') {
      res.header('Content-Type','text/plain')
      res.send('This is a test error message: ' + req.testError1 + '/' + req.testError2)
    } else {
      next()
    }
  });
  
  // Add error with promise/delay
  api.handleErrors(function(err,req,res,next) {
    if (req.path === '/testErrorPromise') {
      let start = Date.now()
      // TODO: shouldn't have to use return
      return delay(100).then((x) => {
        res.header('Content-Type','text/plain')
        res.send('This is a test error message: ' + req.testError1 + '/' + req.testError2)
      })
    } else {
      next()
    }
  });

  return api;
};

const errorMiddleware1 = (err,req,res,next) => {
  req.errorMiddleware1 = true
  next()
}

const errorMiddleware2 = (err,req,res,next) => {
  req.errorMiddleware2 = true
  next()
}

const sendError = (err,req,res,next) => {
  res.type('text/plain').send('This is a test error message: ' + req.errorMiddleware1 + '/' + req.errorMiddleware2)
}

const createApi2 = () => {
  const api = new API({ version: 'v1.0' });

  api.handleErrors(errorMiddleware1,errorMiddleware2,sendError)

  return api;
};

const returnError = (err,req,res,next) => {
  return 'this is an error: ' + (req.errorMiddleware1 ? true : false)
}

const createApi3 = () => {
  const api = new API({ version: 'v1.0' });

  api.handleErrors(returnError,errorMiddleware1)

  return api;
};

const callError = (err,req,res,next) => {
  res.status(500).send('this is an error: ' + (req.errorMiddleware1 ? true : false))
  next()
}

const createApi4 = () => {
  const api = new API({ version: 'v1.0' });

  api.handleErrors(callError,errorMiddleware1)

  return api;
};

const createApi5 = () => {
  const api = new API({ version: 'v1.0', logger: { access: 'never' }});

  api.handleErrors((err,req,res,next) => {
    if (err instanceof CustomError) {
      res.status(401)
    }
    next()
  })

  return api;
};

const createApiErrors = () => {
  const api = new API({ version: 'v1.0' });

  api.handleErrors(function(err,req,res,next) {
    res.send({ errorType: err.name })
  });

  return api;
};

const createApi6 = () => new API() // no props
const createApi7 = () => new API({ version: 'v1.0', logger: { errorLogging: false }})
const createApi8 = () => new API({ version: 'v1.0', logger: { access: 'never', errorLogging: true }})
const createApi9 = () => new API({
  // Init API with custom gzip serializer and base64
  version: 'v1.0',
  isBase64: true,
  headers: {
    'content-encoding': ['gzip']
  },
  serializer: body => {
    const json = JSON.stringify(Object.assign(body,{ _custom: true, _base64: true }))
    return gzipSync(json).toString('base64')
  }
})

/******************************************************************************/
/***  BEGIN TESTS                                                           ***/
/******************************************************************************/

describe('Error Handling Tests:', function() {
  // this.slow(300);

  describe('Standard', function() {

    it('Called Error', async function() {
      const api = createApi1().handler(function(req,res) {
        res.error('This is a test error message')
      });

      let _event = Object.assign({},event,{ path: '/testError'})
      let result = await api.run(_event,{});
      expect(result).toEqual({ multiValueHeaders: { 'content-type': ['application/json'] }, statusCode: 500, body: '{"error":"This is a test error message"}', isBase64Encoded: false })
    }) // end it

    it('Thrown Error', async function() {
      const api = createApi1().handler(function(req,res) {
        throw new Error('This is a test thrown error')
      });

      let _event = Object.assign({},event,{ path: '/testErrorThrow'})
      let result = await api.run(_event,{});
      expect(result).toEqual({ multiValueHeaders: { 'content-type': ['application/json'] }, statusCode: 500, body: '{"error":"This is a test thrown error"}', isBase64Encoded: false })
    }) // end it

    it('Simulated Error', async function() {
      const api = createApi1().handler(function(req,res) {
        res.status(405)
        res.json({ error: 'This is a simulated error' })
      });

      let _event = Object.assign({},event,{ path: '/testErrorSimulated'})
      let result = await api.run(_event,{});
      expect(result).toEqual({ multiValueHeaders: { 'content-type': ['application/json'] }, statusCode: 405, body: '{"error":"This is a simulated error"}', isBase64Encoded: false })
    }) // end it

  })

  describe('Middleware', function() {

    it('Error Middleware', async function() {
      const api = createApi1().handler(function(req,res) {
        res.error('This test error message should be overridden')
      });

      let _event = Object.assign({},event,{ path: '/testErrorMiddleware'})
      let result = await api.run(_event,{});
      expect(result).toEqual({ multiValueHeaders: { 'content-type': ['text/plain'] }, statusCode: 500, body: 'This is a test error message: 123/456', isBase64Encoded: false })
    }) // end it

    it.only('Error Middleware w/ Promise', async function() {
      const api = createApi1().handler(function(req,res) {
        res.error('This is a test error message')
      });

      let _event = Object.assign({},event,{ path: '/testErrorPromise'})
      let result = await api.run(_event,{});
      expect(result).toEqual({ multiValueHeaders: { 'content-type': ['text/plain'] }, statusCode: 500, body: 'This is a test error message: 123/456', isBase64Encoded: false })
    }) // end it

    it('Multiple error middlewares', async function() {
      const api2 = createApi2().handler(function(req,res) {
        res.status(500)
        res.error('This is a test error message')
      });

      let _event = Object.assign({},event,{ path: '/testError'})
      let result = await api2.run(_event,{});
      expect(result).toEqual({ multiValueHeaders: { 'content-type': ['text/plain'] }, statusCode: 500, body: 'This is a test error message: true/true', isBase64Encoded: false })
    }) // end it

    it('Returned error from middleware (async)', async function() {
      const api3 = createApi3().handler(function(req,res) {
        res.error('This is a test error message')
      });

      let _event = Object.assign({},event,{ path: '/testError'})
      let result = await api3.run(_event,{});
      expect(result).toEqual({ multiValueHeaders: { }, statusCode: 500, body: 'this is an error: false', isBase64Encoded: false })
    }) // end it

    it('Returned error from middleware (callback)', async function() {
      const api4 = createApi4().handler(function(req,res) {
        res.error(403,'This is a test error message')
      });

      let _event = Object.assign({},event,{ path: '/testError'})
      let result = await api4.run(_event,{});
      expect(result).toEqual({ multiValueHeaders: { }, statusCode: 500, body: 'this is an error: false', isBase64Encoded: false })
    }) // end it
  })

  describe('Error Types', function() {
    it('FileError (s3)', async function() {
      const api_errors = createApiErrors().handler((req,res) => {
        res.sendFile('s3://test')
      });

      let _event = Object.assign({},event,{ path: '/fileError' })
      let result = await api_errors.run(_event,{});
      expect(result).toEqual({ multiValueHeaders: { }, statusCode: 500, body: '{"errorType":"FileError"}', isBase64Encoded: false })
    }) // end it

    it('FileError (local)', async function() {
      const api_errors = createApiErrors().handler((req,res) => {
        res.sendFile('./missing.txt')
      });

      let _event = Object.assign({},event,{ path: '/fileErrorLocal' })
      let result = await api_errors.run(_event,{});
      expect(result).toEqual({ multiValueHeaders: { }, statusCode: 500, body: '{"errorType":"FileError"}', isBase64Encoded: false })
    }) // end it

    it('FileError.name', async function() {
      let Error$1 = errors.FileError
      let error = new Error$1('This is a test error')
      expect(error.name).toEqual('FileError')
    }) // end it

    it('ResponseError', async function() {
      const api_errors = createApiErrors().handler((req,res) => {
        res.redirect(310,'http://www.google.com')
      });

      let _event = Object.assign({},event,{ path: '/responseError' })
      let result = await api_errors.run(_event,{});
      expect(result).toEqual({ multiValueHeaders: { }, statusCode: 500, body: '{"errorType":"ResponseError"}', isBase64Encoded: false })
    }) // end it

    it('ResponseError.name', async function() {
      let Error$1 = errors.ResponseError
      let error = new Error$1('This is a test error')
      expect(error.name).toEqual('ResponseError')
    }) // end it

    it('ConfigurationError.name', async function() {
      let Error$1 = errors.ConfigurationError
      let error = new Error$1('This is a test error')
      expect(error.name).toEqual('ConfigurationError')
    }) // end it
  })

  describe('Logging', function() {

    it('Thrown Error', async function() {
      const api5 = createApi5().handler(function(req,res) {
        throw new Error('This is a test thrown error')
      });

      let _log
      let _event = Object.assign({},event,{ path: '/testErrorThrow'})
      let logger = console.log
      console.log = log => { try { _log = JSON.parse(log) } catch(e) { _log = log } }
      let result = await api5.run(_event,{});
      console.log = logger
      expect(result).toEqual({ multiValueHeaders: { 'content-type': ['application/json'] }, statusCode: 500, body: '{"error":"This is a test thrown error"}', isBase64Encoded: false })
      expect(_log.level).toBe('fatal')
      expect(_log.msg).toBe('This is a test thrown error')
    }) // end it


    it('API Error', async function() {
      const api5 = createApi5().handler(function(req,res) {
        res.error('This is a test error message')
      });

      let _log
      let _event = Object.assign({},event,{ path: '/testError'})
      let logger = console.log
      console.log = log => { try { _log = JSON.parse(log) } catch(e) { _log = log } }
      let result = await api5.run(_event,{});
      console.log = logger
      expect(result).toEqual({ multiValueHeaders: { 'content-type': ['application/json'] }, statusCode: 500, body: '{"error":"This is a test error message"}', isBase64Encoded: false })
      expect(_log.level).toBe('error')
      expect(_log.msg).toBe('This is a test error message')
    }) // end it

    it('Error with Detail', async function() {
      const api5 = createApi5().handler(function(req,res) {
        res.error('This is a test error message','details')
      });

      let _log
      let _event = Object.assign({},event,{ path: '/testErrorDetail'})
      let logger = console.log
      console.log = log => { try { _log = JSON.parse(log) } catch(e) { _log = log } }
      let result = await api5.run(_event,{});
      console.log = logger
      expect(result).toEqual({ multiValueHeaders: { 'content-type': ['application/json'] }, statusCode: 500, body: '{"error":"This is a test error message"}', isBase64Encoded: false })
      expect(_log.level).toBe('error')
      expect(_log.msg).toBe('This is a test error message')
      expect(_log.detail).toBe('details')
    }) // end it

    it('Custom Error', async function() {
      const api5 = createApi5().handler(function(req,res) {
        throw new CustomError('This is a custom error',403)
      });

      let _log
      let _event = Object.assign({},event,{ path: '/testErrorCustom'})
      let logger = console.log
      console.log = log => { try { _log = JSON.parse(log) } catch(e) { _log = log } }
      let result = await api5.run(_event,{});
      console.log = logger
      // console.log(JSON.stringify(_log,null,2));
      expect(result).toEqual({ multiValueHeaders: { 'content-type': ['application/json'] }, statusCode: 401, body: '{"error":"This is a custom error"}', isBase64Encoded: false })
      expect(_log.level).toBe('fatal')
      expect(_log.msg).toBe('This is a custom error')
    }) // end it


    it('Error, no props', async function() {
      const api6 = createApi6().handler(function(req,res) {
        res.error('This is a test error message')
      });

      let _log
      let _event = Object.assign({},event,{ path: '/testError'})
      let logger = console.log
      console.log = log => { try { _log = JSON.parse(log) } catch(e) { _log = log } }
      let result = await api6.run(_event,{});
      console.log = logger
      expect(result).toEqual({ multiValueHeaders: { 'content-type': ['application/json'] }, statusCode: 500, body: '{"error":"This is a test error message"}', isBase64Encoded: false })
    }) // end it

    it('Should not log error if option logger.errorLogging is false', async function() {
      const api7 = createApi7().handler(function(req,res) {
        throw new Error('This is a test thrown error')
      });
      
      let _log
      let _event = Object.assign({},event,{ path: '/testErrorThrow'})
      let logger = console.log
      console.log = log => { try { _log = JSON.parse(log) } catch(e) { _log = log } }
      let result = await api7.run(_event,{});
      console.log = logger
      expect(result).toEqual({ multiValueHeaders: { 'content-type': ['application/json'] }, statusCode: 500, body: '{"error":"This is a test thrown error"}', isBase64Encoded: false })
      expect(_log).toBe(undefined)
    })

    it('Should log error if option logger.errorLogging is true', async function() {
      const api8 = createApi8().handler(function(req,res) {
        throw new Error('This is a test thrown error')
      });
      
      let _log
      let _event = Object.assign({},event,{ path: '/testErrorThrow'})
      let logger = console.log
      console.log = log => { try { _log = JSON.parse(log) } catch(e) { _log = log } }
      let result = await api8.run(_event,{});
      console.log = logger
      expect(result).toEqual({ multiValueHeaders: { 'content-type': ['application/json'] }, statusCode: 500, body: '{"error":"This is a test thrown error"}', isBase64Encoded: false })
      expect(_log.level).toBe('fatal')
      expect(_log.msg).toBe('This is a test thrown error')
    })

  })

  describe('base64 errors', function() {
    it('Should return errors with base64 encoding', async function() {
      const api9 = createApi9().handler(function(req,res) {
        throw new Error('This is a test thrown error')
      });

      let _log
      let _event = Object.assign({},event,{ path: '/testErrorThrow'})
      let logger = console.log
      console.log = log => { try { _log = JSON.parse(log) } catch(e) { _log = log } }
      let result = await api9.run(_event,{});
      console.log = logger
      let body = gzipSync(`{"error":"This is a test thrown error","_custom":true,"_base64":true}`).toString('base64')
      expect(result).toEqual({ multiValueHeaders: { 'content-encoding': ['gzip'], 'content-type': ['application/json'] }, statusCode: 500, body, isBase64Encoded: true })
    })
  })
}) // end ERROR HANDLING tests
