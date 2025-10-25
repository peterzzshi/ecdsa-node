import * as secp from '@noble/secp256k1';
import { keccak_256 } from '@noble/hashes/sha3.js';
import { hmac } from '@noble/hashes/hmac.js';
import { sha256 } from '@noble/hashes/sha2.js';

// Enable sync methods for @noble/secp256k1 v3.0.0
secp.hashes.hmacSha256 = (key, msg) => hmac(sha256, key, msg);
secp.hashes.sha256 = sha256;

/**
 * Recover the public key from a signature
 * This uses the secp256k1 recovery algorithm to derive the public key from signature + message hash
 */
export function recoverPublicKeyFromSignature(
  messageHash: string,
  signature: string
): Uint8Array {
  const messageHashBytes = secp.etc.hexToBytes(messageHash);
  const signatureBytes = secp.etc.hexToBytes(signature);

  console.log('Recovery input - signature hex:', signature);
  console.log('Recovery input - signature length:', signatureBytes.length);
  console.log('Recovery input - message hash length:', messageHashBytes.length);
  console.log('Recovery input - first byte (recovery):', signatureBytes[0]);

  // The signature should be 65 bytes (64 bytes signature + 1 byte recovery)
  if (signatureBytes.length !== 65) {
    throw new Error(`Invalid signature length: expected 65 bytes, got ${signatureBytes.length}`);
  }

  // Recover the public key (returns compressed 33-byte key)
  // Must use prehash: false since we're passing a hash, not the original message
  const publicKeyCompressed = secp.recoverPublicKey(signatureBytes, messageHashBytes, { prehash: false });

  console.log('Recovered public key (compressed):', secp.etc.bytesToHex(publicKeyCompressed));

  // Convert to uncompressed format (65 bytes) for Ethereum address derivation
  const publicKeyPoint = secp.Point.fromBytes(publicKeyCompressed);
  const publicKey = publicKeyPoint.toBytes(false);

  console.log('Recovered public key (uncompressed) length:', publicKey.length);

  // Return as raw bytes (uncompressed format - 65 bytes)
  return publicKey;
}

/**
 * Derive Ethereum address from public key
 */
export function publicKeyToAddress(publicKey: Uint8Array): string {
  // Remove the first byte (0x04 prefix for uncompressed public key)
  const publicKeyWithoutPrefix = publicKey.slice(1);

  // Hash the public key using Keccak-256
  const hash = keccak_256(publicKeyWithoutPrefix);

  // Take the last 20 bytes as the address
  const addressBytes = hash.slice(-20);

  return `0x${secp.etc.bytesToHex(addressBytes)}`;
}

/**
 * Verify a signature and return the recovered address
 */
export function verifySignatureAndGetAddress(
  messageHash: string,
  signature: string
): string {
  const publicKey = recoverPublicKeyFromSignature(messageHash, signature);
  return publicKeyToAddress(publicKey);
}

