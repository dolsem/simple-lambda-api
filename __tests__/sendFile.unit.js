'use strict';

const delay = ms => new Promise(res => setTimeout(res, ms))

const fs = require('fs') // Require Node.js file system

// Require Sinon.js library
const sinon = require('sinon')

const AWS = require('aws-sdk') // AWS SDK (automatically available in Lambda)
// AWS.config.credentials = new AWS.SharedIniFileCredentials({profile: 'madlucas'})

const S3 = require('../dist/lib/s3-service'); // Init S3 Service

const { API } = require('..');

const options = { version: 'v1.0', mimeTypes: { test: 'text/test' } };

let event = {
  httpMethod: 'get',
  path: '/',
  body: {},
  multiValueHeaders: {
    'content-type': ['application/json']
  }
}

// Error Middleware
const errorHandler = (err, req, res, next) => {
  // Set x-error header to test middleware execution
  res.header('x-error','true');
  next();
};

/******************************************************************************/
/***  BEGIN TESTS                                                           ***/
/******************************************************************************/

let stub

describe('SendFile Tests:', function() {

  beforeEach(function() {
     // Stub getObjectAsync
    stub = sinon.stub(S3,'getObject')
  })

  it('Bad path', async function() {
    const api = new API(options).catch(errorHandler).handle((req, res) => {
      res.sendFile();
    });
    let _event = Object.assign({},event,{ path: '/sendfile/badpath' })
    let result = await api.run(_event,{})
    expect(result).toEqual({ multiValueHeaders: { 'content-type': ['application/json'],'x-error': ['true'] }, statusCode: 500, body: '{"error":"Invalid file"}', isBase64Encoded: false })
  }) // end it

  it('Missing file', async function() {
    const api = new API(options).catch(errorHandler).handle((req, res) => {
      res.sendFile('./test-missing.txt')
    });
    let _event = Object.assign({},event,{ path: '/sendfile' })
    let result = await api.run(_event,{})
    expect(result).toEqual({ multiValueHeaders: { 'content-type': ['application/json'],'x-error': ['true'] }, statusCode: 500, body: '{"error":"No such file"}', isBase64Encoded: false })
  }) // end it

  it('Missing file with custom catch', async function() {
    const api = new API(options).catch(errorHandler).handle((req, res) => {
      res.sendFile('./test-missing.txt', err => {
        if (err) {
          res.error(404,'There was an error accessing the requested file')
        }
      })
    });
    let _event = Object.assign({},event,{ path: '/sendfile/err' })
    let result = await api.run(_event,{})
    expect(result).toEqual({ multiValueHeaders: { 'content-type': ['application/json'],'x-error': ['true'] }, statusCode: 404, body: '{"error":"There was an error accessing the requested file"}', isBase64Encoded: false })
  }) // end it

  describe('Text file w/ callback override (promise)', () => {
    const api = new API(options).catch(errorHandler).handle((req, res) => {
      // TODO: shouldn't need to return the promise
      return res.sendFile('__tests__/test.txt' + (req.query.test ? req.query.test : ''), err => {
        // Return a promise
        return delay(100).then((x) => {
          if (err) {
            // set custom error code and message on error
            res.error(501,'Custom File Error')
          } else {
            // else set custom response code
            res.status(201)
          }
        })
      })
    });
    
    it('correct', async () => {
      let _event = Object.assign({},event,{ path: '/sendfile/test' })
      let result = await api.run(_event,{})
      expect(result).toEqual({
        multiValueHeaders: {
          'content-type': ['text/plain'],
          'cache-control': ['max-age=0'],
          'expires': result.multiValueHeaders.expires,
          'last-modified': result.multiValueHeaders['last-modified']
        },
        statusCode: 201, body: 'VGVzdCBmaWxlIGZvciBzZW5kRmlsZQo=', isBase64Encoded: true
      })
    });

    it('error', async () => {
      let _event = Object.assign({},event,{ path: '/sendfile/test', queryStringParameters: { test: 'x' } })
      let result = await api.run(_event,{})
      expect(result).toEqual({ multiValueHeaders: { 'content-type': ['application/json'],'x-error': ['true'] }, statusCode: 501, body: '{"error":"Custom File Error"}', isBase64Encoded: false })
    });
  });

  it('Text file error w/ callback override (promise - no end)', async function() {
    const api = new API(options).catch(errorHandler).handle((req, res) => {
      // TODO: shouldn't need to return the promise
      return res.sendFile('__tests__/test.txtx', err => {
        // Return a promise
        return delay(100).then((x) => {
          if (err) {
            // log error
            return true
          }
        })
      });
    });
    let _event = Object.assign({},event,{ path: '/sendfile/error', queryStringParameters: { test: 'x' } })
    let result = await api.run(_event,{})
    expect(result).toEqual({ multiValueHeaders: { 'content-type': ['application/json'],'x-error': ['true'] }, statusCode: 500, body: result.body, isBase64Encoded: false })
  }) // end it

  it('Buffer Input', async function() {
    const api = new API(options).catch(errorHandler).handle((req, res) => {
      res.sendFile(fs.readFileSync('__tests__/test.txt'));
    });
    let _event = Object.assign({},event,{ path: '/sendfile/buffer' })
    let result = await api.run(_event,{})
    expect(result).toEqual({
      multiValueHeaders: {
        'content-type': ['application/json'],
        'cache-control': ['max-age=0'],
        'expires': result.multiValueHeaders.expires,
        'last-modified': result.multiValueHeaders['last-modified']
      }, statusCode: 200, body: 'VGVzdCBmaWxlIGZvciBzZW5kRmlsZQo=', isBase64Encoded: true
    })
  }) // end it

  it('Text file w/ headers', async function() {
    const api = new API(options).catch(errorHandler).handle((req, res) => {
      res.sendFile('__tests__/test.txt', {
        headers: { 'x-test': 'test', 'x-timestamp': 1 },
        private: false
      });
    });
    let _event = Object.assign({},event,{ path: '/sendfile/headers' })
    let result = await api.run(_event,{})
    expect(result).toEqual({
      multiValueHeaders: {
        'content-type': ['text/plain'],
        'x-test': ['test'],
        'x-timestamp': [1],
        'cache-control': ['max-age=0'],
        'expires': result.multiValueHeaders.expires,
        'last-modified': result.multiValueHeaders['last-modified']
      }, statusCode: 200, body: 'VGVzdCBmaWxlIGZvciBzZW5kRmlsZQo=', isBase64Encoded: true
    })
  }) // end it

  it('Text file w/ root path', async function() {
    const api = new API(options).catch(errorHandler).handle((req, res) => {
      res.sendFile('test.txt', { root: './__tests__/' });
    });
    let _event = Object.assign({},event,{ path: '/sendfile/root' })
    let result = await api.run(_event,{})
    expect(result).toEqual({
      multiValueHeaders: {
        'content-type': ['text/plain'],
        'cache-control': ['max-age=0'],
        'expires': result.multiValueHeaders.expires,
        'last-modified': result.multiValueHeaders['last-modified']
      }, statusCode: 200, body: 'VGVzdCBmaWxlIGZvciBzZW5kRmlsZQo=', isBase64Encoded: true
    })
  }) // end it

  it('Text file w/ headers (private cache)', async function() {
    const api = new API(options).catch(errorHandler).handle((req, res) => {
      res.sendFile('__tests__/test.txt', {
        headers: { 'x-test': 'test', 'x-timestamp': 1 },
        private: true
      });
    });
    let _event = Object.assign({},event,{ path: '/sendfile/headers-private' })
    let result = await api.run(_event,{})
    expect(result).toEqual({
      multiValueHeaders: {
        'content-type': ['text/plain'],
        'x-test': ['test'],
        'x-timestamp': [1],
        'cache-control': ['private, max-age=0'],
        'expires': result.multiValueHeaders.expires,
        'last-modified': result.multiValueHeaders['last-modified']
      }, statusCode: 200, body: 'VGVzdCBmaWxlIGZvciBzZW5kRmlsZQo=', isBase64Encoded: true
    })
  }) // end it

  it('Text file custom Last-Modified', async function() {
    const api = new API(options).catch(errorHandler).handle((req, res) => {
      res.sendFile('__tests__/test.txt', {
        lastModified: new Date('Fri, 1 Jan 2018 00:00:00 GMT')
      });
    });
    let _event = Object.assign({},event,{ path: '/sendfile/last-modified' })
    let result = await api.run(_event,{})
    expect(result).toEqual({
      multiValueHeaders: {
        'content-type': ['text/plain'],
        'cache-control': ['max-age=0'],
        'expires': result.multiValueHeaders.expires,
        'last-modified': ['Mon, 01 Jan 2018 00:00:00 GMT']
      }, statusCode: 200, body: 'VGVzdCBmaWxlIGZvciBzZW5kRmlsZQo=', isBase64Encoded: true
    })
  }) // end it


  it('Text file no Last-Modified', async function() {
    const api = new API(options).catch(errorHandler).handle((req, res) => {
      res.sendFile('__tests__/test.txt', {
        lastModified: false
      });
    });
    let _event = Object.assign({},event,{ path: '/sendfile/no-last-modified' })
    let result = await api.run(_event,{})
    expect(result).toEqual({
      multiValueHeaders: {
        'content-type': ['text/plain'],
        'cache-control': ['max-age=0'],
        'expires': result.multiValueHeaders.expires
      }, statusCode: 200, body: 'VGVzdCBmaWxlIGZvciBzZW5kRmlsZQo=', isBase64Encoded: true
    })
  }) // end it


  it('Text file no Cache-Control', async function() {
    const api = new API(options).catch(errorHandler).handle((req, res) => {
      res.sendFile('__tests__/test.txt', {
        cacheControl: false
      });
    });
    let _event = Object.assign({},event,{ path: '/sendfile/no-cache-control' })
    let result = await api.run(_event,{})
    expect(result).toEqual({
      multiValueHeaders: {
        'content-type': ['text/plain'],
        'last-modified': result.multiValueHeaders['last-modified']
      }, statusCode: 200, body: 'VGVzdCBmaWxlIGZvciBzZW5kRmlsZQo=', isBase64Encoded: true
    })
  }) // end it


  it('Text file custom Cache-Control', async function() {
    const api = new API(options).catch(errorHandler).handle((req, res) => {
      res.sendFile('__tests__/test.txt', {
        cacheControl: 'no-cache, no-store'
      });
    });
    let _event = Object.assign({},event,{ path: '/sendfile/custom-cache-control' })
    let result = await api.run(_event,{})
    expect(result).toEqual({
      multiValueHeaders: {
        'content-type': ['text/plain'],
        'cache-control': ['no-cache, no-store'],
        'last-modified': result.multiValueHeaders['last-modified']
      }, statusCode: 200, body: 'VGVzdCBmaWxlIGZvciBzZW5kRmlsZQo=', isBase64Encoded: true
    })
  }) // end it


  it('S3 file', async function() {
    const api = new API(options).catch(errorHandler).handle((req, res) => {
      stub.withArgs({Bucket: 'my-test-bucket', Key: 'test.txt'}).returns({
        promise: () => { return {
          AcceptRanges: 'bytes',
          LastModified: new Date('2018-04-01T13:32:58.000Z'),
          ContentLength: 23,
          ETag: '"ae771fbbba6a74eeeb77754355831713"',
          ContentType: 'text/plain',
          Metadata: {},
          Body: Buffer.from('Test file for sendFile\n')
        }}
      })
    
      res.sendFile('s3://my-test-bucket/test.txt')
    });
    let _event = Object.assign({},event,{ path: '/sendfile/s3' })
    let result = await api.run(_event,{})
    expect(result).toEqual({
      multiValueHeaders: {
        'content-type': ['text/plain'],
        'cache-control': ['max-age=0'],
        'expires': result.multiValueHeaders['expires'],
        'etag': ['"ae771fbbba6a74eeeb77754355831713"'],
        'last-modified': result.multiValueHeaders['last-modified']
      }, statusCode: 200, body: 'VGVzdCBmaWxlIGZvciBzZW5kRmlsZQo=', isBase64Encoded: true
    })
  }) // end it

  it('S3 file w/ nested path', async function() {
    const api = new API(options).catch(errorHandler).handle((req, res) => {
      stub.withArgs({Bucket: 'my-test-bucket', Key: 'test/test.txt'}).returns({
        promise: () => { return {
          AcceptRanges: 'bytes',
          LastModified: new Date('2018-04-01T13:32:58.000Z'),
          ContentLength: 23,
          ETag: '"ae771fbbba6a74eeeb77754355831713"',
          ContentType: 'text/plain',
          Metadata: {},
          Body: Buffer.from('Test file for sendFile\n')
        }}
      })
    
      res.sendFile('s3://my-test-bucket/test/test.txt')
    });
    let _event = Object.assign({},event,{ path: '/sendfile/s3path' })
    let result = await api.run(_event,{})
    expect(result).toEqual({
      multiValueHeaders: {
        'content-type': ['text/plain'],
        'cache-control': ['max-age=0'],
        'expires': result.multiValueHeaders['expires'],
        'etag': ['"ae771fbbba6a74eeeb77754355831713"'],
        'last-modified': result.multiValueHeaders['last-modified']
      }, statusCode: 200, body: 'VGVzdCBmaWxlIGZvciBzZW5kRmlsZQo=', isBase64Encoded: true
    })
  }) // end it

  it('S3 file error',async function() {
    const api = new API(options).catch(errorHandler).handle((req, res) => {
      stub.withArgs({Bucket: 'my-test-bucket', Key: 'file-does-not-exist.txt'})
        .throws(new Error("NoSuchKey: The specified key does not exist."))
  
      res.sendFile('s3://my-test-bucket/file-does-not-exist.txt')
    });
    let _event = Object.assign({},event,{ path: '/sendfile/s3missing' })
    let result = await api.run(_event,{})
    expect(result).toEqual({
      multiValueHeaders: {
        'content-type': ['application/json'],
        'x-error': ['true']
      }, statusCode: 500, body: '{"error":"NoSuchKey: The specified key does not exist."}', isBase64Encoded: false
    })
  }) // end it


  it('S3 bad path error',async function() {
    const api = new API(options).catch(errorHandler).handle((req, res) => {
      res.sendFile('s3://my-test-bucket')
    });
    let _event = Object.assign({},event,{ path: '/sendfile/s3-bad-path' })
    let result = await api.run(_event,{})
    expect(result).toEqual({
      multiValueHeaders: {
        'content-type': ['application/json'],
        'x-error': ['true']
      }, statusCode: 500, body: '{"error":"Invalid S3 path"}', isBase64Encoded: false
    })
  }) // end it

  afterEach(function() {
    stub.restore()
  })
}) // end sendFile tests
