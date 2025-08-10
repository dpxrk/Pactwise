.PHONY: help dev dev-ml prod test clean install setup migrate

# Default target
help:
	@echo "PactWise Backend - Available Commands:"
	@echo ""
	@echo "Development:"
	@echo "  make dev          - Start core services (Supabase, Redis)"
	@echo "  make dev-ml       - Start core + ML services"
	@echo "  make dev-all      - Start all services including monitoring"
	@echo ""
	@echo "Setup:"
	@echo "  make install      - Install dependencies"
	@echo "  make setup        - Initial setup (install + migrate)"
	@echo "  make migrate      - Run database migrations"
	@echo ""
	@echo "ML Services:"
	@echo "  make ml-notebook  - Start Jupyter notebook for ML development"
	@echo "  make ml-train     - Train ML models"
	@echo "  make ml-test      - Test ML services"
	@echo ""
	@echo "Testing:"
	@echo "  make test         - Run all tests"
	@echo "  make test-ts      - Run TypeScript tests"
	@echo "  make test-py      - Run Python tests"
	@echo ""
	@echo "Production:"
	@echo "  make prod         - Start production services"
	@echo "  make build        - Build production images"
	@echo ""
	@echo "Utilities:"
	@echo "  make logs         - Show logs from all services"
	@echo "  make clean        - Stop and remove all containers"
	@echo "  make reset        - Clean + remove volumes (DESTRUCTIVE)"

# Development commands
dev:
	@echo "Starting core development services..."
	docker-compose up postgres redis edge-runtime supabase-studio postgres-meta

dev-ml:
	@echo "Starting development with ML services..."
	docker-compose --profile ml up

dev-all:
	@echo "Starting all development services..."
	docker-compose --profile ml --profile monitoring --profile tools up

# Setup commands
install:
	@echo "Installing dependencies..."
	cd supabase && npm install
	@if [ -f ml-services/contract-intelligence/requirements.txt ]; then \
		echo "Installing Python dependencies..."; \
		pip install -r ml-services/contract-intelligence/requirements.txt; \
	fi

setup: install migrate
	@echo "Setup complete!"

migrate:
	@echo "Running database migrations..."
	cd supabase && npx supabase db push

# ML commands
ml-notebook:
	@echo "Starting Jupyter notebook..."
	docker-compose --profile ml-dev up ml-notebook

ml-train:
	@echo "Training ML models..."
	@if [ -f ml-models/training/train_all.py ]; then \
		docker-compose run --rm contract-intelligence python /app/training/train_all.py; \
	else \
		echo "Training scripts not found. Creating placeholder..."; \
		mkdir -p ml-models/training; \
		echo "# Add training scripts here" > ml-models/training/train_all.py; \
	fi

ml-test:
	@echo "Testing ML services..."
	docker-compose --profile ml run --rm contract-intelligence pytest
	docker-compose --profile ml run --rm vendor-risk pytest
	docker-compose --profile ml run --rm negotiation-ai pytest

# Testing commands
test: test-ts test-py
	@echo "All tests completed!"

test-ts:
	@echo "Running TypeScript tests..."
	cd supabase && npm test

test-py:
	@echo "Running Python tests..."
	@if [ -d ml-services/contract-intelligence/tests ]; then \
		docker-compose run --rm contract-intelligence pytest; \
	else \
		echo "Python tests not found"; \
	fi

# Production commands
prod:
	@echo "Starting production services..."
	docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

build:
	@echo "Building production images..."
	docker-compose build --no-cache

# Utility commands
logs:
	docker-compose logs -f

logs-ml:
	docker-compose logs -f contract-intelligence vendor-risk negotiation-ai

ps:
	docker-compose ps

clean:
	@echo "Stopping and removing containers..."
	docker-compose down

reset:
	@echo "WARNING: This will delete all data!"
	@read -p "Are you sure? (y/N): " confirm && [ "$$confirm" = "y" ] || exit 1
	docker-compose down -v
	rm -rf ml-models/data/*

# Database commands
db-shell:
	docker-compose exec postgres psql -U postgres

db-backup:
	@echo "Creating database backup..."
	docker-compose exec postgres pg_dump -U postgres > backups/backup_$(shell date +%Y%m%d_%H%M%S).sql

db-restore:
	@echo "Restoring database from backup..."
	@read -p "Enter backup file path: " backup_file; \
	docker-compose exec -T postgres psql -U postgres < $$backup_file

# Service-specific commands
redis-cli:
	docker-compose exec redis redis-cli

# Health checks
health:
	@echo "Checking service health..."
	@docker-compose ps
	@echo ""
	@echo "Database:"
	@docker-compose exec postgres pg_isready -U postgres || echo "Database not ready"
	@echo ""
	@echo "Redis:"
	@docker-compose exec redis redis-cli ping || echo "Redis not ready"

# Environment setup
env-setup:
	@if [ ! -f .env ]; then \
		echo "Creating .env file from template..."; \
		cp .env.example .env; \
		echo "Please edit .env file with your configuration"; \
	else \
		echo ".env file already exists"; \
	fi