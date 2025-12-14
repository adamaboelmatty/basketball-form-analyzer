#!/bin/bash

# ARC App - Environment Setup Script
# This script creates your .env file with the correct Firebase credentials

echo "🏀 Setting up ARC App environment..."

# Check if .env already exists
if [ -f .env ]; then
    echo "⚠️  .env file already exists!"
    read -p "Do you want to overwrite it? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Setup cancelled"
        exit 1
    fi
fi

# Copy from example
cp .env.example .env

echo "✅ .env file created successfully!"
echo ""
echo "📋 Environment variables configured:"
echo "  - Backend API: https://arc-api-564361317418.us-central1.run.app"
echo "  - Firebase Project: arc-ai-481122"
echo "  - Auth providers: Email/Password, Apple, Google"
echo ""
echo "🚀 Next steps:"
echo "  1. Clear cache: rm -rf node_modules/.cache .expo"
echo "  2. Start app: npm start -- --clear"
echo "  3. Test signup with: test@arc.basketball / Test123456"
echo ""
echo "📖 See TESTING_GUIDE.md for complete testing instructions"
