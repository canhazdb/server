import fs from 'fs/promises';
import path from 'path';
import { execa } from 'execa';

export default async function generateSelfSignedCert(tempDir: string) {
  const domain = "localhost";
  const daysValid = 365;
  const keyFile = "key.pem";
  const certFile = "cert.pem";

  const certsDir = path.join(tempDir, 'certs');
  await fs.mkdir(certsDir, { recursive: true });

  const keyPath = path.join(certsDir, keyFile);
  const certPath = path.join(certsDir, certFile);

  try {
    // Check if certificates already exist
    const [keyExists, certExists] = await Promise.all([
      fs.access(keyPath).then(() => true).catch(() => false),
      fs.access(certPath).then(() => true).catch(() => false)
    ]);

    if (keyExists && certExists) {
      console.log("Existing SSL Certificate found. Reusing...");
      const key = await fs.readFile(keyPath, 'utf8');
      const cert = await fs.readFile(certPath, 'utf8');
      return { cert, key };
    }

    // Generate new certificates
    // Generate private key
    await execa('openssl', [
      'genrsa',
      '-out',
      keyPath,
      '2048'
    ]);

    // Generate CSR (Certificate Signing Request)
    await execa('openssl', [
      'req',
      '-new',
      '-key',
      keyPath,
      '-out',
      path.join(certsDir, 'csr.pem'),
      '-subj',
      `/CN=${domain}`
    ]);

    // Generate self-signed certificate
    await execa('openssl', [
      'x509',
      '-req',
      '-days',
      daysValid.toString(),
      '-in',
      path.join(certsDir, 'csr.pem'),
      '-signkey',
      keyPath,
      '-out',
      certPath
    ]);

    // Remove CSR file
    await fs.unlink(path.join(certsDir, 'csr.pem'));

    // Set permissions
    await fs.chmod(keyPath, 0o400);
    await fs.chmod(certPath, 0o444);

    // Read generated files
    const key = await fs.readFile(keyPath, 'utf8');
    const cert = await fs.readFile(certPath, 'utf8');

    console.log("SSL Certificate generated successfully!");

    return {
      cert,
      key
    };
  } catch (error) {
    console.error('Error generating self-signed certificate:', error);
    throw error;
  }
}
