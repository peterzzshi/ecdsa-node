import React, { useState } from 'react';
import { AxiosError } from 'axios';
import server from './server';
import { signTransaction } from './crypto';

interface TransferProps {
  address: string;
  setBalance: (balance: number) => void;
  privateKey: string;
}

interface ErrorResponse {
  code: string;
  message: string;
  details?: unknown;
}

function Transfer({ address, setBalance, privateKey }: TransferProps) {
  const [sendAmount, setSendAmount] = useState<string>('');
  const [recipient, setRecipient] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const setValue = (setter: (value: string) => void) => (
    evt: React.ChangeEvent<HTMLInputElement>,
  ) => setter(evt.target.value);

  async function transfer(evt: React.FormEvent) {
    evt.preventDefault();

    if (!privateKey) {
      alert('Please enter your private key in the wallet section first');
      return;
    }

    if (!recipient || !sendAmount) {
      alert('Please enter both recipient address and amount');
      return;
    }

    const amount = parseInt(sendAmount, 10);
    if (Number.isNaN(amount) || amount <= 0) {
      alert('Please enter a valid positive amount');
      return;
    }

    setIsLoading(true);

    try {
      // Fetch current nonce
      const { data: { nonce: currentNonce } } = await server.get<{ nonce: number }>(`nonce/${address}`);

      // Create the transaction message with nonce
      const message = {
        sender: address,
        recipient,
        amount,
        nonce: currentNonce + 1,
      };

      console.log('📝 Signing transaction:', message);

      // Sign the transaction
      const { signature, messageHash } = await signTransaction(privateKey, message);

      console.log('✍️  Transaction signed:', { signature: signature.slice(0, 20) + '...', messageHash: messageHash.slice(0, 20) + '...' });

      // Send the signed transaction to the server
      const {
        data,
      } = await server.post<{ balance: number; newNonce: number; recipient: { address: string; newBalance: number } }>('send', {
        message,
        signature,
        messageHash,
      });

      setBalance(data.balance);
      console.log('✅ Transaction successful!');
      console.log(`   Your new balance: ${data.balance}`);
      console.log(`   Recipient balance: ${data.recipient.newBalance}`);

      alert(`✅ Transaction successful!\n\nYour new balance: ${data.balance}\nRecipient's new balance: ${data.recipient.newBalance}`);

      // Clear form
      setSendAmount('');
      setRecipient('');
    } catch (ex) {
      const error = ex as AxiosError<ErrorResponse>;
      console.error('❌ Transaction error:', error);

      let errorMessage = 'An error occurred';

      if (error.response?.data) {
        const errorData = error.response.data;
        errorMessage = errorData.message;

        if (errorData.details) {
          console.error('Error details:', errorData.details);
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      alert(`❌ Transaction failed: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form className="container transfer" onSubmit={transfer}>
      <h1>Send Transaction</h1>

      <label>
        Send Amount
        <input
          placeholder="1, 2, 3..."
          value={sendAmount}
          onChange={setValue(setSendAmount)}
          disabled={isLoading}
          type="number"
          min="1"
        />
      </label>

      <label>
        Recipient
        <input
          placeholder="Type an address, for example: 0x2b3c..."
          value={recipient}
          onChange={setValue(setRecipient)}
          disabled={isLoading}
        />
      </label>

      <input
        type="submit"
        className="button"
        value={isLoading ? 'Processing...' : 'Transfer'}
        disabled={isLoading}
      />

      {isLoading && <p style={{ marginTop: '10px', color: '#666' }}>⏳ Processing transaction...</p>}
    </form>
  );
}

export default Transfer;
