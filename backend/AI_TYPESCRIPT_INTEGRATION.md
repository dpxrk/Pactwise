# AI/ML Integration with TypeScript Stack

## Overview
This guide demonstrates how to integrate Python-based ML models into your TypeScript/Supabase stack using modern, production-ready approaches.

## Architecture Options

### Option 1: Serverless Functions with Python Runtime
**Best for: Quick deployment, cost-effective, auto-scaling**

```typescript
// backend/supabase/functions/ai-contract-analysis/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

interface ContractAnalysisRequest {
  contractText: string;
  analysisType: 'risk' | 'compliance' | 'full';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { contractText, analysisType } = await req.json() as ContractAnalysisRequest;

    // Option 1A: Call Python Lambda/Cloud Function
    const pythonServiceUrl = Deno.env.get('PYTHON_ML_SERVICE_URL')!;
    const mlResponse = await fetch(pythonServiceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('ML_SERVICE_API_KEY')}`
      },
      body: JSON.stringify({
        text: contractText,
        model: 'legal-bert',
        task: analysisType
      })
    });

    const mlResult = await mlResponse.json();

    // Option 1B: Use Replicate API for hosted models
    const replicateResponse = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${Deno.env.get('REPLICATE_API_TOKEN')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: 'meta/llama-2-70b-chat',
        input: {
          prompt: `Analyze this contract for ${analysisType}: ${contractText}`,
          max_tokens: 1000
        }
      })
    });

    return new Response(
      JSON.stringify({ 
        mlAnalysis: mlResult,
        llmAnalysis: await replicateResponse.json()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Analysis failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

### Option 2: Microservices with FastAPI
**Best for: Complex ML pipelines, GPU requirements, model versioning**

```python
# backend/ml-service/app.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, List
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import numpy as np

app = FastAPI()

# Load models at startup
class ModelManager:
    def __init__(self):
        self.legal_bert = AutoModelForSequenceClassification.from_pretrained(
            "nlpaueb/legal-bert-base-uncased"
        )
        self.tokenizer = AutoTokenizer.from_pretrained(
            "nlpaueb/legal-bert-base-uncased"
        )
        self.risk_model = self.load_risk_model()
    
    def load_risk_model(self):
        # Load your custom trained model
        return torch.load("models/contract_risk_model.pt")

model_manager = ModelManager()

class ContractRequest(BaseModel):
    text: str
    analysis_type: str = "full"

class ContractResponse(BaseModel):
    risk_score: float
    risk_factors: List[Dict[str, Any]]
    compliance_score: float
    recommendations: List[str]
    confidence: float

@app.post("/analyze", response_model=ContractResponse)
async def analyze_contract(request: ContractRequest):
    # Tokenize input
    inputs = model_manager.tokenizer(
        request.text, 
        return_tensors="pt", 
        max_length=512, 
        truncation=True
    )
    
    # Get predictions
    with torch.no_grad():
        outputs = model_manager.legal_bert(**inputs)
        risk_outputs = model_manager.risk_model(**inputs)
    
    # Process results
    risk_score = torch.sigmoid(risk_outputs.logits).item()
    
    return ContractResponse(
        risk_score=risk_score,
        risk_factors=extract_risk_factors(request.text, risk_score),
        compliance_score=calculate_compliance(outputs),
        recommendations=generate_recommendations(risk_score),
        confidence=calculate_confidence(outputs)
    )
```

```typescript
// backend/supabase/functions/_shared/ml-client.ts
export class MLServiceClient {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = Deno.env.get('ML_SERVICE_URL') || 'http://ml-service:8000';
    this.apiKey = Deno.env.get('ML_SERVICE_API_KEY') || '';
  }

  async analyzeContract(text: string, analysisType: string = 'full') {
    const response = await fetch(`${this.baseUrl}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({ text, analysis_type: analysisType })
    });

    if (!response.ok) {
      throw new Error(`ML Service error: ${response.statusText}`);
    }

    return response.json();
  }

  async batchAnalyze(contracts: string[]) {
    // Implement batch processing for efficiency
    const promises = contracts.map(text => this.analyzeContract(text));
    return Promise.all(promises);
  }
}
```

### Option 3: WebAssembly with ONNX Runtime
**Best for: Client-side inference, low latency, privacy**

```typescript
// frontend/src/lib/ml/onnx-inference.ts
import * as ort from 'onnxruntime-web';

