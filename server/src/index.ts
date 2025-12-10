import express, { Request, Response } from 'express';
import cors from 'cors';
import crypto from 'crypto';
import { keccak_256 } from '@noble/hashes/sha3.js';
import * as secp from '@noble/secp256k1';
import { verifySignatureAndGetAddress } from './crypto';
import { SendRequestBody, ErrorCode, ErrorResponse, Balances, Nonces } from './types';
import { loadStorage, scheduleSave } from './storage';
import { logger } from './logger/logger';
import { LogContext, withLogContext } from './logger/context';

const app = express();
const port = process.env.PORT || 3042;

app.use(cors());
app.use(express.json());

// Logging middleware - adds context to all requests
app.use((req, res, next) => {
  const requestId = crypto.randomUUID();
  const context = LogContext.create({
    requestId,
    operation: 'http-request',
    transactionData: new Map([
      ['method', req.method],
      ['path', req.path],
      ['userAgent', req.get('User-Agent') || 'unknown'],
    ]),
  });

  // Keep next() inside withLogContext to ensure async context propagates
  withLogContext(context, () => {
    logger.info(`${req.method} ${req.path}`);
    // Call next() within the context so all subsequent handlers have access to it
    next();
  });
});

// Load balances and nonces from storage file
const initialStorage = (() => {
  const context = LogContext.create({
    operation: 'storage-initialization',
  });

  return withLogContext(context, () => {
    try {
      const storage = loadStorage();
      logger.info(`Loaded ${Object.keys(storage.balances).length} accounts from storage`);
      return storage;
    } catch (error) {
      logger.error('Failed to load storage, starting with empty state', error as Error);
      return { balances: {} as Balances, nonces: {} as Nonces };
    }
  });
})();

const state = {
  balances: { ...initialStorage.balances },
  nonces: { ...initialStorage.nonces },
};

/**
 * Validate Ethereum address format
 */
function isValidAddress(address: string): boolean {
  if (!address.startsWith('0x')) return false;
  const cleanAddress = address.slice(2);
  return /^[0-9a-fA-F]{40}$/.test(cleanAddress);
}

/**
 * Validate transaction amount
 */
function isValidAmount(amount: number): boolean {
  return Number.isInteger(amount) && amount > 0 && amount <= 1000000;
}

/**
 * Initialize balance if address doesn't exist
 */
function setInitialBalance(address: string): void {
  if (!state.balances[address]) {
    state.balances[address] = 0;
  }
}

/**
 * Get current nonce for an address
 */
app.get('/nonce/:address', (req: Request, res: Response) => {
  const { address } = req.params;
  const context = LogContext.create({
    operation: 'nonce-query',
    address,
  });

  withLogContext(context, () => {
    if (!isValidAddress(address)) {
      logger.warn('Invalid address format');
      res.status(400).send({
        code: ErrorCode.INVALID_ADDRESS,
        message: 'Invalid address format',
      } as ErrorResponse);
      return;
    }

    const nonce = state.nonces[address] || 0;
    logger.debug(`Nonce retrieved: ${nonce}`);
    res.send({ nonce });
  });
});

/**
 * Get balance for an address
 */
app.get('/balance/:address', (req: Request, res: Response) => {
  const { address } = req.params;
  const context = LogContext.create({
    operation: 'balance-query',
    address,
  });

  withLogContext(context, () => {
    if (!isValidAddress(address)) {
      logger.warn('Invalid address format');
      res.status(400).send({
        code: ErrorCode.INVALID_ADDRESS,
        message: 'Invalid address format',
      } as ErrorResponse);
      return;
    }

    const balance = state.balances[address] || 0;
    logger.debug(`Balance retrieved: ${balance}`);
    res.send({ balance });
  });
});

/**
 * Process a signed transaction
 */
