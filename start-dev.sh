
echo "Starting TrackSheets Development Servers..."

# Start backend in background
cd tracksheets-backend
python app.py &
BACKEND_PID=$!

# Start frontend
cd ../tracksheets-frontend
npm run dev

# Cleanup on exit
trap "kill $BACKEND_PID" EXIT