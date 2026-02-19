#!/bin/bash

# Jai Bharat Setup Script
# This script sets up the development environment

set -e

echo "🇮🇳 Setting up Jai Bharat Super-App..."
echo ""

# Check Node.js version
echo "Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
if [ "$NODE_VERSION" -lt 16 ]; then
  echo "❌ Node.js version must be >= 16.x"
  echo "   Current version: $(node -v)"
  exit 1
fi
echo "✅ Node.js version: $(node -v)"
echo ""

# Install root dependencies
echo "Installing root dependencies..."
npm install
echo "✅ Root dependencies installed"
echo ""

# Install module dependencies
echo "Installing Learn Govt Jobs module dependencies..."
cd modules/learn-govt-jobs
npm install
cd ../..
echo "✅ Learn Govt Jobs dependencies installed"
echo ""

echo "Installing Learn IAS module dependencies..."
cd modules/learn-ias
npm install
cd ../..
echo "✅ Learn IAS dependencies installed"
echo ""

# Create environment file
if [ ! -f .env ]; then
  echo "Creating .env file..."
  cat > .env << EOF
# Jai Bharat Environment Configuration
NODE_ENV=development

# API Configuration
API_BASE_URL=http://localhost:3000/v1

# Bhashini API (Voice)
BHASHINI_API_KEY=your-api-key-here
BHASHINI_USER_ID=your-user-id-here
BHASHINI_BASE_URL=https://api.bhashini.gov.in

# DigiLocker
DIGILOCKER_CLIENT_ID=your-client-id-here
DIGILOCKER_CLIENT_SECRET=your-client-secret-here

# WhatsApp Business API
WHATSAPP_API_KEY=your-api-key-here
WHATSAPP_PHONE_ID=your-phone-id-here
WHATSAPP_BUSINESS_ID=your-business-id-here

# AI/ML
GEMINI_API_KEY=your-gemini-api-key-here

# External Job APIs
API_SETU_KEY=your-api-key-here
OGD_API_KEY=your-api-key-here
NCS_API_KEY=your-api-key-here
EOF
  echo "✅ .env file created"
  echo "⚠️  Please update .env with your actual API keys"
else
  echo "ℹ️  .env file already exists, skipping..."
fi
echo ""

# Check for Android setup
echo "Checking Android setup..."
if command -v adb &> /dev/null; then
  echo "✅ Android SDK found"
else
  echo "⚠️  Android SDK not found"
  echo "   Install Android Studio for Android development"
fi
echo ""

# Check for iOS setup (macOS only)
if [[ "$OSTYPE" == "darwin"* ]]; then
  echo "Checking iOS setup..."
  if command -v pod &> /dev/null; then
    echo "✅ CocoaPods found"
    echo "Installing iOS dependencies..."
    cd ios
    pod install
    cd ..
    echo "✅ iOS dependencies installed"
  else
    echo "⚠️  CocoaPods not found"
    echo "   Install with: sudo gem install cocoapods"
  fi
else
  echo "ℹ️  iOS setup skipped (macOS only)"
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update .env with your API keys"
echo "2. Start Metro bundler: npm start"
echo "3. Run on Android: npm run android"
echo "4. Run on iOS: npm run ios"
echo ""
echo "Documentation:"
echo "  📖 Architecture: docs/architecture.md"
echo "  📖 API Docs: docs/api.md"
echo "  📖 Module Integration: docs/module-integration.md"
echo ""
echo "Need help? Email: dev@jaibharat.cloud"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
