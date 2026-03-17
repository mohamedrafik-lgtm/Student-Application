#!/bin/bash

# Copy Baileys wrapper to dist folder after build
echo "Copying Baileys wrapper to dist folder..."

# Create directory if it doesn't exist
mkdir -p dist/src/whatsapp

# Copy the wrapper file
cp src/whatsapp/baileys-wrapper.mjs dist/src/whatsapp/

echo "✅ Baileys wrapper copied successfully!"