import React, { useState } from 'react';
import { AxiosError } from 'axios';
import server from './server';
import { signTransaction } from './crypto';

interface TransferProps {
  address: string;
  setBalance: (balance: number) => void;
  privateKey: string;
}

function Transfer({ address, setBalance, privateKey }: TransferProps) {
  const [sendAmount, setSendAmount] = useState<string>('');
  const [recipient, setRecipient] = useState<string>('');

  const setValue = (setter: (value: string) => void) => (
    evt: React.ChangeEvent<HTMLInputElement>,
  ) => setter(evt.target.value);

  async function transfer(evt: React.FormEvent) {
    evt.preventDefault();

    if (!privateKey) {
      alert('Please enter your private key in the wallet section first');
      return;
    }

    try {
      // Create the transaction message
      const message = {
        sender: address,
        amount: parseInt(sendAmount, 10),
        recipient,
      };

      console.log('Signing transaction:', message);

      // Sign the transaction
      const { signature, recovery, messageHash } = await signTransaction(privateKey, message);

      console.log('Transaction signed:', { signature, recovery, messageHash });

      // Send the signed transaction to the server
      const {
        data: { balance },
      } = await server.post<{ balance: number }>('send', {
        message,
        signature,
        recovery,
        messageHash,
      });
      setBalance(balance);
      alert('Transaction successful!');
    } catch (ex) {
      const error = ex as AxiosError<{ message: string }>;
      console.error('Transaction error:', error);
      console.error('Error response:', error.response?.data);
      const errorMessage = error.response?.data?.message || error.message || 'An error occurred';
      alert(`Transaction failed: ${errorMessage}`);
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
        />
      </label>

      <label>
        Recipient
        <input
          placeholder="Type an address, for example: 0x2"
          value={recipient}
          onChange={setValue(setRecipient)}
        />
      </label>

      <input type="submit" className="button" value="Transfer" />
    </form>
  );
}

export default Transfer;
