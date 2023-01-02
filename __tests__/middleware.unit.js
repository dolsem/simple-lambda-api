"use strict";

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

const { API } = require('..');

// Init API instance
const api = new API({ version: "v1.0" });
const api2 = new API({ version: "v1.0" });
const api3 = new API({ version: "v1.0" });
const api4 = new API({ version: "v1.0" });
const api5 = new API({ version: "v1.0" });

let event = {
  httpMethod: "get",
  path: "/test",
  body: {},
  multiValueHeaders: {
    "content-type": ["application/json"],
  },
};

/******************************************************************************/
/***  DEFINE TEST MIDDLEWARE                                                ***/
/******************************************************************************/

api.use(function (req, res, next) {
  req.testMiddleware = "123";
  next();
});

// Middleware that accesses params, querystring, and body values
api.use(function (req, res, next) {
  req.testMiddleware2 = "456";
  req.testMiddleware3 = req.params.test;
  req.testMiddleware4 = req.query.test ? req.query.test : null;
  req.testMiddleware5 = req.body.test ? req.body.test : null;
  next();
});

// Add middleware with promise/delay
api.use(function (req, res, next) {
  if (req.path === "/testPromise") {
    let start = Date.now();
    delay(100).then((x) => {
      req.testMiddlewarePromise = "test";
      next();
    });
  } else {
    next();
  }
});

api2.use(function (req, res, next) {
  if (req.path === "/test/error") {
    res.error(401, "Not Authorized");
  } else {
    if (req.path === '/test') req.testMiddleware = true;
    next();
  }
});

const middleware1 = (req, res, next) => {
  req.middleware1 = true;
  next();
};

const middleware2 = (req, res, next) => {
  req.middleware2 = true;
  next();
};

api3.use(middleware1, middleware2);

api4.use((req, res, next) => {
  res.header("middleware1", true);
  return "return from middleware";
});

// This shouldn't run
api4.use((req, res, next) => {
  res.header("middleware2", true);
  next();
});

api5.use((req, res, next) => {
  res.header("middleware1", true);
  res.send("return from middleware");
  next();
});

// This shouldn't run
api5.use((req, res, next) => {
  res.header("middleware2", true);
  next();
});

/******************************************************************************/
/***  DEFINE TEST ROUTES                                                    ***/
/******************************************************************************/

api.handle((req, res) => {
  if (req.path === '/test') {
    res.status(200).json({
      method: "get",
      testMiddleware: req.testMiddleware,
      testMiddleware2: req.testMiddleware2,
    });
  } else if (req.path.startsWith('/test/')) {
    res.status(200).json({
      method: "get",
      testMiddleware3: req.testMiddleware3,
      testMiddleware4: req.testMiddleware4,
      testMiddleware5: req.testMiddleware5,
    });
  } else if (req.path === '/testPromise') {
    res
      .status(200)
      .json({ method: "get", testMiddlewarePromise: req.testMiddlewarePromise });
  }
});

api2.handle((req, res) => {
  if (req.path === '/test/error') {
    res.status(200).json({ message: "should not get here" });
  } else {
    res.status(200).json({
      method: "get",
      middleware: req.testMiddleware ? true : false,
    });
  }
});

api3.handle((req, res) => {
  res.status(200).json({
    method: "get",
    middleware1: req.middleware1 ? true : false,
    middleware2: req.middleware2 ? true : false,
  });
});

api4.handle((req, res) => {
  // This should not run because of the middleware return
  res.status(200).send("route response");
});

api5.handle((req, res) => {
  // This should not run because of the middleware return
  res.status(200).send("route response");
});

/******************************************************************************/
/***  BEGIN TESTS                                                           ***/
/******************************************************************************/

describe("Middleware Tests:", function () {
  // this.slow(300);

  it("Set Values in res object", async function () {
    let _event = Object.assign({}, event, {});
    let result = await api.run(_event, {});
    expect(result).toEqual({
      multiValueHeaders: { "content-type": ["application/json"] },
      statusCode: 200,
      body: '{"method":"get","testMiddleware":"123","testMiddleware2":"456"}',
      isBase64Encoded: false,
    });
  }); // end it

  it("Access params, querystring, and body values", async function () {
    let _event = Object.assign({}, event, {
      httpMethod: "post",
      path: "/test/123",
      pathParameters: { test: '123' },
      queryStringParameters: { test: "456" },
      body: { test: "789" },
    });
    let result = await api.run(_event, {});
    expect(result).toEqual({
      multiValueHeaders: { "content-type": ["application/json"] },
      statusCode: 200,
      body: '{"method":"get","testMiddleware3":"123","testMiddleware4":"456","testMiddleware5":"789"}',
      isBase64Encoded: false,
    });
  }); // end it

  it("Middleware with Promise/Delay", async function () {
    let _event = Object.assign({}, event, { path: "/testPromise" });
    let result = await api.run(_event, {});
    expect(result).toEqual({
      multiValueHeaders: { "content-type": ["application/json"] },
      statusCode: 200,
      body: '{"method":"get","testMiddlewarePromise":"test"}',
      isBase64Encoded: false,
    });
  }); // end it

  it("With matching string path", async function () {
    let _event = Object.assign({}, event, { path: "/test" });
    let result = await api2.run(_event, {});
    expect(result).toEqual({
      multiValueHeaders: { "content-type": ["application/json"] },
      statusCode: 200,
      body: '{"method":"get","middleware":true}',
      isBase64Encoded: false,
    });
  }); // end it

  it("With non-matching string path", async function () {
    let _event = Object.assign({}, event, { path: "/test2/xyz" });
    let result = await api2.run(_event, {});
    expect(result).toEqual({
      multiValueHeaders: { "content-type": ["application/json"] },
      statusCode: 200,
      body: '{"method":"get","middleware":false}',
      isBase64Encoded: false,
    });
  }); // end it

  it("Multiple middlewares", async function () {
    let _event = Object.assign({}, event, { path: "/test" });
    let result = await api3.run(_event, {});
    expect(result).toEqual({
      multiValueHeaders: { "content-type": ["application/json"] },
      statusCode: 200,
      body: '{"method":"get","middleware1":true,"middleware2":true}',
      isBase64Encoded: false,
    });
  }); // end it

  it("Short-circuit route with middleware (async return)", async function () {
    let _event = Object.assign({}, event, { path: "/test" });
    let result = await api4.run(_event, {});
    expect(result).toEqual({
      multiValueHeaders: {
        "content-type": ["application/json"],
        middleware1: [true],
      },
      statusCode: 200,
      body: "return from middleware",
      isBase64Encoded: false,
    });
  }); // end it

  it("Short-circuit route with middleware (callback)", async function () {
    let _event = Object.assign({}, event, { path: "/test" });
    let result = await api5.run(_event, {});
    expect(result).toEqual({
      multiValueHeaders: {
        "content-type": ["application/json"],
        middleware1: [true],
      },
      statusCode: 200,
      body: "return from middleware",
      isBase64Encoded: false,
    });
  }); // end it

  it("Trigger error in middleware", async function () {
    let _event = Object.assign({}, event, { path: "/test/error" });
    let result = await api2.run(_event, {});
    expect(result).toEqual({
      multiValueHeaders: { "content-type": ["application/json"] },
      statusCode: 401,
      body: '{"error":"Not Authorized"}',
      isBase64Encoded: false,
    });
  }); // end it
}); // end MIDDLEWARE tests
