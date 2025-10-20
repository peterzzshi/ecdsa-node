# TypeScript Server

This is an Express server written in TypeScript with ESLint 9 and Airbnb style guide.

## Scripts

- `npm run dev` - Start the development server with hot reload
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Run the compiled JavaScript
- `npm run generate` - Generate private keys and Ethereum addresses
- `npm run lint` - Check code for linting errors
- `npm run lint:fix` - Auto-fix linting errors

## Development

The TypeScript source files are in the `src/` directory.
The compiled JavaScript files are output to the `dist/` directory.

## Generating Private Keys and Addresses

To generate private keys and their corresponding public keys (Ethereum addresses), run:

```bash
npm run generate
```

This script uses the `ethereum-cryptography` library to:
1. Generate random private keys using SECP256k1 elliptic curve cryptography
2. Derive the public key from each private key
3. Create Ethereum-style addresses (0x + 20 bytes) by:
   - Taking the Keccak-256 hash of the public key
   - Using the last 20 bytes of the hash as the address

The script will output 3 sets of credentials that you can use for testing:
- **Private Key**: Used for signing transactions (keep secure!)
- **Public Key**: The full uncompressed public key
- **Address**: The Ethereum-style address (0x...)

### Example Output

```
🔐 Generating key pairs...

Account 1:
Private Key: a1b2c3d4...
Public Key:  04e5f6g7...
Address:     0x1234567890abcdef...

Account 2:
...
```

### Usage

1. Use the **addresses** in your server's balance object
2. Use the **private keys** on the client side for signing transactions
3. **Never** commit private keys to version control!

## Linting

This project uses ESLint 9 with TypeScript support and follows Airbnb style guide conventions including:
- Single quotes
- 2-space indentation
- Semicolons required
- Trailing commas in multi-line objects/arrays
- Max line length of 100 characters
