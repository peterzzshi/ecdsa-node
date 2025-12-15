import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import crypto from 'crypto';
import { keccak_256 } from '@noble/hashes/sha3.js';
import * as secp from '@noble/secp256k1';
import { verifySignatureAndGetAddress } from './crypto';
import { SendRequestBody, ErrorCode, Balances, Nonces } from './types';
import { ValidationError } from './errors';
import { logger } from './logger/logger';
import { LogContext, withLogContext } from './logger/context';

const DEFAULT_PORT = 3042;
const MAX_TRANSACTION_AMOUNT = 1000000;
const GRACE_SHUTDOWN_TIMEOUT = 10000;

const getPort = (): number => parseInt(process.env.PORT || String(DEFAULT_PORT), 10);

/**
 * In-memory storage for account balances and nonces
 * This is ephemeral - data is lost when the server restarts
 */
const state = {
  balances: {
    '0x57a7a0a4c0911775e0edd91b88c7f68f5aac84fd': 100,
    '0x8cc93c04af25707b5ad002f16043d5f7a6ee699b': 50,
    '0x17a549927a1b913d046d4300a2029195aa399b6f': 75,
  } as Balances,
  nonces: {} as Nonces,
};

const app = express();

app.use(cors());
app.use(express.json());

// Add logging context to all requests
app.use((req, res, next) => {
  const context = LogContext.create()
    .withRequestId(crypto.randomUUID())
    .withOperation('http-request')
    .withTransactionData({
      method: req.method,
      path: req.path,
    });

  withLogContext(context, () => {
    logger.info(`${req.method} ${req.path}`);
    next();
  });
});

/**
 * Validate Ethereum address format (pure function)
 */
function isValidAddress(address: string): boolean {
  if (!address.startsWith('0x')) return false;
  const cleanAddress = address.slice(2);
  return /^[0-9a-fA-F]{40}$/.test(cleanAddress);
}

/**
 * Validate single address (throws on invalid)
 */
function validateAddress(address: string): void {
  if (!isValidAddress(address)) {
    throw new ValidationError(ErrorCode.INVALID_ADDRESS, 'Invalid address format');
  }
}

/**
 * Validate transaction addresses (throws on invalid)
 */
function validateAddresses(sender: string, recipient: string): void {
  if (!isValidAddress(sender)) {
    throw new ValidationError(ErrorCode.INVALID_ADDRESS, 'Invalid sender address format');
  }

  if (!isValidAddress(recipient)) {
    throw new ValidationError(ErrorCode.INVALID_ADDRESS, 'Invalid recipient address format');
  }

  if (sender.toLowerCase() === recipient.toLowerCase()) {
    throw new ValidationError(ErrorCode.SELF_TRANSFER, 'Cannot transfer to yourself');
  }
}

/**
 * Validate transaction amount (throws on invalid)
 */
function validateAmount(amount: number): void {
  if (!Number.isInteger(amount) || amount <= 0 || amount > MAX_TRANSACTION_AMOUNT) {
    throw new ValidationError(
      ErrorCode.INVALID_AMOUNT,
      'Invalid amount: must be a positive integer less than 1,000,000',
    );
  }
}

/**
 * Validate nonce (throws on invalid)
 */
function validateNonce(sender: string, nonce: number): void {
  const currentNonce = state.nonces[sender] ?? 0;

  if (nonce !== currentNonce + 1) {
    throw new ValidationError(
      ErrorCode.INVALID_NONCE,
      `Invalid nonce: expected ${currentNonce + 1}, got ${nonce}`,
      { expected: currentNonce + 1, received: nonce },
    );
  }
}

/**
 * Validate message hash (throws on invalid)
 */
function validateMessageHash(message: object, messageHash: string): void {
  const messageString = JSON.stringify(message);
  const messageBytes = new TextEncoder().encode(messageString);
  const computedHash = secp.etc.bytesToHex(keccak_256(messageBytes));

  if (computedHash !== messageHash) {
    throw new ValidationError(
      ErrorCode.INVALID_HASH,
      'Invalid message hash - message may have been tampered with',
    );
  }
}

/**
 * Validate signature (throws on invalid)
 */
