import express, { Request, Response } from 'express';
import cors from 'cors';
import { keccak256 } from 'ethereum-cryptography/keccak';
import { utf8ToBytes } from 'ethereum-cryptography/utils';
import { verifySignatureAndGetAddress } from './crypto';

const app = express();
const port = 3042;

app.use(cors());
app.use(express.json());

interface Balances {
  [address: string]: number;
}

const balances: Balances = {
  '0x5c134bd1119da76fdd9e9c53516d7010b99b88dd': 100,
  '0xbdec47d97e106e32c7c92824735c96b57b248c2b': 50,
  '0x58996da52a56c3c0e54bd84a6ef52c478079152a': 75,
};

interface TransactionMessage {
  sender: string;
  recipient: string;
  amount: number;
}

interface SendRequestBody {
  message: TransactionMessage;
  signature: string;
  recovery: number;
  messageHash: string;
}

app.get('/balance/:address', (req: Request, res: Response) => {
  const { address } = req.params;
  const balance = balances[address] || 0;
  res.send({ balance });
});

app.post('/send', (req: Request<object, object, SendRequestBody>, res: Response) => {
  try {
    const { message, signature, recovery, messageHash } = req.body;
    const { sender, recipient, amount } = message;

    // Verify the message hash matches the message
    const messageString = JSON.stringify(message);
    const messageBytes = utf8ToBytes(messageString);
    const computedHash = Buffer.from(keccak256(messageBytes)).toString('hex');

    if (computedHash !== messageHash) {
      res.status(400).send({ message: 'Invalid message hash!' });
      return;
    }

    // Recover the address from the signature
    const recoveredAddress = verifySignatureAndGetAddress(messageHash, signature, recovery);

    // Verify the recovered address matches the sender
    if (recoveredAddress.toLowerCase() !== sender.toLowerCase()) {
      res.status(401).send({ message: 'Invalid signature! Authentication failed.' });
      return;
    }

    setInitialBalance(sender);
    setInitialBalance(recipient);

    if (balances[sender] < amount) {
      res.status(400).send({ message: 'Not enough funds!' });
    } else {
      balances[sender] -= amount;
      balances[recipient] += amount;
      res.send({ balance: balances[sender] });
    }
  } catch (error) {
    console.error('Error processing transaction:', error);
    res.status(500).send({ message: 'Error processing transaction' });
  }
});

app.listen(port, () => {
  console.log(`Listening on port ${port}!`);
});

function setInitialBalance(address: string): void {
  if (!balances[address]) {
    balances[address] = 0;
  }
}
