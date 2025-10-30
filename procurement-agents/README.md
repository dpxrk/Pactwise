# Procurement Agents System

An enterprise-scale procurement automation system using intelligent AI agents to handle end-to-end procurement processes with SAP integration.

## Overview

This system provides autonomous procurement capabilities through specialized agents that collaborate to automate procurement tasks, optimize spend, ensure compliance, and provide real-time insights while integrating seamlessly with existing ERP systems.

## Key Features

- **Intelligent Sourcing**: AI-powered supplier discovery and evaluation
- **Automated Purchase Orders**: End-to-end PO creation with ERP integration
- **Vendor Management**: Complete vendor lifecycle management
- **Smart Approvals**: Dynamic approval routing with escalation
- **Invoice Automation**: 3-way matching and exception handling
- **Spend Analytics**: Real-time insights and savings identification
- **Risk Monitoring**: Proactive supply chain risk assessment
- **Visual Workflows**: n8n integration for business user customization

## Agents

| Agent | Purpose | Key Capabilities |
|-------|---------|------------------|
| **Sourcing** | Find and evaluate suppliers | Web scraping, AI matching, RFQ automation |
| **Purchase Order** | Create and manage POs | SAP integration, budget validation, approval routing |
| **Vendor Management** | Manage vendor relationships | Onboarding, performance tracking, compliance |
| **Approval Workflow** | Route approvals dynamically | Matrix-based routing, escalation, delegation |
| **Invoice Processing** | Automate invoice handling | OCR, 3-way matching, GL coding |
| **Spend Analytics** | Analyze procurement patterns | Categorization, trends, savings opportunities |
| **Contract Management** | Manage contract lifecycle | Template management, negotiation, renewal |
| **RFQ/RFP** | Manage bidding processes | RFP creation, evaluation, recommendations |
| **Inventory** | Optimize inventory levels | Demand forecasting, auto-reordering, ABC analysis |
| **Risk Assessment** | Monitor supply chain risks | Vendor risks, market analysis, mitigation |

## Technology Stack

- **Backend**: Python 3.11+ with FastAPI
- **Agent Framework**: LangChain / Microsoft AutoGen
- **Workflow Automation**: n8n
- **ERP Integration**: PyRFC (SAP), REST APIs
- **Database**: PostgreSQL + Redis
- **Message Queue**: RabbitMQ / Kafka
- **Container**: Docker + Kubernetes
- **Monitoring**: Prometheus + Grafana

## Quick Start

### Prerequisites

- Python 3.11+
- Docker and Docker Compose
- PostgreSQL 14+
- Redis 6+
- n8n (optional, for visual workflows)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-org/procurement-agents.git
cd procurement-agents
```

2. Create environment file:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Start services with Docker Compose:
```bash
docker-compose up -d
```

5. Run database migrations:
```bash
alembic upgrade head
```

6. Start the FastAPI application:
```bash
uvicorn api.main:app --reload --port 8000
```

## Project Structure

```
procurement-agents/
├── agents/                 # Individual agent implementations
│   ├── sourcing/          # Sourcing agent
│   ├── purchase_order/    # PO agent with SAP integration
│   ├── vendor_management/ # Vendor management agent
│   └── ...                # Other agents
├── api/                   # FastAPI REST endpoints
├── integrations/          # External system integrations
│   ├── sap/              # SAP connector
│   └── n8n/              # n8n workflows
├── shared/                # Shared utilities and models
└── tests/                 # Test suites
```

## Configuration

### Environment Variables

Key configuration variables (see `.env.example` for full list):

```bash
DATABASE_URL=postgresql://user:password@localhost/procurement
REDIS_URL=redis://localhost:6379
RABBITMQ_URL=amqp://guest:guest@localhost:5672/
SAP_HOST=your-sap-host
SAP_CLIENT=your-client
N8N_WEBHOOK_URL=http://localhost:5678/webhook
```

### SAP Integration

Configure SAP connection in `.env`:
```bash
SAP_ASHOST=sap-server.company.com
SAP_SYSNR=00
SAP_CLIENT=100
SAP_USER=username
SAP_PASSWORD=password
```

## API Documentation

Once running, access the interactive API documentation:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Example API Calls

#### Create Sourcing Request
```bash
curl -X POST http://localhost:8000/api/v1/sourcing/request \
  -H "Content-Type: application/json" \
  -d '{
    "category": "office-supplies",
    "specifications": "A4 paper, 80gsm, white",
    "quantity": 1000,
    "required_by": "2024-03-01"
  }'
