#!/bin/bash
set -e

SSL_DIR=/etc/nginx/ssl
CRT=$SSL_DIR/default.crt
KEY=$SSL_DIR/default.key

mkdir -p $SSL_DIR

# Generate self-signed certificate if missing
if [ ! -f "$CRT" ] || [ ! -f "$KEY" ]; then
    echo "Generating SSL certificate..."
    openssl req -x509 -nodes -days 365 \
        -newkey rsa:2048 \
        -keyout "$KEY" \
        -out "$CRT" \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
fi

chmod 600 "$KEY"
chmod 644 "$CRT"

echo "SSL setup complete"

# Test Nginx config
nginx -t

exec "$@"