import type { APIGatewayEvent, Context } from 'aws-lambda';
import type {
  FinallyFunction,
  HandlerFunction,
  API as LambdaAPI,
  Options,
} from './types';
import {
  Request,
  Response,
  ConfigurationError,
} from './lib';
import * as logger from './lib/logger';

type ApiOptions = Omit<Options, 'base'>;

const LOG_LEVELS = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
};

class API {
  _logger: ReturnType<typeof logger.config>;
  _callbackName: string;
  _version: string;

  _mimeTypes: ApiOptions['mimeTypes'];
  _serializer: ApiOptions['serializer'];
  _errorHeaderWhitelist: ApiOptions['errorHeaderWhitelist'];
  _isBase64: ApiOptions['isBase64'];
  _headers: ApiOptions['headers'];
  _compression: ApiOptions['compression'];

  // Set sampling info
  _sampleCounts = {};

  // Init request counter
  _requestCount = 0;

  // Track init date/time
  _initTime = Date.now();

  _handler: HandlerFunction;

  // Middleware stack
  _stack = [];

  // Error middleware stack
  _errors = [];

  // Executed after the callback
  _finally: FinallyFunction = () => {};

  // Global error status (used for response parsing errors)
  _errorStatus = 500;

  _event: APIGatewayEvent;
  _context: Context;

  constructor(props: ApiOptions) {
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
    this._logger = logger.config(props && props.logger, LOG_LEVELS);

  } // end constructor

  handle(handler: HandlerFunction) {
    if (this._stack.length > 0 && this._stack[this._stack.length - 1] === this._handler) {
      this._stack[this._stack.length - 1] = handler;
    } else {
      this._stack.push(handler);
    }
    this._handler = handler;
  }

  // RUN: This handles the event and returns response
  async run(event: APIGatewayEvent, context: Context) {
    if (this._stack.length < 1) {
      throw new ConfigurationError('No handler or middleware specified.');
    }

    // Set the event, context and callback
    this._event = event;
    this._context = context;

    // Initalize request and response objects
    const request = new Request(this);
    const response = new Response(this, request);

    try {
      // Parse the request
      await request.parseRequest();

      // Loop through the execution stack
      for (const fn of this._stack) {
        // Only run if in processing state
        if (response._state !== 'processing') break;

        // eslint-disable-next-line
        await new Promise<void>(async (r) => {
          try {
            let rtn = await fn(request, response, () => {
              r();
            });
            if (rtn) response.send(rtn);
            if (response._state === 'done') r(); // if state is done, resolve promise
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
    return response._response;
  } // end run function

  // Catch all async/sync errors
  async catchErrors(e: Error, response, code?: number, detail?: string) {
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

    let info = {
      detail,
      statusCode: response._statusCode,
      coldStart: response._request.coldStart,
      stack: (this._logger.stack && e.stack) || undefined,
    };

    if (e instanceof Error) {
      message = e.message;
      if (this._logger.errorLogging) {
        this._logger.fatal(message, info);
      }
    } else {
      message = e;
      if (this._logger.errorLogging) {
        this._logger.error(message, info);
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
        await new Promise<void>(async (r) => {
          let rtn = await err(e, response._request, response, () => {
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
  async _callback(err, res, response) {
    // Set done status
    response._state = 'done';

    // Execute finally
    await this._finally(response._request, response);

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
      let access = Object.assign(
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

  // Middleware handler
  use(...args) {
    // Init middleware stack

    // Add func args as middleware
    for (let arg in args) {
      if (typeof args[arg] === 'function') {
        if (args[arg].length === 3) {
          if (this._stack.length > 0 && this._stack[this._stack.length - 1] === this._handler) {
            this._stack[this._stack.length - 1] = args[arg];
            this._stack.push(this._handler);
          } else {
            this._stack.push(args[arg]);
          }
        } else if (args[arg].length === 4) {
          this._errors.push(args[arg]);
        } else {
          throw new ConfigurationError(
            'Middleware must have 3 or 4 parameters'
          );
        }
      }
    }
  } // end use

  // Finally handler
  finally(fn) {
    this._finally = fn;
  }
}

export default (opts: Options) => new API(opts) as LambdaAPI;
