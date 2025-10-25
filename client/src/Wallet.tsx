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

function Wallet({ address, setAddress, balance, setBalance, privateKey, setPrivateKey }: WalletProps) {

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
    } catch (error) {
      return '';
    }
  }

  async function onChange(evt: React.ChangeEvent<HTMLInputElement>) {
    const newPrivateKey = evt.target.value;
    setPrivateKey(newPrivateKey);

    const derivedAddress = deriveAddress(newPrivateKey);
    setAddress(derivedAddress);

    if (derivedAddress) {
      try {
        const {
          data: { balance: newBalance },
        } = await server.get<{ balance: number }>(`balance/${derivedAddress}`);
        setBalance(newBalance);
      } catch (error) {
        setBalance(0);
      }
    } else {
      setBalance(0);
    }
  }

  return (
    <div className="container wallet">
      <h1>Your Wallet</h1>

      <label>
        Private Key
        <input
          placeholder="Type your private key, for example: 0xa1b2c3..."
          value={privateKey}
          onChange={onChange}
        />
      </label>

      <div className="address">
        Address:
        {' '}
        {address || 'Enter a valid private key'}
      </div>

      <div className="balance">
        Balance:
        {' '}
        {balance}
      </div>
    </div>
  );
}

export default Wallet;
