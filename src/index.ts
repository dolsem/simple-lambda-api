import type { APIGatewayProxyEvent, APIGatewayProxyEventV2, Context } from 'aws-lambda';
import type { L } from 'ts-toolbelt';

import type {
  FinallyFunction,
  HandlerFunction,
  Stack,
  Options,
  Middleware,
  ErrorHandlingMiddleware,
} from './types';
import * as logger from './lib/logger';
import { Request, Response } from './lib';
import { ConfigurationError } from './lib/errors';

export type {
  Options,
  Stack,
  Middleware,
  ErrorHandlingMiddleware,
  HandlerFunction,
  FinallyFunction,
  CookieOptions,
  CorsOptions,
  FileOptions,
  NextFunction,
  LoggerFunction,
  TimestampFunction,
  SerializerFunction,
  SamplingOptions,
  LoggerOptions,
} from './types';

export { Request, Response } from './lib';
export { ConfigurationError, ResponseError, FileError } from './lib/errors';
export { ApiError } from './api-error';

const LOG_LEVELS = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
};

export class API<S extends Stack = []> {
  private _logger: ReturnType<typeof logger.config>;
  private _logLevels = { ...LOG_LEVELS };
  private _callbackName: string;
  private _version: string;

  private _mimeTypes: Options['mimeTypes'];
  private _serializer: Options['serializer'];
  private _errorHeaderWhitelist: Options['errorHeaderWhitelist'];
  private _isBase64: Options['isBase64'];
  private _headers: Options['headers'];
  private _compression: Options['compression'];

  // Set sampling info
  private _sampleCounts = null;

  // Init request counter
  private _requestCount = 0;

  // Track init date/time
  private _initTime = Date.now();

  private _handler: HandlerFunction<S>;

  // Middleware stack
  private _stack = [];

  // Error middleware stack
  private _errors = [];

  // Executed after the callback
  private _finally: FinallyFunction<S> | undefined;

  // Global error status (used for response parsing errors)
  private _errorStatus = 500;

  private _event: APIGatewayProxyEvent | APIGatewayProxyEventV2;
  private _context: Context;

  constructor(props: Options) {
    // Set the version and base paths
    this._version = props && props.version ? props.version : 'v1';
    this._callbackName =
      props && props.callbackName ? props.callbackName.trim() : 'callback';
    this._mimeTypes =
      props && props.mimeTypes && typeof props.mimeTypes === 'object'
        ? props.mimeTypes
        : {};
    this._serializer =
      props && props.serializer && typeof props.serializer === 'function'
        ? props.serializer
        : JSON.stringify;
    this._errorHeaderWhitelist =
      props && Array.isArray(props.errorHeaderWhitelist)
        ? props.errorHeaderWhitelist.map((header) => header.toLowerCase())
        : [];
    this._isBase64 =
      props && typeof props.isBase64 === 'boolean' ? props.isBase64 : false;
    this._headers =
      props && props.headers && typeof props.headers === 'object'
        ? props.headers
        : {};
    this._compression =
      props &&
      (typeof props.compression === 'boolean' ||
        Array.isArray(props.compression))
        ? props.compression
        : false;

    // Configure logger
    this._logger = logger.config(props && props.logger, this._logLevels);

    // bind .run() so that users can simplify handler to: `exports.handler = api.run`
    this.run = this.run.bind(this);
  } // end constructor

  handle(handler: HandlerFunction<S>) {
    if (this._stack.length > 0 && this._stack[this._stack.length - 1] === this._handler) {
      this._stack[this._stack.length - 1] = handler;
    } else {
      this._stack.push(handler);
    }
    this._handler = handler;

    return this;
  }

  // RUN: This handles the event and returns response
  async run(event: APIGatewayProxyEvent | APIGatewayProxyEventV2, context: Context) {
    if (this._stack.length < 1) {
      throw new ConfigurationError('No handler or middleware specified.');
    }

    // Set the event, context and callback
    this._event = event;
    this._context = context;

    // Initalize request and response objects
    const request = new Request<S>(this);
    const response = new Response<S>(this, request);

    try {
      // Parse the request
      await (request as any).parseRequest();

      // Loop through the execution stack
      for (const fn of this._stack) {
        // Only run if in processing state
        if ((response as any)._state !== 'processing') break;

        // eslint-disable-next-line
        await new Promise<void>(async (r) => {
          try {
            const rtn = await fn(request, response, () => {
              r();
            });
            if (rtn) response.send(rtn);
            await response._promise;
            if ((response as any)._state === 'done') r(); // if state is done, resolve promise
          } catch (e) {
            await this.catchErrors(e, response);
            r(); // resolve the promise
          }
        });
      } // end for
    } catch (e) {
      // console.log(e);
      await this.catchErrors(e, response);
    }

    // Return the final response
    return (response as any)._response;
  } // end run function

