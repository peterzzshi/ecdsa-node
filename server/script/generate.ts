import * as secp from '@noble/secp256k1';
import { keccak_256 } from '@noble/hashes/sha3.js';

/**
 * Generate a random private key and derive its public key and Ethereum address
 */
function generateKeyPair() {
  const privateKey = secp.utils.randomSecretKey();

  const publicKey = secp.getPublicKey(privateKey, false);

  // Derive Ethereum address from public key
  // Remove the first byte (0x04 prefix for uncompressed public key)
  const publicKeyWithoutPrefix = publicKey.slice(1);
  
  const hash = keccak_256(publicKeyWithoutPrefix);

  // Take the last 20 bytes of the hash
  const address = hash.slice(-20);
  
  return {
    privateKey: secp.etc.bytesToHex(privateKey),
    publicKey: secp.etc.bytesToHex(publicKey),
    address: `0x${secp.etc.bytesToHex(address)}`,
  };
}

console.log('🔐 Generating key pairs...\n');

for (let i = 1; i <= 3; i += 1) {
  const keyPair = generateKeyPair();
  console.log(`Account ${i}:`);
  console.log(`Private Key: ${keyPair.privateKey}`);
  console.log(`Public Key:  ${keyPair.publicKey}`);
  console.log(`Address:     ${keyPair.address}`);
  console.log('');
}

console.log('⚠️  IMPORTANT: Save these private keys securely!');
console.log('💡 Use the addresses for server balances and private keys for client-side signing.\n');
