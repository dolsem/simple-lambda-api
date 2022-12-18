import type {
  Request as RequestType,
  Response as ResponseType,
  RouteError as RouteErrorType,
  MethodError as MethodErrorType,
  ConfigurationError as ConfigurationErrorType,
  ResponseError as ResponseErrorType,
  FileError as FileErrorType,
} from '../types';

export const Request: typeof RequestType = require('./request');
export const Response: typeof ResponseType = require('./response');

const errors = require('./errors');
export const RouteError = errors.RouteError as typeof RouteErrorType;
export const MethodError = errors.MethodError as typeof MethodErrorType;
export const ConfigurationError = errors.ConfigurationError as typeof ConfigurationErrorType;
export const ResponseError = errors.ResponseError as typeof ResponseErrorType;
export const FileError = errors.FileError as typeof FileErrorType;
