#!/bin/bash

# AeroSign End-to-End Test Script
echo "🚀 Starting AeroSign End-to-End Test"

# Check if we're in the right directory
if [[ ! -f "api/main.py" ]]; then
    echo "❌ Error: Please run this script from the AeroSign root directory"
    exit 1
fi

echo ""
echo "📋 Test Plan:"
echo "1. Start backend API server"  
echo "2. Start frontend development server"
echo "3. Test signature storage and verification workflow"
echo ""

# Create virtual environment if it doesn't exist
if [[ ! -d "venv" ]]; then
    echo "🔧 Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install backend dependencies (minimal set for testing)
echo "📦 Installing backend dependencies..."
pip install fastapi uvicorn pydantic -q

echo ""
echo "🔧 Starting backend API server..."
echo "Backend will be available at: http://127.0.0.1:8000"
echo "API documentation at: http://127.0.0.1:8000/docs"

# Start backend server in background
python api/main.py &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Check if backend is running
if ! curl -s http://127.0.0.1:8000/health > /dev/null; then
    echo "❌ Backend failed to start!"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

echo "✅ Backend started successfully!"

echo ""
echo "🔧 Checking frontend setup..."

# Check if frontend dependencies are installed
if [[ ! -d "frontend/node_modules" ]]; then
    echo "📦 Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
fi

echo ""
echo "🔧 Starting frontend development server..."
echo "Frontend will be available at: http://localhost:3000"

# Start frontend server
cd frontend
npm start &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ Both servers started!"
echo ""
echo "🧪 Test the following workflow:"
echo "1. Open browser to http://localhost:3000"
echo "2. Click 'Launch Signature Capture'"  
echo "3. Capture a signature using camera"
echo "4. Check for save confirmation message"
echo "5. Capture a second signature"
echo "6. Check for 'same person' verification result"
echo ""
echo "🔍 Monitor logs below for any issues..."
echo "Press Ctrl+C to stop both servers"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    wait
    echo "✅ Cleanup complete"
}

# Set up trap for cleanup
trap cleanup EXIT

# Wait for user to stop
wait