export class ContractAnalyzer {
  private session: ort.InferenceSession | null = null;
  private tokenizer: any; // Use tokenizers library

  async initialize() {
    // Load ONNX model (converted from PyTorch/TensorFlow)
    this.session = await ort.InferenceSession.create('/models/contract_analyzer.onnx');
    
    // Load tokenizer
    const { AutoTokenizer } = await import('@xenova/transformers');
    this.tokenizer = await AutoTokenizer.from_pretrained('legal-bert-base');
  }

  async analyze(text: string): Promise<AnalysisResult> {
    if (!this.session) {
      await this.initialize();
    }

    // Tokenize input
    const encoded = await this.tokenizer(text);
    
    // Create tensor
    const inputTensor = new ort.Tensor('int64', encoded.input_ids.data, [1, encoded.input_ids.length]);
    
    // Run inference
    const feeds = { input_ids: inputTensor };
    const results = await this.session!.run(feeds);
    
    // Process outputs
    const logits = results.logits.data as Float32Array;
    const riskScore = this.sigmoid(logits[0]);
    
    return {
      riskScore,
      confidence: this.calculateConfidence(logits),
      categories: this.extractCategories(logits)
    };
  }

  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
  }
}
```

### Option 4: TensorFlow.js - Pure TypeScript
**Best for: Full TypeScript stack, browser/Node.js compatibility**

```typescript
// backend/supabase/functions/_shared/tf-models.ts
import * as tf from '@tensorflow/tfjs-node';
import { Universal } from '@tensorflow-models/universal-sentence-encoder';

export class TensorFlowContractAnalyzer {
  private model: tf.LayersModel | null = null;
  private encoder: Universal | null = null;

  async initialize() {
    // Load pre-trained model
    this.model = await tf.loadLayersModel('file://./models/contract_risk_model/model.json');
    
    // Load Universal Sentence Encoder for embeddings
    const use = await import('@tensorflow-models/universal-sentence-encoder');
    this.encoder = await use.load();
  }

  async analyzeRisk(contractText: string): Promise<RiskAnalysis> {
    if (!this.model || !this.encoder) {
      await this.initialize();
    }

    // Generate embeddings
    const embeddings = await this.encoder!.embed([contractText]);
    
    // Make prediction
    const prediction = this.model!.predict(embeddings) as tf.Tensor;
    const riskScore = (await prediction.data())[0];
    
    // Extract features for explainability
    const features = await this.extractFeatures(contractText, embeddings);
    
    return {
      riskScore,
      riskCategory: this.categorizeRisk(riskScore),
      topRiskFactors: features.slice(0, 5),
      confidence: await this.calculateConfidence(prediction)
    };
  }

  private async extractFeatures(text: string, embeddings: tf.Tensor2D): Promise<RiskFactor[]> {
    // Implement attention mechanism for feature importance
    const attentionWeights = await this.getAttentionWeights(embeddings);
    const sentences = text.split(/[.!?]+/);
    
    return sentences
      .map((sentence, idx) => ({
        text: sentence,
        importance: attentionWeights[idx] || 0,
        category: this.classifySentence(sentence)
      }))
      .sort((a, b) => b.importance - a.importance);
  }
}
```

### Option 5: Hybrid Approach with Edge Functions
**Best for: Optimal performance, flexibility, cost management**

```typescript
// backend/supabase/functions/hybrid-ai-analysis/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { HybridAnalyzer } from './hybrid-analyzer.ts';

const analyzer = new HybridAnalyzer();

