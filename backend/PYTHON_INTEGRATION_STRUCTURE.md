# Python Integration Directory Structure

## Recommended Directory Structure

```
pactwise-fork/
├── backend/
│   ├── supabase/                    # Existing Supabase setup
│   │   ├── functions/               # Edge Functions (TypeScript/Deno)
│   │   │   ├── _shared/            # Shared TS utilities
│   │   │   ├── contracts/          # Contract endpoints
│   │   │   └── ml-gateway/         # NEW: Gateway to Python services
│   │   │       └── index.ts        # Routes requests to Python ML
│   │   └── migrations/
│   │
│   ├── ml-services/                 # NEW: Python ML Services
│   │   ├── shared/                  # Shared Python utilities
│   │   │   ├── __init__.py
│   │   │   ├── models.py           # Pydantic models
│   │   │   ├── database.py        # Database connections
│   │   │   └── utils.py           # Helper functions
│   │   │
│   │   ├── contract-intelligence/   # Contract Analysis Service
│   │   │   ├── Dockerfile
│   │   │   ├── requirements.txt
│   │   │   ├── app.py             # FastAPI app
│   │   │   ├── models/            # ML model files
│   │   │   │   ├── legal_bert/
│   │   │   │   └── risk_model.pt
│   │   │   ├── src/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── analyzers.py   # Analysis logic
│   │   │   │   ├── extractors.py  # Feature extraction
│   │   │   │   └── predictors.py  # Prediction logic
│   │   │   └── tests/
│   │   │       └── test_analysis.py
│   │   │
│   │   ├── vendor-risk/            # Vendor Risk Prediction Service
│   │   │   ├── Dockerfile
│   │   │   ├── requirements.txt
│   │   │   ├── app.py
│   │   │   ├── models/
│   │   │   └── src/
│   │   │
│   │   ├── negotiation-ai/         # Negotiation Intelligence Service
│   │   │   ├── Dockerfile
│   │   │   ├── requirements.txt
│   │   │   ├── app.py
│   │   │   └── src/
│   │   │
│   │   └── document-processing/    # Document Understanding Service
│   │       ├── Dockerfile
│   │       ├── requirements.txt
│   │       ├── app.py
│   │       └── src/
│   │
│   ├── ml-models/                   # NEW: Model Training & Management
│   │   ├── notebooks/              # Jupyter notebooks for experimentation
│   │   │   ├── contract_risk_analysis.ipynb
│   │   │   └── vendor_prediction.ipynb
│   │   ├── training/               # Training scripts
│   │   │   ├── train_contract_model.py
│   │   │   └── train_vendor_model.py
│   │   ├── data/                   # Training data (gitignored)
│   │   └── experiments/            # MLflow experiments
│   │
│   ├── docker-compose.yml          # Orchestrate all services
│   ├── docker-compose.dev.yml      # Development overrides
│   └── Makefile                    # Common commands
│
├── frontend/                        # Existing Next.js app
└── README.md
```

## Detailed Structure Examples

### 1. ML Gateway Edge Function
```typescript
// backend/supabase/functions/ml-gateway/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

const ML_SERVICES = {
  contract: Deno.env.get('CONTRACT_ML_SERVICE_URL') || 'http://contract-intelligence:8000',
  vendor: Deno.env.get('VENDOR_ML_SERVICE_URL') || 'http://vendor-risk:8000',
  negotiation: Deno.env.get('NEGOTIATION_ML_SERVICE_URL') || 'http://negotiation-ai:8000',
};

serve(async (req) => {
  const url = new URL(req.url);
  const service = url.pathname.split('/')[2]; // /ml-gateway/contract/analyze
  const endpoint = url.pathname.split('/').slice(3).join('/');
  
  if (!ML_SERVICES[service]) {
    return new Response('Service not found', { status: 404 });
  }
  
  const mlResponse = await fetch(`${ML_SERVICES[service]}/${endpoint}`, {
    method: req.method,
    headers: req.headers,
    body: req.body
  });
  
  return new Response(await mlResponse.text(), {
    status: mlResponse.status,
    headers: { ...corsHeaders, ...mlResponse.headers }
  });
});
```

