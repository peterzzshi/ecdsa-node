// Type definitions for the server

export interface TransactionMessage {
  sender: string;
  recipient: string;
  amount: number;
  nonce: number;
  timestamp?: number;
}

export interface SendRequestBody {
  message: TransactionMessage;
  signature: string;
  messageHash: string;
}

export interface Balances {
  [address: string]: number;
}

export interface Nonces {
  [address: string]: number;
}

export enum ErrorCode {
  INVALID_SIGNATURE = 'INVALID_SIGNATURE',
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  INVALID_HASH = 'INVALID_HASH',
  INVALID_ADDRESS = 'INVALID_ADDRESS',
  INVALID_NONCE = 'INVALID_NONCE',
  INVALID_AMOUNT = 'INVALID_AMOUNT',
  SELF_TRANSFER = 'SELF_TRANSFER',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

export interface ErrorResponse {
  code: ErrorCode | string;
  message: string;
  details?: unknown;
}