app.post('/send', (req: Request<object, object, SendRequestBody>, res: Response) => {
  try {
    const { message, signature, messageHash } = req.body;

    // Validate request body
    if (!message || !signature || !messageHash) {
      logger.warn('Missing required fields in transaction request');
      res.status(400).send({
        code: ErrorCode.INVALID_SIGNATURE,
        message: 'Missing required fields: message, signature, or messageHash',
      } as ErrorResponse);
      return;
    }

    const { sender, recipient, amount, nonce } = message;

    // Update context with transaction details
    const context = LogContext.create({
      operation: 'transaction',
      address: sender,
      transactionData: new Map([
        ['sender', sender],
        ['recipient', recipient],
        ['amount', amount.toString()],
        ['nonce', nonce.toString()],
      ]),
    });

    withLogContext(context, () => {
      logger.debug('Validating transaction');

      // Validate addresses
      if (!isValidAddress(sender)) {
        logger.warn('Invalid sender address format');
        res.status(400).send({
          code: ErrorCode.INVALID_ADDRESS,
          message: 'Invalid sender address format',
        } as ErrorResponse);
        return;
      }

      if (!isValidAddress(recipient)) {
        logger.warn('Invalid recipient address format');
        res.status(400).send({
          code: ErrorCode.INVALID_ADDRESS,
          message: 'Invalid recipient address format',
        } as ErrorResponse);
        return;
      }

      // Prevent self-transfers
      if (sender.toLowerCase() === recipient.toLowerCase()) {
        logger.warn('Attempted self-transfer');
        res.status(400).send({
          code: ErrorCode.SELF_TRANSFER,
          message: 'Cannot transfer to yourself',
        } as ErrorResponse);
        return;
      }

      // Validate amount
      if (!isValidAmount(amount)) {
        logger.warn(`Invalid amount: ${amount}`);
        res.status(400).send({
          code: ErrorCode.INVALID_AMOUNT,
          message: 'Invalid amount: must be a positive integer less than 1,000,000',
        } as ErrorResponse);
        return;
      }

      // Verify nonce to prevent replay attacks
      logger.debug('Verifying nonce');
      const currentNonce = state.nonces[sender] || 0;
      if (nonce !== currentNonce + 1) {
        logger.warn(`Invalid nonce: expected ${currentNonce + 1}, got ${nonce}`);
        res.status(400).send({
          code: ErrorCode.INVALID_NONCE,
          message: `Invalid nonce: expected ${currentNonce + 1}, got ${nonce}`,
          details: { expected: currentNonce + 1, received: nonce },
        } as ErrorResponse);
        return;
      }

      // Verify message hash
      logger.debug('Verifying message hash');
      const messageString = JSON.stringify(message);
      const messageBytes = new TextEncoder().encode(messageString);
      const computedHash = secp.etc.bytesToHex(keccak_256(messageBytes));

      if (computedHash !== messageHash) {
        logger.error('Invalid message hash - possible tampering detected');
        res.status(400).send({
          code: ErrorCode.INVALID_HASH,
          message: 'Invalid message hash - message may have been tampered with',
        } as ErrorResponse);
        return;
      }

      // Recover address from signature
      logger.debug('Verifying signature');
      const recoveredAddress = verifySignatureAndGetAddress(messageHash, signature);
      if (recoveredAddress.toLowerCase() !== sender.toLowerCase()) {
        logger.error(`Signature verification failed: expected ${sender}, got ${recoveredAddress}`);
        res.status(401).send({
          code: ErrorCode.INVALID_SIGNATURE,
          message: 'Invalid signature - authentication failed',
          details: { expected: sender, recovered: recoveredAddress },
        } as ErrorResponse);
        return;
      }

      // Initialize balances if needed
      setInitialBalance(sender);
      setInitialBalance(recipient);

      // Check sufficient funds
      logger.debug('Checking balance');
      if (state.balances[sender] < amount) {
        logger.warn(`Insufficient funds: required ${amount}, available ${state.balances[sender]}`);
        res.status(400).send({
          code: ErrorCode.INSUFFICIENT_FUNDS,
          message: 'Not enough funds',
          details: { required: amount, available: state.balances[sender] },
        } as ErrorResponse);
        return;
      }

      // Process transaction
      logger.info('Processing transaction');
      state.balances[sender] -= amount;
      state.balances[recipient] += amount;
      state.nonces[sender] = nonce;

      // Save changes to storage (debounced)
      scheduleSave(state.balances, state.nonces);

      logger.info(`Transaction successful: ${sender} → ${recipient} (${amount})`);

      res.send({
        balance: state.balances[sender],
        newNonce: nonce,
        recipient: {
          address: recipient,
          newBalance: state.balances[recipient],
        },
      });
    });
  } catch (error) {
    logger.error('Error processing transaction', error as Error);
    res.status(500).send({
      code: ErrorCode.INTERNAL_ERROR,
      message: 'Error processing transaction',
      details: error instanceof Error ? error.message : 'Unknown error',
    } as ErrorResponse);
  }
});

app.listen(port, () => {
  const context = LogContext.create({
    operation: 'server-startup',
    transactionData: new Map([
      ['port', port.toString()],
      ['accounts', Object.keys(state.balances).length.toString()],
    ]),
  });

  withLogContext(context, () => {
    logger.info(`Server listening on port ${port}`);
    logger.info(`Initial balances loaded: ${Object.keys(state.balances).length} accounts`);
  });
});