### 2. Contract Intelligence Service
```python
# backend/ml-services/contract-intelligence/app.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from src.analyzers import ContractAnalyzer
from src.extractors import ClauseExtractor
from shared.models import ContractRequest, ContractResponse

app = FastAPI(title="Contract Intelligence Service")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize ML models
contract_analyzer = ContractAnalyzer()
clause_extractor = ClauseExtractor()

@app.post("/analyze", response_model=ContractResponse)
async def analyze_contract(request: ContractRequest):
    """Analyze a contract for risks and compliance."""
    try:
        # Extract clauses
        clauses = clause_extractor.extract(request.text)
        
        # Analyze risks
        risk_analysis = contract_analyzer.analyze_risk(request.text, clauses)
        
        # Check compliance
        compliance = contract_analyzer.check_compliance(request.text, request.regulations)
        
        return ContractResponse(
            clauses=clauses,
            risk_score=risk_analysis.score,
            risk_factors=risk_analysis.factors,
            compliance=compliance,
            recommendations=contract_analyzer.generate_recommendations(risk_analysis, compliance)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {"status": "healthy", "model_loaded": contract_analyzer.is_loaded()}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

### 3. Shared Python Models
```python
# backend/ml-services/shared/models.py
from pydantic import BaseModel
from typing import List, Dict, Optional, Any
from enum import Enum

class AnalysisType(str, Enum):
    RISK = "risk"
    COMPLIANCE = "compliance"
    FULL = "full"

class ContractRequest(BaseModel):
    text: str
    analysis_type: AnalysisType = AnalysisType.FULL
    regulations: Optional[List[str]] = ["GDPR", "CCPA"]
    language: str = "en"

class RiskFactor(BaseModel):
    category: str
    description: str
    severity: float
    location: Optional[Dict[str, int]] = None

class ComplianceCheck(BaseModel):
    regulation: str
    compliant: bool
    issues: List[str]
    recommendations: List[str]

class ContractResponse(BaseModel):
    clauses: List[Dict[str, Any]]
    risk_score: float
    risk_factors: List[RiskFactor]
    compliance: List[ComplianceCheck]
    recommendations: List[str]
    confidence: float
    processing_time_ms: int
```

### 4. Docker Compose Configuration
```yaml
# backend/docker-compose.yml
version: '3.8'

services:
  # Existing Supabase services
  postgres:
    image: supabase/postgres:latest
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  # Python ML Services
  contract-intelligence:
    build:
      context: ./ml-services/contract-intelligence
      dockerfile: Dockerfile
    environment:
      DATABASE_URL: postgresql://postgres:${POSTGRES_PASSWORD}@postgres:5432/postgres
      MODEL_PATH: /app/models
      REDIS_URL: redis://redis:6379
    volumes:
      - ./ml-services/contract-intelligence:/app
      - ml-models:/app/models
    ports:
      - "8001:8000"
    depends_on:
      - postgres
      - redis
    deploy:
      resources:
        limits:
          memory: 2G
        reservations:
          devices:
            - capabilities: [gpu]  # Optional: for GPU support

  vendor-risk:
    build:
      context: ./ml-services/vendor-risk
      dockerfile: Dockerfile
    environment:
      DATABASE_URL: postgresql://postgres:${POSTGRES_PASSWORD}@postgres:5432/postgres
      REDIS_URL: redis://redis:6379
    ports:
      - "8002:8000"
    depends_on:
      - postgres
      - redis

  negotiation-ai:
    build:
      context: ./ml-services/negotiation-ai
      dockerfile: Dockerfile
    environment:
      DATABASE_URL: postgresql://postgres:${POSTGRES_PASSWORD}@postgres:5432/postgres
      OPENAI_API_KEY: ${OPENAI_API_KEY}
    ports:
      - "8003:8000"
    depends_on:
      - postgres

  # ML Training/Notebook Environment
  ml-notebook:
    image: jupyter/tensorflow-notebook:latest
    environment:
      JUPYTER_ENABLE_LAB: "yes"
    volumes:
      - ./ml-models:/home/jovyan/work
      - ml-models:/home/jovyan/models
    ports:
      - "8888:8888"
    profiles:
      - development  # Only run in development

  # Supporting Services
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data

  # ML Model Registry (MLflow)
  mlflow:
    image: ghcr.io/mlflow/mlflow:latest
    ports:
      - "5000:5000"
    environment:
      BACKEND_STORE_URI: postgresql://postgres:${POSTGRES_PASSWORD}@postgres:5432/mlflow
      ARTIFACT_ROOT: /mlflow/artifacts
    volumes:
      - mlflow-artifacts:/mlflow/artifacts
    command: >
      mlflow server
      --backend-store-uri postgresql://postgres:${POSTGRES_PASSWORD}@postgres:5432/mlflow
      --default-artifact-root /mlflow/artifacts
      --host 0.0.0.0
    profiles:
      - ml-development

