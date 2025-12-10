import { AsyncLocalStorage } from 'async_hooks';

import type { LogContextData } from './types';

export class LogContext {
  protected constructor(public readonly data: LogContextData) {}

  static create(data: Partial<LogContextData> = {}): LogContext {
    return new LogContext({
      operation: data.operation,
      requestId: data.requestId,
      address: data.address,
      transactionData: data.transactionData ?? new Map(),
    });
  }

  withOperation(operation: string | undefined): LogContext {
    return new LogContext({ ...this.data, operation });
  }

  withRequestId(requestId: string): LogContext {
    return new LogContext({ ...this.data, requestId });
  }

  withAddress(address: string | undefined): LogContext {
    return new LogContext({ ...this.data, address });
  }

  withTransactionData(transactionData: Record<string, string>): LogContext {
    const newTransactionData = new Map([
      ...Array.from(this.data.transactionData),
      ...Object.entries(transactionData),
    ]);
    return new LogContext({ ...this.data, transactionData: newTransactionData });
  }

  withoutTransactionData(...keys: string[]): LogContext {
    const newTransactionData = new Map(this.data.transactionData);
    keys.forEach((key) => newTransactionData.delete(key));
    return new LogContext({ ...this.data, transactionData: newTransactionData });
  }
}

const EMPTY_CONTEXT = LogContext.create();

const asyncLocalStorage = new AsyncLocalStorage<LogContext>();

export const getLogContext = (): LogContext =>
  asyncLocalStorage.getStore() ?? EMPTY_CONTEXT;

export const withLogContext = <T>(logContext: LogContext, callback: () => T): T =>
  asyncLocalStorage.run(logContext, callback);
