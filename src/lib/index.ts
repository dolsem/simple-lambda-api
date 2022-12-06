import type {
  Request as RequestType,
  Response as ResponseType,
  RouteError as RouteErrorType,
  MethodError as MethodErrorType,
  ConfigurationError as ConfigurationErrorType,
  ResponseError as ResponseErrorType,
  FileError as FileErrorType,
} from '../types';

export const Request: RequestType = require('./request');
export const Response: ResponseType = require('./response');

const errors = require('./errors');
export const RouteError = errors.RouteError as RouteErrorType;
export const MethodError = errors.MethodError as MethodErrorType;
export const ConfigurationError = errors.ConfigurationError as ConfigurationErrorType;
export const ResponseError = errors.ResponseError as ResponseErrorType;
export const FileError = errors.FileError as FileErrorType;