volumes:
  postgres-data:
  redis-data:
  ml-models:
  mlflow-artifacts:
```

### 5. Dockerfile for Python Services
```dockerfile
# backend/ml-services/contract-intelligence/Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Download models if needed (or mount as volume)
RUN python -c "from transformers import AutoModel, AutoTokenizer; \
    AutoModel.from_pretrained('nlpaueb/legal-bert-base-uncased'); \
    AutoTokenizer.from_pretrained('nlpaueb/legal-bert-base-uncased')"

# Run the application
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```

### 6. Makefile for Common Commands
```makefile
# backend/Makefile
.PHONY: help dev prod test clean

help:
	@echo "Available commands:"
	@echo "  make dev        - Start development environment"
	@echo "  make prod       - Start production environment"
	@echo "  make test       - Run all tests"
	@echo "  make train      - Start ML training environment"
	@echo "  make clean      - Clean up containers and volumes"

dev:
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

prod:
	docker-compose up -d

test:
	# Run TypeScript tests
	cd supabase && npm test
	# Run Python tests
	docker-compose run contract-intelligence pytest
	docker-compose run vendor-risk pytest

train:
	docker-compose --profile ml-development up ml-notebook mlflow

clean:
	docker-compose down -v
	rm -rf ml-models/data/*

# ML specific commands
models-download:
	python ml-models/scripts/download_models.py

models-train:
	docker-compose run contract-intelligence python /app/training/train_model.py

models-export:
	python ml-models/scripts/export_to_onnx.py
```

### 7. Environment Configuration
```bash
# backend/.env.example
# Supabase
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# ML Services (Internal Docker Network)
CONTRACT_ML_SERVICE_URL=http://contract-intelligence:8000
VENDOR_ML_SERVICE_URL=http://vendor-risk:8000
NEGOTIATION_ML_SERVICE_URL=http://negotiation-ai:8000

# External APIs
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Database
POSTGRES_PASSWORD=your-secure-password

# Redis
REDIS_URL=redis://redis:6379

# ML Model Storage
MODEL_BUCKET=pactwise-models
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
```

## Integration Points

### 1. From TypeScript Edge Functions
```typescript
// backend/supabase/functions/_shared/ml-client.ts
export class MLClient {
  private baseUrl: string;
  
  constructor(service: 'contract' | 'vendor' | 'negotiation') {
    this.baseUrl = Deno.env.get(`${service.toUpperCase()}_ML_SERVICE_URL`);
  }
  
  async analyze(data: any) {
    const response = await fetch(`${this.baseUrl}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`ML Service error: ${response.statusText}`);
    }
    
    return response.json();
  }
}
```

### 2. From Frontend
```typescript
// frontend/src/lib/api/ml.ts
export async function analyzeContract(contractText: string) {
  const response = await fetch('/api/ml-gateway/contract/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: contractText })
  });
  
  return response.json();
}
```

## Benefits of This Structure

1. **Separation of Concerns**: Python ML code isolated from TypeScript
2. **Independent Scaling**: Scale ML services based on load
3. **Language Flexibility**: Use best tool for each job
4. **Easy Testing**: Test Python and TypeScript independently
5. **Model Versioning**: MLflow for model management
6. **Development Efficiency**: Hot-reload for both Python and TypeScript
7. **Production Ready**: Docker containers for easy deployment

## Deployment Options

### Local Development
```bash
cd backend
make dev  # Starts all services with hot-reload
```

### Production (Kubernetes)
```bash
# Build and push images
docker build -t pactwise/contract-intelligence:latest ./ml-services/contract-intelligence
docker push pactwise/contract-intelligence:latest

# Deploy to Kubernetes
kubectl apply -f k8s/ml-services.yaml
```

### Serverless (AWS Lambda)
- Package Python services as Lambda functions
- Use API Gateway for routing
- Keep models in S3
- Use SageMaker for complex models