  // Middleware handler
  use<MS extends Middleware<Stack>[]>(...args: MS) {
    // Init middleware stack

    // Add func args as middleware
    for (const arg in args) {
      if (typeof args[arg] === 'function') {
        if (this._stack.length > 0 && this._stack[this._stack.length - 1] === this._handler) {
          this._stack[this._stack.length - 1] = args[arg];
          this._stack.push(this._handler);
        } else {
          this._stack.push(args[arg]);
        }
      } else {
        throw new ConfigurationError(
          'Middleware must be a function'
        );
      }
    }
    type MiddlewareStack<T> = T extends [Middleware<infer S2>, ...infer R] ? L.Concat<S2, MiddlewareStack<R>> : [];
    return this as API<L.Concat<S, MiddlewareStack<MS>>>;
  } // end use

  catch<MS extends ErrorHandlingMiddleware<Stack>[]>(...args: MS) {
    for (const arg in args) {
      if (typeof args[arg] === 'function') {
        this._errors.push(args[arg]);
      } else {
        throw new ConfigurationError(
          'Error handler must be a function'
        );
      }
    }

    type MiddlewareStack<T> = T extends [ErrorHandlingMiddleware<infer S2>, ...infer R] ? L.Concat<S2, MiddlewareStack<R>> : [];
    return this as API<L.Concat<S, MiddlewareStack<MS>>>;
  }

  // Finally handler
  finally(fn: FinallyFunction<S>) {
    this._finally = fn;
    return this;
  }

  // Catch all async/sync errors
  protected async catchErrors(e: Error, response, code?: number, detail?: string) {
    // Error messages should respect the app's base64 configuration
    response._isBase64 = this._isBase64;

    // Strip the headers, keep whitelist
    const strippedHeaders = Object.entries(response._headers).reduce(
      (acc, [headerName, value]) => {
        if (!this._errorHeaderWhitelist.includes(headerName.toLowerCase())) {
          return acc;
        }

        return Object.assign(acc, { [headerName]: value });
      },
      {}
    );

    response._headers = Object.assign(strippedHeaders, this._headers);

    let message: string;

    // Set the status code
    response.status(code ? code : this._errorStatus);

    const info = {
      detail,
      statusCode: response._statusCode,
      coldStart: response._request.coldStart,
      stack: (this._logger.stack && e.stack) || undefined,
    };

    if (e instanceof Error) {
      message = e.message;
      if (this._logger.errorLogging) {
        (this as any).log.fatal(message, info);
      }
    } else {
      message = e;
      if (this._logger.errorLogging) {
        (this as any).log.error(message, info);
      }
    }

    // If first time through, process error middleware
    if (response._state === 'processing') {
      // Flag error state (this will avoid infinite error loops)
      response._state = 'error';

      // Execute error middleware
      for (const err of this._errors) {
        if (response._state === 'done') break;
        // Promisify error middleware
        await new Promise<void>(async (r) => { // eslint-disable-line no-async-promise-executor
          const rtn = await err(e, response._request, response, () => {
            r();
          });
          if (rtn) response.send(rtn);
          r();
        });
      } // end for
    }

    // Throw standard error unless callback has already been executed
    if (response._state !== 'done') response.json({ error: message });
  } // end catch

  // Custom callback
  protected async _callback(err, res, response) {
    // Set done status
    response._state = 'done';

    // Execute finally
    await this._finally?.(response._request, response);

    // Output logs
    response._request._logs.forEach((log) => {
      this._logger.logger(
        JSON.stringify(
          this._logger.detail
            ? this._logger.format(log, response._request, response)
            : log
        )
      );
    });

    // Generate access log
    if (
      (this._logger.access || response._request._logs.length > 0) &&
      this._logger.access !== 'never'
    ) {
      const access = Object.assign(
        this._logger.log(
          'access',
          undefined,
          response._request,
          response._request.context
        ),
        {
          statusCode: res.statusCode,
          coldStart: response._request.coldStart,
          count: response._request.requestCount,
        }
      );
      this._logger.logger(
        JSON.stringify(this._logger.format(access, response._request, response))
      );
    }

    // Reset global error code
    this._errorStatus = 500;
  } // end _callback
}

export default API;
