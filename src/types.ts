import {
  APIGatewayEventRequestContext,
  Context,
} from 'aws-lambda';
import { U } from 'ts-toolbelt';

import API from './index';

export declare interface CookieOptions {
  domain?: string;
  expires?: Date;
  httpOnly?: boolean;
  maxAge?: number;
  path?: string;
  secure?: boolean;
  sameSite?: boolean | 'Strict' | 'Lax' | 'None';
}

export declare interface CorsOptions {
  credentials?: boolean;
  exposeHeaders?: string;
  headers?: string;
  maxAge?: number;
  methods?: string;
  origin?: string;
}

export declare interface FileOptions {
  maxAge?: number;
  root?: string;
  lastModified?: boolean | string;
  headers?: { [key: string]: string };
  cacheControl?: boolean | string;
  private?: boolean;
}

export declare type Middleware<S extends Stack = []> = (
  req: Request<S>,
  res: Response<S>,
  next: () => void
) => void;
export declare type ErrorHandlingMiddleware<S extends Stack = []> = (
  error: Error,
  req: Request<S>,
  res: Response<S>,
  next: () => void
) => void;
export declare type ErrorCallback = (error?: Error) => void;
export declare type HandlerFunction<S extends Stack = []> = (
  req: Request<S>,
  res: Response<S>
) => void | any | Promise<any>;
export declare type LoggerFunction = (
  message?: any,
  ...optionalParams: any[]
) => void;
export declare type NextFunction = () => void;
export declare type TimestampFunction = () => string;
export declare type SerializerFunction = (body: object) => string;
export declare type FinallyFunction<S extends Stack = []> = (req: Request<S>, res: Response<S>) => void | Promise<void>;
export declare type METHODS =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'PATCH'
  | 'DELETE'
  | 'OPTIONS'
  | 'HEAD'
  | 'ANY';

export declare interface SamplingOptions {
  route?: string;
  target?: number;
  rate?: number;
  period?: number;
  method?: string | string[];
}

export declare interface LoggerOptions {
  access?: boolean | string;
  customKey?: string;
  errorLogging?: boolean;
  detail?: boolean;
  level?: string;
  levels?: {
    [key: string]: string;
  };
  messageKey?: string;
  nested?: boolean;
  timestamp?: boolean | TimestampFunction;
  sampling?: {
    target?: number;
    rate?: number;
    period?: number;
    rules?: SamplingOptions[];
  };
  serializers?: {
    [name: string]: (prop: any) => any;
  };
  stack?: boolean;
}

export declare interface Options {
  callbackName?: string;
  logger?: boolean | LoggerOptions;
  mimeTypes?: {
    [key: string]: string;
  };
  serializer?: SerializerFunction;
  version?: string;
  errorHeaderWhitelist?: string[];
  isBase64?: boolean;
  compression?: boolean;
  headers?: object;
}

export declare type Stack = { Req: object; Res: object }[];

export declare class Request<S extends Stack = []> {
  constructor(app: API);

  app: API;
  version: string;
  id: string;
  params: {
    [key: string]: string | undefined;
  };
  method: string;
  path: string;
  query: {
    [key: string]: string | undefined;
  };
  multiValueQuery: {
    [key: string]: string[] | undefined;
  };
  headers: {
    [key: string]: string | undefined;
  };
  rawHeaders?: {
    [key: string]: string | undefined;
  };
  body: any;
  rawBody: string;
  requestContext: APIGatewayEventRequestContext;
  isBase64Encoded: boolean;
  pathParameters: { [name: string]: string } | null;
  stageVariables: { [name: string]: string } | null;
  auth: {
    [key: string]: any;
    type: 'Bearer' | 'Basic' | 'OAuth' | 'Digest' | 'none';
    value: string | null;
  };
  cookies: {
    [key: string]: string;
  };
  context: Context;
  coldStart: boolean;
  requestCount: number;
  ip: string;
  userAgent: string;
  clientType: 'desktop' | 'mobile' | 'tv' | 'tablet' | 'unknown';
  clientCountry: string;

  log: {
    trace: LoggerFunction;
    debug: LoggerFunction;
    info: LoggerFunction;
    warn: LoggerFunction;
    error: LoggerFunction;
    fatal: LoggerFunction;
  };

  ext: { [K in keyof (U.IntersectOf<S[number]['Req']>)]: U.IntersectOf<S[number]['Req']>[K]; }
}

export declare class Response<S extends Stack = []> {
  constructor(app: API, request: Request);

  status(code: number): this;
  sendStatus(code: number): void;
  header(key: string, value?: string | Array<string>, append?: boolean): this;
  getHeader(key: string): string;
  hasHeader(key: string): boolean;
  removeHeader(key: string): this;
  getLink(
    s3Path: string,
    expires?: number,
    callback?: ErrorCallback
  ): Promise<string>;
  send(body: any): void;
  json(body: any): void;
  jsonp(body: any): void;
  html(body: any): void;
  type(type: string): this;
  location(path: string): this;
  redirect(status: number, path: string): void;
  redirect(path: string): void;
  cors(options: CorsOptions): this;
  error(message: string, detail?: any): void;
  error(code: number, message: string, detail?: any): void;
  cookie(name: string, value: string, options?: CookieOptions): this;
  clearCookie(name: string, options?: CookieOptions): this;
  etag(enable?: boolean): this;
  cache(age?: boolean | number | string, private?: boolean): this;
  modified(date: boolean | string | Date): this;
  attachment(fileName?: string): this;
  download(
    file: string | Buffer,
    fileName?: string,
    options?: FileOptions,
    callback?: ErrorCallback
  ): Promise<void>;
  sendFile(
    file: string | Buffer,
    options?: FileOptions,
    callback?: ErrorCallback
  ): Promise<void>;

  ext: { [K in keyof (U.IntersectOf<S[number]['Res']>)]: U.IntersectOf<S[number]['Res']>[K]; }
}

export declare class ConfigurationError extends Error {
  constructor(message: string);
}

export declare class ResponseError extends Error {
  constructor(message: string, code: number);
}

export declare class FileError extends Error {
  constructor(message: string, err: object);
}