```

#### Create Purchase Order
```bash
curl -X POST http://localhost:8000/api/v1/purchase-order/create \
  -H "Content-Type: application/json" \
  -d '{
    "requisition_id": "REQ-2024-001",
    "vendor_id": "V12345",
    "items": [...]
  }'
```

## n8n Integration

### Setting Up n8n Workflows

1. Start n8n:
```bash
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n
```

2. Import workflow templates from `integrations/n8n/workflows/`

3. Configure webhook URLs in n8n to point to agent endpoints

### Example Workflow

```
[Form Trigger] → [Sourcing Agent] → [Approval Workflow] → 
[PO Agent] → [SAP Integration] → [Email Notification]
```

## Testing

Run the test suite:
```bash
# All tests
pytest

# Specific agent tests
pytest tests/test_sourcing_agent.py

# With coverage
pytest --cov=agents --cov-report=html
```

## Deployment

### Docker Deployment

Build and run with Docker:
```bash
# Build all services
docker-compose build

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

### Kubernetes Deployment

Deploy to Kubernetes cluster:
```bash
# Apply configurations
kubectl apply -f k8s/

# Check deployment status
kubectl get pods -n procurement

# Scale agents
kubectl scale deployment sourcing-agent --replicas=3
```

## Monitoring

### Metrics

Access Grafana dashboards at http://localhost:3000

Key metrics tracked:
- Agent response times
- Success/failure rates
- Cost savings achieved
- Procurement cycle time
- Vendor performance

### Logging

View centralized logs:
```bash
# All agents
docker-compose logs -f

# Specific agent
docker-compose logs -f sourcing-agent
```

## Development

### Adding a New Agent

1. Create agent directory: `agents/new_agent/`
2. Implement agent class inheriting from `BaseAgent`
3. Add FastAPI routes in `api/routers/`
4. Update docker-compose.yml
5. Add tests in `tests/`

### Code Standards

- Use type hints
- Follow PEP 8
- Write unit tests (minimum 80% coverage)
- Document all APIs
- Use async where possible

### Running Locally

```bash
# Install development dependencies
pip install -r requirements-dev.txt

# Run with hot reload
uvicorn api.main:app --reload

# Format code
black .

# Lint
flake8 .

# Type checking
mypy .
```

## Security

- OAuth2 authentication for APIs
- Encrypted credentials storage
- Role-based access control (RBAC)
- Audit logging for compliance
- Regular security scans

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## Troubleshooting

### Common Issues

**SAP Connection Failed**
- Verify SAP credentials in .env
- Check network connectivity
- Ensure PyRFC is properly installed

**Agent Not Responding**
- Check RabbitMQ connection
- Verify agent container is running
- Review agent logs for errors

**Database Connection Issues**
- Confirm PostgreSQL is running
- Check DATABASE_URL in .env
- Run migrations: `alembic upgrade head`

## Roadmap

### Phase 1 (Current)
- Core agents implementation
- SAP integration
- Basic n8n workflows

### Phase 2
- Advanced ML models
- Mobile approval app
- Natural language interface

### Phase 3
- Blockchain contracts
- Supplier portal
- Cross-organization collaboration

## Support

For issues and questions:
- Check [Documentation](./docs)
- Open an [Issue](https://github.com/your-org/procurement-agents/issues)
- Contact the team at procurement-agents@company.com

## License

This project is proprietary software. All rights reserved.

## Acknowledgments

- Built with FastAPI, LangChain, and n8n
- SAP integration via PyRFC
- AI/ML powered by OpenAI/Anthropic models