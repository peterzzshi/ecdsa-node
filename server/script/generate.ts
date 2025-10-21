import { utils, getPublicKey } from '@noble/secp256k1';
import { keccak256 } from 'ethereum-cryptography/keccak';

/**
 * Generate a random private key and derive its public key and Ethereum address
 */
function generateKeyPair() {
  // Generate a random private key
  const privateKey = utils.randomSecretKey();

  // Get the public key from the private key (uncompressed format)
  const publicKey = getPublicKey(privateKey, false);

  // Derive Ethereum address from public key
  // Remove the first byte (0x04 prefix for uncompressed public key)
  const publicKeyWithoutPrefix = publicKey.slice(1);
  
  // Hash the public key using Keccak-256
  const hash = keccak256(publicKeyWithoutPrefix);
  
  // Take the last 20 bytes of the hash
  const address = hash.slice(-20);
  
  return {
    privateKey: Buffer.from(privateKey).toString('hex'),
    publicKey: Buffer.from(publicKey).toString('hex'),
    address: `0x${Buffer.from(address).toString('hex')}`,
  };
}

// Generate 3 key pairs
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
