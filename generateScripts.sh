#!/bin/bash

# Set variables
DOMAIN="localhost"
DAYS_VALID=365
KEY_FILE="key.pem"
CERT_FILE="cert.pem"

# Create directory for certificates if it doesn't exist
mkdir -p certs
cd certs

# Generate private key
openssl genrsa -out $KEY_FILE 2048

# Generate CSR (Certificate Signing Request)
openssl req -new -key $KEY_FILE -out csr.pem -subj "/CN=$DOMAIN"

# Generate self-signed certificate
openssl x509 -req -days $DAYS_VALID -in csr.pem -signkey $KEY_FILE -out $CERT_FILE

# Remove CSR file
rm csr.pem

# Set permissions
chmod 400 $KEY_FILE
chmod 444 $CERT_FILE

echo "SSL Certificate generated successfully!"
echo "Private Key: $KEY_FILE"
echo "Certificate: $CERT_FILE"
