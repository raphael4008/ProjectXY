#!/bin/bash
# Quick Start - ProjectXY Sovereign Command Center

set -e

echo "🚀 ProjectXY - Sovereign Command Center Quick Start"
echo "=================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Check prerequisites
echo -e "${CYAN}Checking prerequisites...${NC}"
command -v docker &> /dev/null || { echo -e "${RED}❌ Docker not found${NC}"; exit 1; }
command -v docker-compose &> /dev/null || { echo -e "${RED}❌ Docker Compose not found${NC}"; exit 1; }
command -v python3 &> /dev/null || { echo -e "${RED}❌ Python 3 not found${NC}"; exit 1; }
command -v node &> /dev/null || { echo -e "${RED}❌ Node.js not found${NC}"; exit 1; }
echo -e "${GREEN}✓ All prerequisites found${NC}"
echo ""

# Setup backend
echo -e "${CYAN}Setting up backend...${NC}"
cd backend

# Create Python virtual environment
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "Installing Python dependencies..."
pip install -q -r requirements.txt

# Setup environment
if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    cat > .env << 'EOF'
DATABASE_URL=postgresql://projectxy:projectxy@localhost:5432/projectxy
REDIS_URL=redis://localhost:6379
SECRET_KEY=your-secret-key-change-in-production
DOCKER_HOST=unix:///var/run/docker.sock
EXECUTION_TIMEOUT_SECONDS=300
EXECUTION_MEMORY_MB=512
EXECUTION_CPU_QUOTA=1.0
EOF
    echo -e "${YELLOW}⚠️  .env created with defaults. Update SECRET_KEY for production!${NC}"
fi

cd ..
echo -e "${GREEN}✓ Backend setup complete${NC}"
echo ""

# Setup frontend
echo -e "${CYAN}Setting up frontend...${NC}"
cd frontend

# Install npm dependencies
if [ ! -d "node_modules" ]; then
    echo "Installing npm dependencies..."
    npm install -q
fi

cd ..
echo -e "${GREEN}✓ Frontend setup complete${NC}"
echo ""

# Docker services
echo -e "${CYAN}Starting Docker services (PostgreSQL, Redis)...${NC}"
docker-compose up -d postgres redis
echo -e "${GREEN}✓ Services started${NC}"
echo ""

# Wait for services to be ready
echo -e "${CYAN}Waiting for services to be ready...${NC}"
sleep 5

# Database migrations
echo -e "${CYAN}Running database migrations...${NC}"
cd backend
source venv/bin/activate
python -m alembic upgrade head 2>/dev/null || echo -e "${YELLOW}Note: Alembic not configured${NC}"
cd ..
echo -e "${GREEN}✓ Migrations complete${NC}"
echo ""

# Start services
echo -e "${CYAN}Starting ProjectXY services...${NC}"
echo ""

# Backend in background
echo -e "${YELLOW}Starting backend on http://localhost:8000${NC}"
cd backend
source venv/bin/activate
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
cd ..

# Frontend in background
echo -e "${YELLOW}Starting frontend on http://localhost:3000${NC}"
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo -e "${GREEN}✅ ProjectXY is starting!${NC}"
echo ""
echo -e "${CYAN}Access the system:${NC}"
echo "  🌐 Frontend:  http://localhost:3000"
echo "  🔌 Backend:   http://localhost:8000"
echo "  📚 API Docs:  http://localhost:8000/api/v1/docs"
echo ""
echo -e "${CYAN}Services:${NC}"
echo "  🗄️  PostgreSQL: localhost:5432"
echo "  💾 Redis:      localhost:6379"
echo ""
echo -e "${YELLOW}Quick Commands:${NC}"
echo "  📊 List scripts:      curl http://localhost:8000/api/v1/ops/scripts"
echo "  🎯 Get script:        curl http://localhost:8000/api/v1/ops/scripts/{id}"
echo "  🚀 Execute script:    curl -X POST http://localhost:8000/api/v1/ops/execute/{id}"
echo "  🔒 System lockdown:   curl -X POST http://localhost:8000/api/v1/ops/lockdown"
echo "  🔓 Release lockdown:  curl -X POST http://localhost:8000/api/v1/ops/lockdown/release"
echo ""
echo -e "${YELLOW}WebSocket:${NC}"
echo "  ws://localhost:8000/api/v1/ops/ws/execute/{script_id}"
echo ""
echo -e "${CYAN}Logs:${NC}"
echo "  Backend PID:  $BACKEND_PID"
echo "  Frontend PID: $FRONTEND_PID"
echo ""
echo -e "${YELLOW}To stop services, press Ctrl+C or run:${NC}"
echo "  kill $BACKEND_PID $FRONTEND_PID"
echo "  docker-compose down"
echo ""
echo -e "${GREEN}System ready! Open http://localhost:3000 in your browser.${NC}"
echo ""

# Keep script running
wait
