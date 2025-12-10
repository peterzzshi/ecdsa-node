export const LOG_LEVELS = ['debug', 'info', 'warn', 'error'] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

export type LoggingParameters = readonly [unknown] | readonly [string, unknown];

export interface LogContextData {
    readonly operation: string | undefined; // e.g., 'transaction', 'balance-query', 'signature-verification'
    readonly requestId: string | undefined; // Unique identifier for each API request
    readonly address: string | undefined; // Ethereum address involved in the operation
    readonly transactionData: ReadonlyMap<string, string>; // Transaction-specific data (amount, recipient, nonce, etc.)
}

export interface LogOutput {
    readonly level: LogLevel;
    readonly message?: unknown;
    readonly requestId?: string;
    readonly details: {
        readonly operation?: string;
        readonly address?: string;
        readonly transactionData?: Record<string, string>;
        readonly stack?: string;
        readonly timestamp: string;
    };
}

export interface Logger {
    debug(...parameters: LoggingParameters): void;
    info(...parameters: LoggingParameters): void;
    warn(...parameters: LoggingParameters): void;
    error(...parameters: LoggingParameters): void;
}
