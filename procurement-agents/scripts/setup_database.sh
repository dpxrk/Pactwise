#!/bin/bash

echo "🚀 Setting up Procurement Agents Database..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}Creating .env file from .env.example...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✓ .env file created${NC}"
fi

# Start PostgreSQL container
echo -e "${YELLOW}Starting PostgreSQL container...${NC}"
docker-compose up -d postgres

# Wait for PostgreSQL to be ready
echo -e "${YELLOW}Waiting for PostgreSQL to be ready...${NC}"
sleep 5

# Check if PostgreSQL is running
docker-compose ps postgres | grep -q "Up"
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ PostgreSQL is running${NC}"
else
    echo -e "${RED}✗ PostgreSQL failed to start${NC}"
    exit 1
fi

# Create initial migration if it doesn't exist
if [ ! -d "alembic/versions" ] || [ -z "$(ls -A alembic/versions)" ]; then
    echo -e "${YELLOW}Creating initial migration...${NC}"
    alembic revision --autogenerate -m "Initial models"
    echo -e "${GREEN}✓ Initial migration created${NC}"
fi

# Run migrations
echo -e "${YELLOW}Running database migrations...${NC}"
alembic upgrade head

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Database migrations completed successfully${NC}"
else
    echo -e "${RED}✗ Database migration failed${NC}"
    exit 1
fi

# Start other services
echo -e "${YELLOW}Starting Redis and RabbitMQ...${NC}"
docker-compose up -d redis rabbitmq

# Wait for services to be ready
sleep 5

# Check all services
echo -e "\n${YELLOW}Checking all services:${NC}"
docker-compose ps

echo -e "\n${GREEN}✅ Database setup complete!${NC}"
echo -e "\n${YELLOW}Services available at:${NC}"
echo "  • PostgreSQL: localhost:5432"
echo "  • Redis: localhost:6379"
echo "  • RabbitMQ: localhost:5672 (Management UI: localhost:15672)"
echo ""
echo -e "${YELLOW}Default credentials:${NC}"
echo "  • PostgreSQL: procurement_user / procurement_pass"
echo "  • RabbitMQ: guest / guest"
echo ""
echo -e "${GREEN}You can now run the application with:${NC}"
echo "  uvicorn api.main:app --reload --port 8000"