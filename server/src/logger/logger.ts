import { getLogContext } from './context';
import type { LogLevel, LoggingParameters, LogOutput, Logger } from './types';

const createLogObject = (level: LogLevel, parameters: LoggingParameters): LogOutput => {
  const context = getLogContext();
  const { operation, requestId, address, transactionData } = context.data;

  const message = extractMessage(parameters);
  const stack = extractStack(parameters);

  return {
    level,
    ...(message !== undefined ? { message } : {}),
    ...(requestId ? { requestId } : {}),
    details: {
      ...(operation ? { operation } : {}),
      ...(address ? { address } : {}),
      ...(transactionData.size > 0 ? { transactionData: Object.fromEntries(transactionData) } : {}),
      ...(stack ? { stack } : {}),
      timestamp: new Date().toISOString(),
    },
  };
};

const extractMessage = (parameters: LoggingParameters): unknown => {
  if (parameters.length === 1) {
    const [value] = parameters;
    if (value instanceof Error) {
      const trimmedMessage = value.message.trim();
      return trimmedMessage || `${value.name}: [no message]`;
    }
    return value;
  } else {
    const [message, error] = parameters;
    if (error instanceof Error) {
      const trimmedMessage = error.message.trim();
      const errorMessage = trimmedMessage || `${error.name}: [no message]`;
      return `${message} ${errorMessage}`;
    }
    return `${message} ${String(error)}`;
  }
};

const extractStack = (parameters: LoggingParameters): string | undefined => {
  if (parameters.length === 1) {
    const [value] = parameters;
    return value instanceof Error ? value.stack : undefined;
  } else {
    const [, error] = parameters;
    return error instanceof Error ? error.stack : undefined;
  }
};

const log = (level: LogLevel, parameters: LoggingParameters): void => {
  const logObject = createLogObject(level, parameters);
  process.stdout.write(`${JSON.stringify(logObject)}\n`);
};

export const logger: Logger = {
  debug: (...parameters: LoggingParameters) => log('debug', parameters),
  info: (...parameters: LoggingParameters) => log('info', parameters),
  warn: (...parameters: LoggingParameters) => log('warn', parameters),
  error: (...parameters: LoggingParameters) => log('error', parameters),
} as const;
