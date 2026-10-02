import * as fs from 'fs';
import * as path from 'path';
import { generateKeyPairSync } from 'crypto';

// Generate RSA key pair using Node.js crypto module
function generateKeys() {
  try {
    // Generate 2048-bit RSA key pair
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
        cipher: 'aes-256-cbc',
        passphrase: 'stellar-earn-secret',
      },
    });

    // Save private key
    const privateKeyPath = path.join(__dirname, 'jwt-keys.pem');
    fs.writeFileSync(privateKeyPath, privateKey);

    // Save public key
    const publicKeyPath = path.join(__dirname, 'jwt-keys.pub');
    fs.writeFileSync(publicKeyPath, publicKey);

    console.log('✅ JWT keys generated successfully!');
    console.log(`Private key saved to: ${privateKeyPath}`);
    console.log(`Public key saved to: ${publicKeyPath}`);

    // Display key information
    console.log('\n🔑 Private Key (add to .env):');
    console.log(privateKey.substring(0, 200) + '...');

    console.log('\n🔑 Public Key (add to .env):');
    console.log(publicKey.substring(0, 200) + '...');
  } catch (error) {
    console.log('Error generating keys:', error);
  }
}

generateKeys();
