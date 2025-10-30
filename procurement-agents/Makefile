# Makefile for Procurement Agents System

.PHONY: help setup docker-up docker-down db-setup db-migrate db-init run test clean

# Colors for output
RED := \033[0;31m
GREEN := \033[0;32m
YELLOW := \033[1;33m
NC := \033[0m # No Color

help: ## Show this help message
	@echo '${YELLOW}Usage:${NC}'
	@echo '  ${GREEN}make${NC} ${YELLOW}[target]${NC}'
	@echo ''
	@echo '${YELLOW}Available targets:${NC}'
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  ${GREEN}%-15s${NC} %s\n", $$1, $$2}'

setup: ## Complete project setup (Docker + Database + Dependencies)
	@echo '${YELLOW}Setting up Procurement Agents System...${NC}'
	@pip install -r requirements.txt
	@cp -n .env.example .env || true
	@chmod +x scripts/setup_database.sh
	@./scripts/setup_database.sh

docker-up: ## Start all Docker services
	@echo '${YELLOW}Starting Docker services...${NC}'
	@docker-compose up -d
	@echo '${GREEN}✓ Services started${NC}'
	@docker-compose ps

docker-down: ## Stop all Docker services
	@echo '${YELLOW}Stopping Docker services...${NC}'
	@docker-compose down
	@echo '${GREEN}✓ Services stopped${NC}'

docker-logs: ## Show Docker logs
	@docker-compose logs -f

db-setup: ## Setup database (create tables and run migrations)
	@echo '${YELLOW}Setting up database...${NC}'
	@docker-compose up -d postgres
	@sleep 5
	@alembic revision --autogenerate -m "Initial models" || true
	@alembic upgrade head
	@echo '${GREEN}✓ Database setup complete${NC}'

db-migrate: ## Create a new database migration
	@echo '${YELLOW}Creating database migration...${NC}'
	@read -p "Enter migration message: " msg; \
	alembic revision --autogenerate -m "$$msg"

db-upgrade: ## Apply database migrations
	@echo '${YELLOW}Applying database migrations...${NC}'
	@alembic upgrade head
	@echo '${GREEN}✓ Migrations applied${NC}'

db-downgrade: ## Rollback last database migration
	@echo '${YELLOW}Rolling back last migration...${NC}'
	@alembic downgrade -1
	@echo '${GREEN}✓ Migration rolled back${NC}'

db-init: ## Initialize database with sample data
	@echo '${YELLOW}Initializing database with sample data...${NC}'
	@python scripts/init_db.py
	@echo '${GREEN}✓ Sample data created${NC}'

run: ## Run the FastAPI application
	@echo '${YELLOW}Starting FastAPI application...${NC}'
	@echo '${GREEN}API will be available at: http://localhost:8000${NC}'
	@echo '${GREEN}Swagger UI: http://localhost:8000/docs${NC}'
	@uvicorn api.main:app --reload --port 8000

run-prod: ## Run the application in production mode
	@echo '${YELLOW}Starting application in production mode...${NC}'
	@uvicorn api.main:app --host 0.0.0.0 --port 8000 --workers 4

test: ## Run tests
	@echo '${YELLOW}Running tests...${NC}'
	@pytest tests/ -v --cov=. --cov-report=html
	@echo '${GREEN}✓ Tests complete. Coverage report: htmlcov/index.html${NC}'

test-unit: ## Run unit tests only
	@echo '${YELLOW}Running unit tests...${NC}'
	@pytest tests/unit/ -v

test-integration: ## Run integration tests only
	@echo '${YELLOW}Running integration tests...${NC}'
	@pytest tests/integration/ -v

lint: ## Run code linting
	@echo '${YELLOW}Running linters...${NC}'
	@ruff check . || true
	@black --check . || true
	@mypy . || true
	@echo '${GREEN}✓ Linting complete${NC}'

format: ## Format code
	@echo '${YELLOW}Formatting code...${NC}'
	@black .
	@ruff check --fix .
	@echo '${GREEN}✓ Code formatted${NC}'

clean: ## Clean up generated files and caches
	@echo '${YELLOW}Cleaning up...${NC}'
	@find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	@find . -type f -name "*.pyc" -delete 2>/dev/null || true
	@find . -type f -name "*.pyo" -delete 2>/dev/null || true
	@find . -type f -name ".coverage" -delete 2>/dev/null || true
	@rm -rf htmlcov/ 2>/dev/null || true
	@rm -rf .pytest_cache/ 2>/dev/null || true
	@rm -rf .ruff_cache/ 2>/dev/null || true
	@echo '${GREEN}✓ Cleanup complete${NC}'

ps: ## Show running services
	@docker-compose ps

logs-postgres: ## Show PostgreSQL logs
	@docker-compose logs -f postgres

logs-redis: ## Show Redis logs
	@docker-compose logs -f redis

logs-rabbitmq: ## Show RabbitMQ logs
	@docker-compose logs -f rabbitmq

shell-postgres: ## Open PostgreSQL shell
	@docker-compose exec postgres psql -U procurement_user -d procurement_db

shell-redis: ## Open Redis CLI
	@docker-compose exec redis redis-cli

rabbitmq-ui: ## Open RabbitMQ management UI
	@echo '${GREEN}Opening RabbitMQ Management UI...${NC}'
	@echo 'URL: http://localhost:15672'
	@echo 'Username: guest'
	@echo 'Password: guest'
	@python -m webbrowser http://localhost:15672

n8n-ui: ## Open n8n UI
	@echo '${GREEN}Opening n8n UI...${NC}'
	@echo 'URL: http://localhost:5678'
	@python -m webbrowser http://localhost:5678

monitoring: ## Show system monitoring dashboard
	@echo '${YELLOW}System Status:${NC}'
	@docker-compose ps
	@echo ''
	@echo '${YELLOW}Resource Usage:${NC}'
	@docker stats --no-stream

backup-db: ## Backup database
	@echo '${YELLOW}Backing up database...${NC}'
	@mkdir -p backups
	@docker-compose exec postgres pg_dump -U procurement_user procurement_db > backups/backup_$$(date +%Y%m%d_%H%M%S).sql
	@echo '${GREEN}✓ Database backed up to backups/ directory${NC}'

restore-db: ## Restore database from backup
	@echo '${YELLOW}Available backups:${NC}'
	@ls -la backups/*.sql 2>/dev/null || echo "No backups found"
	@read -p "Enter backup filename (from backups/ directory): " file; \
	docker-compose exec -T postgres psql -U procurement_user procurement_db < backups/$$file
	@echo '${GREEN}✓ Database restored${NC}'

# Development shortcuts
dev: docker-up db-setup db-init ## Full development environment setup
	@echo '${GREEN}✓ Development environment ready!${NC}'
	@echo '${YELLOW}Run "make run" to start the application${NC}'

reset: docker-down clean ## Reset everything (stop services and clean)
	@echo '${YELLOW}Removing Docker volumes...${NC}'
	@docker-compose down -v
	@echo '${GREEN}✓ Environment reset complete${NC}'

restart: docker-down docker-up ## Restart all Docker services
	@echo '${GREEN}✓ Services restarted${NC}'