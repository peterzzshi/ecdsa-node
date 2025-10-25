import { secp256k1 } from 'ethereum-cryptography/secp256k1';
import { keccak256 } from 'ethereum-cryptography/keccak';

/**
 * Recover the public key from a signature
 * This uses the secp256k1 recovery algorithm to derive the public key from signature + message hash
 */
export function recoverPublicKeyFromSignature(
  messageHash: string,
  signature: string,
  recovery: number
): Uint8Array {
  const messageHashBytes = Buffer.from(messageHash, 'hex');
  const signatureBytes = Buffer.from(signature, 'hex');

  // ethereum-cryptography's secp256k1.Signature.fromCompact can create a signature
  // Then we use addRecoveryBit and recoverPublicKey
  const sig = secp256k1.Signature.fromCompact(signatureBytes).addRecoveryBit(recovery);

  // Recover the public key from the signature with recovery bit
  const publicKey = sig.recoverPublicKey(messageHashBytes);

  // Return as raw bytes (uncompressed format)
  return publicKey.toRawBytes(false);
}

/**
 * Derive Ethereum address from public key
 */
export function publicKeyToAddress(publicKey: Uint8Array): string {
  // Remove the first byte (0x04 prefix for uncompressed public key)
  const publicKeyWithoutPrefix = publicKey.slice(1);

  // Hash the public key using Keccak-256
  const hash = keccak256(publicKeyWithoutPrefix);

  // Take the last 20 bytes as the address
  const addressBytes = hash.slice(-20);

  return `0x${Buffer.from(addressBytes).toString('hex')}`;
}

/**
 * Verify a signature and return the recovered address
 */
export function verifySignatureAndGetAddress(
  messageHash: string,
  signature: string,
  recovery: number
): string {
  const publicKey = recoverPublicKeyFromSignature(messageHash, signature, recovery);
  return publicKeyToAddress(publicKey);
}

