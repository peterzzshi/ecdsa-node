import React from 'react';
import * as secp from '@noble/secp256k1';
import { keccak_256 } from '@noble/hashes/sha3';
import server from './server';

interface WalletProps {
  address: string;
  setAddress: (address: string) => void;
  balance: number;
  setBalance: (balance: number) => void;
  privateKey: string;
  setPrivateKey: (privateKey: string) => void;
}

function Wallet({
  address,
  setAddress,
  balance,
  setBalance,
  privateKey,
  setPrivateKey,
}: WalletProps) {

  function deriveAddress(privateKey: string): string {
    try {
      const cleanPrivKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;

      // Validate hex string
      if (!/^[0-9a-fA-F]{64}$/.test(cleanPrivKey)) {
        return '';
      }

      // Get uncompressed public key (65 bytes: 0x04 + 32 bytes X + 32 bytes Y)
      const publicKey = secp.getPublicKey(secp.etc.hexToBytes(cleanPrivKey), false);

      // Remove the 0x04 prefix (first byte)
      const publicKeyWithoutPrefix = publicKey.slice(1);

      // Hash the public key using Keccak-256
      const hash = keccak_256(publicKeyWithoutPrefix);

      // Take the last 20 bytes as the address
      const addressBytes = hash.slice(-20);

      return `0x${secp.etc.bytesToHex(addressBytes)}`;
    } catch {
      return '';
    }
  }

  async function onAddressChange(evt: React.ChangeEvent<HTMLInputElement>) {
    const newAddress = evt.target.value;
    setAddress(newAddress);

    // Validate address format (starts with 0x and has 40 hex characters)
    const cleanAddress = newAddress.startsWith('0x') ? newAddress.slice(2) : newAddress;
    const isValidAddress = /^[0-9a-fA-F]{40}$/.test(cleanAddress);

    if (isValidAddress) {
      try {
        const {
          data: { balance: newBalance },
        } = await server.get<{ balance: number }>(`balance/${newAddress}`);
        setBalance(newBalance);
      } catch {
        setBalance(0);
      }
    } else {
      setBalance(0);
    }
  }

  async function onPrivateKeyChange(evt: React.ChangeEvent<HTMLInputElement>) {
    const newPrivateKey = evt.target.value;
    setPrivateKey(newPrivateKey);

    const derivedAddress = deriveAddress(newPrivateKey);

    if (derivedAddress) {
      setAddress(derivedAddress);
      try {
        const {
          data: { balance: newBalance },
        } = await server.get<{ balance: number }>(`balance/${derivedAddress}`);
        setBalance(newBalance);
      } catch {
        setBalance(0);
      }
    }
  }

  return (
    <div className="container wallet">
      <h1>Your Wallet</h1>

      <label>
          Address
        <input
          placeholder="Type an address to view balance, for example: 0x1a2b3c..."
          value={address}
          onChange={onAddressChange}
        />
      </label>

      <label>
            Private Key (optional, required for transactions)
        <input
          placeholder="Type your private key to sign transactions, for example: 0xa1b2c3..."
          value={privateKey}
          onChange={onPrivateKeyChange}
          type="password"
        />
      </label>

      <div className="balance">
        Balance:
        {' '}
        {address ? balance : 'Enter an address to view balance'}
      </div>
    </div>
  );
}

export default Wallet;