function validateSignature(sender: string, messageHash: string, signature: string): void {
  const recoveredAddress = verifySignatureAndGetAddress(messageHash, signature);
  if (recoveredAddress.toLowerCase() !== sender.toLowerCase()) {
    throw new ValidationError(
      ErrorCode.INVALID_SIGNATURE,
      'Invalid signature - authentication failed',
      { expected: sender, recovered: recoveredAddress },
    );
  }
}

/**
 * Process transaction (throws on insufficient funds, otherwise updates state)
 */
function processTransaction(
  sender: string,
  recipient: string,
  amount: number,
  nonce: number,
): void {
  const senderBalance = state.balances[sender] ?? 0;

  if (senderBalance < amount) {
    throw new ValidationError(
      ErrorCode.INSUFFICIENT_FUNDS,
      'Not enough funds',
      { required: amount, available: senderBalance },
    );
  }

  // Update balances and nonce
  state.balances[sender] = senderBalance - amount;
  state.balances[recipient] = (state.balances[recipient] ?? 0) + amount;
  state.nonces[sender] = nonce;
}

/**
 * Get current nonce for an address
 */
app.get('/nonce/:address', (req: Request, res: Response, next: NextFunction) => {
  const { address } = req.params;

  try {
    validateAddress(address);

    const nonce = state.nonces[address] ?? 0;
    logger.debug(`Nonce retrieved: ${nonce}`);
    res.send({ nonce });
  } catch (error) {
    next(error);
  }
});

/**
 * Get balance for an address
 */
app.get('/balance/:address', (req: Request, res: Response, next: NextFunction) => {
  const { address } = req.params;

  try {
    validateAddress(address);

    const balance = state.balances[address] ?? 0;
    logger.debug(`Balance retrieved: ${balance}`);
    res.send({ balance });
  } catch (error) {
    next(error);
  }
});

/**
 * Process a signed transaction
 */
app.post('/send', (req: Request<object, object, SendRequestBody>, res: Response, next: NextFunction) => {
  const { message, signature, messageHash } = req.body;

  if (!message || !signature || !messageHash) {
    next(
      new ValidationError(
        ErrorCode.INVALID_SIGNATURE,
        'Missing required fields: message, signature, or messageHash',
      ),
    );
    return;
  }

  const { sender, recipient, amount, nonce } = message;

  try {
    logger.debug('Validating transaction');

    validateAddresses(sender, recipient);
    validateAmount(amount);
    validateNonce(sender, nonce);
    validateMessageHash(message, messageHash);
    validateSignature(sender, messageHash, signature);

    logger.debug('Processing transaction');
    processTransaction(sender, recipient, amount, nonce);

    logger.info(`Transaction successful: ${sender} → ${recipient} (${amount})`);

    res.send({
      balance: state.balances[sender],
      newNonce: nonce,
      recipient: {
        address: recipient,
        newBalance: state.balances[recipient],
      },
    });
  } catch (error) {
    next(error);
  }
});

// Global error handler middleware
app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  // Handle ValidationError instances
  if (err instanceof ValidationError) {
    logger.warn('Request failed', err);

    const getStatusCode = (code: string): number => {
      if (code === ErrorCode.INVALID_SIGNATURE) return 401;
      if (code === ErrorCode.INTERNAL_ERROR) return 500;
      return 400;
    };

    res.status(getStatusCode(err.code)).send(err.toJSON());
    return;
  }

  // Handle unexpected errors
  logger.error('Unexpected error', err);
  res.status(500).send({
    code: ErrorCode.INTERNAL_ERROR,
    message: 'Internal server error',
  });
});

const server = app.listen(getPort(), () => {
  logger.info(`Server listening on port ${getPort()}`);
  logger.info(`Loaded ${Object.keys(state.balances).length} accounts with initial balances`);
});

// Shutdown handler with timeout
const shutdown = (signal: string) => {
  logger.info(`Received ${signal}, shutting down...`);

  // Force exit after 10 seconds if graceful shutdown hangs
  const timeout = setTimeout(() => {
    logger.warn('Graceful shutdown timeout, forcing exit');
    process.exit(1);
  }, GRACE_SHUTDOWN_TIMEOUT);

  server.close(() => {
    clearTimeout(timeout);
    logger.info('Server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