serve(async (req) => {
  const { contractText, urgency } = await req.json();

  // Route based on requirements
  let result;
  
  if (urgency === 'realtime') {
    // Use lightweight TypeScript model for instant response
    result = await analyzer.quickAnalysis(contractText);
  } else if (urgency === 'detailed') {
    // Call Python service for deep analysis
    result = await analyzer.deepAnalysis(contractText);
  } else {
    // Hybrid: Quick analysis + async deep analysis
    const quick = await analyzer.quickAnalysis(contractText);
    
    // Queue deep analysis
    const jobId = await analyzer.queueDeepAnalysis(contractText);
    
    result = {
      immediate: quick,
      deepAnalysisJobId: jobId,
      checkBackIn: '30s'
    };
  }

  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

## Integration Patterns

### 1. Message Queue Pattern (Recommended for Heavy ML)
```typescript
// Use Redis/RabbitMQ for async processing
import { createClient } from 'redis';

export class MLJobQueue {
  private redis = createClient({ url: process.env.REDIS_URL });
  
  async submitJob(jobType: string, data: any): Promise<string> {
    const jobId = crypto.randomUUID();
    
    await this.redis.xAdd('ml-jobs', '*', {
      id: jobId,
      type: jobType,
      data: JSON.stringify(data),
      status: 'pending',
      createdAt: new Date().toISOString()
    });
    
    return jobId;
  }
  
  async getJobResult(jobId: string): Promise<any> {
    const result = await this.redis.get(`result:${jobId}`);
    return result ? JSON.parse(result) : null;
  }
}
```

### 2. GraphQL Subscription Pattern
```typescript
// Real-time ML results with GraphQL subscriptions
import { GraphQLObjectType, GraphQLSchema } from 'graphql';
import { PubSub } from 'graphql-subscriptions';

const pubsub = new PubSub();

export const MLResultSubscription = {
  type: new GraphQLObjectType({
    name: 'MLResult',
    fields: {
      jobId: { type: GraphQLString },
      result: { type: GraphQLJSON },
      confidence: { type: GraphQLFloat }
    }
  }),
  subscribe: (_, { jobId }) => pubsub.asyncIterator(`ML_RESULT_${jobId}`)
};

// Publish results when ready
export async function publishMLResult(jobId: string, result: any) {
  await pubsub.publish(`ML_RESULT_${jobId}`, { mlResult: result });
}
```

### 3. WebSocket Pattern for Streaming
```typescript
// Stream ML results as they're generated
import { WebSocketServer } from 'ws';

export class MLStreamingService {
  private wss: WebSocketServer;
  
  constructor(port: number = 8080) {
    this.wss = new WebSocketServer({ port });
    this.setupHandlers();
  }
  
  private setupHandlers() {
    this.wss.on('connection', (ws) => {
      ws.on('message', async (message) => {
        const { type, data } = JSON.parse(message.toString());
        
        if (type === 'analyze_contract') {
          // Stream results as they're generated
          for await (const chunk of this.streamAnalysis(data)) {
            ws.send(JSON.stringify({
              type: 'analysis_chunk',
              data: chunk
            }));
          }
        }
      });
    });
  }
  
  private async* streamAnalysis(contractText: string) {
    // Yield results progressively
    yield { stage: 'tokenization', progress: 10 };
    yield { stage: 'risk_analysis', progress: 40, partial: await this.analyzeRisk(contractText) };
    yield { stage: 'compliance_check', progress: 70, partial: await this.checkCompliance(contractText) };
    yield { stage: 'complete', progress: 100, final: await this.finalizeAnalysis() };
  }
}
```

## Deployment Strategies

### Docker Compose for Local Development
```yaml
# docker-compose.yml
version: '3.8'

services:
  supabase:
    image: supabase/postgres:latest
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data

  ml-service:
    build: ./ml-service
    ports:
      - "8000:8000"
    environment:
      MODEL_PATH: /models
      REDIS_URL: redis://redis:6379
    volumes:
      - ./models:/models
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]

  edge-functions:
    build: ./supabase/functions
    environment:
      ML_SERVICE_URL: http://ml-service:8000
      OPENAI_API_KEY: ${OPENAI_API_KEY}
    depends_on:
      - ml-service

  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
```

### Kubernetes for Production
```yaml
# k8s/ml-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ml-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ml-service
  template:
    metadata:
      labels:
        app: ml-service
    spec:
      containers:
      - name: ml-service
        image: pactwise/ml-service:latest
        resources:
          requests:
            memory: "2Gi"
            cpu: "1"
            nvidia.com/gpu: 1
          limits:
            memory: "4Gi"
            cpu: "2"
            nvidia.com/gpu: 1
        env:
        - name: MODEL_CACHE
          value: /models
        volumeMounts:
        - name: model-cache
          mountPath: /models
      volumes:
      - name: model-cache
        persistentVolumeClaim:
          claimName: model-cache-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: ml-service
spec:
  selector:
    app: ml-service
  ports:
  - port: 8000
    targetPort: 8000
  type: ClusterIP
```

## Performance Optimization

### 1. Model Caching
```typescript
// Cache model predictions
import { LRUCache } from 'lru-cache';

export class CachedMLService {
  private cache = new LRUCache<string, any>({
    max: 1000,
    ttl: 1000 * 60 * 60 // 1 hour
  });
  
  async analyze(text: string): Promise<any> {
    const cacheKey = this.hashText(text);
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;
    
    // Run analysis
    const result = await this.runMLAnalysis(text);
    
    // Cache result
    this.cache.set(cacheKey, result);
    
    return result;
  }
  
  private hashText(text: string): string {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    return crypto.subtle.digest('SHA-256', data)
      .then(buf => Array.from(new Uint8Array(buf))
        .map(b => b.toString(16).padStart(2, '0'))
        .join(''));
  }
}
```

### 2. Batch Processing
```typescript
// Batch multiple requests for efficiency
export class BatchMLProcessor {
  private queue: Array<{ text: string; resolve: Function }> = [];
  private processing = false;
  
  async process(text: string): Promise<any> {
    return new Promise((resolve) => {
      this.queue.push({ text, resolve });
      
      if (!this.processing) {
        this.processBatch();
      }
    });
  }
  
  private async processBatch() {
    this.processing = true;
    
    // Wait for more items or timeout
    await new Promise(r => setTimeout(r, 100));
    
    if (this.queue.length > 0) {
      const batch = this.queue.splice(0, 32); // Process up to 32 at once
      const texts = batch.map(item => item.text);
      
      // Batch inference
      const results = await this.mlService.batchInference(texts);
      
      // Resolve promises
      batch.forEach((item, idx) => {
        item.resolve(results[idx]);
      });
    }
    
    this.processing = false;
    
    if (this.queue.length > 0) {
      this.processBatch();
    }
  }
}
```

## Monitoring & Observability

```typescript
// Monitor ML service performance
import { Histogram, Counter, register } from 'prom-client';

export class MLMetrics {
  private inferenceLatency = new Histogram({
    name: 'ml_inference_duration_seconds',
    help: 'ML inference latency in seconds',
    labelNames: ['model', 'status']
  });
  
  private predictionCounter = new Counter({
    name: 'ml_predictions_total',
    help: 'Total number of ML predictions',
    labelNames: ['model', 'result']
  });
  
  async trackInference<T>(
    modelName: string,
    inferenceFunc: () => Promise<T>
  ): Promise<T> {
    const timer = this.inferenceLatency.startTimer({ model: modelName });
    
    try {
      const result = await inferenceFunc();
      timer({ status: 'success' });
      this.predictionCounter.inc({ model: modelName, result: 'success' });
      return result;
    } catch (error) {
      timer({ status: 'error' });
      this.predictionCounter.inc({ model: modelName, result: 'error' });
      throw error;
    }
  }
  
  getMetrics(): string {
    return register.metrics();
  }
}
```

## Best Practices

1. **Use TypeScript-native solutions when possible** (TensorFlow.js, ONNX Runtime)
2. **Implement proper error handling and fallbacks**
3. **Cache ML predictions aggressively**
4. **Use async/streaming for long-running operations**
5. **Monitor latency and implement timeouts**
6. **Version your models and APIs**
7. **Implement gradual rollouts for model updates**
8. **Use queues for heavy processing**
9. **Implement circuit breakers for external services**
10. **Profile and optimize bottlenecks**

## Recommended Stack for PactWise

Given your TypeScript/Supabase architecture, I recommend:

1. **Primary**: TensorFlow.js for lightweight models (runs in Edge Functions)
2. **Secondary**: FastAPI microservice for complex ML (Python models)
3. **LLMs**: OpenAI/Anthropic APIs (already integrated)
4. **Caching**: Redis for prediction caching
5. **Queue**: PostgreSQL's built-in queue or Redis Streams
6. **Monitoring**: Prometheus + Grafana

This hybrid approach gives you:
- Fast response times with TypeScript models
- Full ML capability with Python when needed
- Scalability through proper caching and queuing
- Cost optimization by using appropriate tools for each task