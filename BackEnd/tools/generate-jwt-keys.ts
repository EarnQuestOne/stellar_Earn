import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';

// Generate RSA key pair using OpenSSL
function generateKeys() {
  try {
    // Check if OpenSSL is available
    const opensslCheck = spawnSync('openssl', ['version'], {
      encoding: 'utf8',
    });
    if (opensslCheck.error) {
      console.log(
        'OpenSSL not found. Please install OpenSSL or use an alternative method.',
      );
      return;
    }

    // Generate private key
    const privateKeyPath = path.join(__dirname, 'jwt-keys.pem');
    const privateKeyResult = spawnSync(
      'openssl',
      [
        'genpkey',
        '-algorithm',
        'RSA',
        '-out',
        privateKeyPath,
        '-pkeyopt',
        'rsa_keygen_bits:2048',
      ],
      { encoding: 'utf8' },
    );

    if (privateKeyResult.error || privateKeyResult.status !== 0) {
      console.log(
        'Failed to generate private key:',
        privateKeyResult.error || privateKeyResult.stderr,
      );
      return;
    }

    // Generate public key
    const publicKeyPath = path.join(__dirname, 'jwt-keys.pub');
    const publicKeyResult = spawnSync(
      'openssl',
      ['rsa', '-pubout', '-in', privateKeyPath, '-out', publicKeyPath],
      { encoding: 'utf8' },
    );

    if (publicKeyResult.error || publicKeyResult.status !== 0) {
      console.log(
        'Failed to generate public key:',
        publicKeyResult.error || publicKeyResult.stderr,
      );
      return;
    }

    console.log('✅ JWT keys generated successfully!');
    console.log(`Private key saved to: ${privateKeyPath}`);
    console.log(`Public key saved to: ${publicKeyPath}`);

    // Read and display the keys
    const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
    const publicKey = fs.readFileSync(publicKeyPath, 'utf8');

    console.log('\n🔑 Private Key (add to .env):');
    console.log(privateKey.substring(0, 200) + '...');

    console.log('\n🔑 Public Key (add to .env):');
    console.log(publicKey.substring(0, 200) + '...');
  } catch (error) {
    console.log('Error generating keys:', error);
  }
}

generateKeys();
