#!/bin/bash
# Start Services & Live Log Stream

echo "🚀 Starting all ProjectXY services..."

# 1. Build and start containers in detached mode
# --build: Forces a build of the images from Dockerfiles
# --force-recreate: Ensures containers are recreated, which is good after a reset
docker-compose up -d --build --force-recreate

echo "✅ Services started."
echo "📡 Implementing Live Streaming Log System..."
echo "Piping the 'AI Thinking Process' and all service logs directly to the terminal."
echo "Press Ctrl+C to exit the log stream (the services will continue to run in the background)."

# 2. Follow the logs of all services
docker-compose logs -f
