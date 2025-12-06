import express, { Request, Response } from 'express';
import cors from 'cors';
import { keccak_256 } from '@noble/hashes/sha3.js';
import * as secp from '@noble/secp256k1';
import { verifySignatureAndGetAddress } from './crypto';
import { SendRequestBody, ErrorCode, ErrorResponse } from './types';

const app = express();
const port = process.env.PORT || 3042;

app.use(cors());
app.use(express.json());

interface Balances {
  [address: string]: number;
}

interface Nonces {
  [address: string]: number;
}

const balances: Balances = {
  '0x5c134bd1119da76fdd9e9c53516d7010b99b88dd': 100,
  '0xbdec47d97e106e32c7c92824735c96b57b248c2b': 50,
  '0x58996da52a56c3c0e54bd84a6ef52c478079152a': 75,
};

// Track nonces for replay attack prevention
const nonces: Nonces = {};

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
  if (!balances[address]) {
    balances[address] = 0;
  }
}

/**
 * Get current nonce for an address
 */
app.get('/nonce/:address', (req: Request, res: Response) => {
  const { address } = req.params;

  if (!isValidAddress(address)) {
    res.status(400).send({
      code: ErrorCode.INVALID_ADDRESS,
      message: 'Invalid address format',
    } as ErrorResponse);
    return;
  }

  const nonce = nonces[address] || 0;
  res.send({ nonce });
});

/**
 * Get balance for an address
 */
app.get('/balance/:address', (req: Request, res: Response) => {
  const { address } = req.params;

  if (!isValidAddress(address)) {
    res.status(400).send({
      code: ErrorCode.INVALID_ADDRESS,
      message: 'Invalid address format',
    } as ErrorResponse);
    return;
  }

  const balance = balances[address] || 0;
  res.send({ balance });
});

/**
 * Process a signed transaction
 */
app.post('/send', (req: Request<object, object, SendRequestBody>, res: Response) => {
  try {
    const { message, signature, messageHash } = req.body;

    // Validate request body
    if (!message || !signature || !messageHash) {
      res.status(400).send({
        code: ErrorCode.INVALID_SIGNATURE,
        message: 'Missing required fields: message, signature, or messageHash',
      } as ErrorResponse);
      return;
    }

    const { sender, recipient, amount, nonce } = message;

    // Validate addresses
    if (!isValidAddress(sender)) {
      res.status(400).send({
        code: ErrorCode.INVALID_ADDRESS,
        message: 'Invalid sender address format',
      } as ErrorResponse);
      return;
    }

    if (!isValidAddress(recipient)) {
      res.status(400).send({
        code: ErrorCode.INVALID_ADDRESS,
        message: 'Invalid recipient address format',
      } as ErrorResponse);
      return;
    }

    // Prevent self-transfers
    if (sender.toLowerCase() === recipient.toLowerCase()) {
      res.status(400).send({
        code: ErrorCode.SELF_TRANSFER,
        message: 'Cannot transfer to yourself',
      } as ErrorResponse);
      return;
    }

    // Validate amount
    if (!isValidAmount(amount)) {
      res.status(400).send({
        code: ErrorCode.INVALID_AMOUNT,
        message: 'Invalid amount: must be a positive integer less than 1,000,000',
      } as ErrorResponse);
      return;
    }

    // Verify nonce to prevent replay attacks
    const currentNonce = nonces[sender] || 0;
    if (nonce !== currentNonce + 1) {
      res.status(400).send({
        code: ErrorCode.INVALID_NONCE,
        message: `Invalid nonce: expected ${currentNonce + 1}, got ${nonce}`,
        details: { expected: currentNonce + 1, received: nonce },
      } as ErrorResponse);
      return;
    }

    // Verify message hash
    const messageString = JSON.stringify(message);
    const messageBytes = new TextEncoder().encode(messageString);
    const computedHash = secp.etc.bytesToHex(keccak_256(messageBytes));

    if (computedHash !== messageHash) {
      res.status(400).send({
        code: ErrorCode.INVALID_HASH,
        message: 'Invalid message hash - message may have been tampered with',
      } as ErrorResponse);
      return;
    }

    // Recover address from signature
    const recoveredAddress = verifySignatureAndGetAddress(messageHash, signature);
    if (recoveredAddress.toLowerCase() !== sender.toLowerCase()) {
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
    if (balances[sender] < amount) {
      res.status(400).send({
        code: ErrorCode.INSUFFICIENT_FUNDS,
        message: 'Not enough funds',
        details: { required: amount, available: balances[sender] },
      } as ErrorResponse);
      return;
    }

    // Process transaction
    balances[sender] -= amount;
    balances[recipient] += amount;
    nonces[sender] = nonce;

    console.log(`✅ Transaction successful: ${sender} → ${recipient} (${amount})`);

    res.send({
      balance: balances[sender],
      newNonce: nonce,
      recipient: {
        address: recipient,
        newBalance: balances[recipient],
      },
    });
  } catch (error) {
    console.error('❌ Error processing transaction:', error);
    res.status(500).send({
      code: ErrorCode.INTERNAL_ERROR,
      message: 'Error processing transaction',
      details: error instanceof Error ? error.message : 'Unknown error',
    } as ErrorResponse);
  }
});

app.listen(port, () => {
  console.log(`🚀 Server listening on port ${port}`);
  console.log(`📊 Initial balances loaded: ${Object.keys(balances).length} accounts`);
});
