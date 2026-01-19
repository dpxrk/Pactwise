/// <reference path="../../../types/global.d.ts" />

/**
 * OpenAPI Documentation Handler
 *
 * Serves OpenAPI spec and Swagger UI for API documentation
 */

import { getCorsHeaders } from '../cors.ts';
import { createOpenAPISpec, OpenAPIGenerator } from './spec.ts';
import * as schemas from './schemas.ts';

// ==================== Pactwise API Spec Builder ====================

function buildPactwiseAPISpec(): OpenAPIGenerator {
  const spec = createOpenAPISpec(
    'Pactwise API',
    '1.0.0',
    'Enterprise contract and vendor management platform with AI-powered analysis. Built with state-of-the-art AI agents for contract analysis, vendor evaluation, and intelligent automation.',
  );

  // Add servers
  spec.generate().servers = [
    {
      url: '{protocol}://{host}/functions/v1',
      description: 'Pactwise API Server',
      variables: {
        protocol: {
          default: 'https',
          enum: ['http', 'https'],
        },
        host: {
          default: 'api.pactwise.com',
          description: 'API hostname',
        },
      },
    },
  ];

  // Add tags
  spec
    .addTag({ name: 'Contracts', description: 'Contract management operations' })
    .addTag({ name: 'Vendors', description: 'Vendor management operations' })
    .addTag({ name: 'Agents', description: 'AI agent interactions' })
    .addTag({ name: 'Users', description: 'User management' })
    .addTag({ name: 'Analytics', description: 'Analytics and reporting' })
    .addTag({ name: 'System', description: 'System health and monitoring' });

  // Add common schemas
  spec
    .addSchema('Contract', schemas.ContractSchema, 'Contract entity')
    .addSchema('ContractCreate', schemas.ContractCreateSchema, 'Contract creation payload')
    .addSchema('Vendor', schemas.VendorSchema, 'Vendor entity')
    .addSchema('VendorCreate', schemas.VendorCreateSchema, 'Vendor creation payload')
    .addSchema('AgentTask', schemas.AgentTaskSchema, 'Agent task entity')
    .addSchema('AgentInsight', schemas.AgentInsightSchema, 'AI-generated insight')
    .addSchema('User', schemas.UserSchema, 'User entity')
    .addSchema('Error', schemas.ErrorResponseSchema, 'Standard error response');

  // ==================== Contract Endpoints ====================

  spec.addEndpoint({
    path: '/contracts',
    method: 'get',
    operationId: 'listContracts',
    summary: 'List contracts',
    description: 'Retrieve a paginated list of contracts for the authenticated enterprise',
    tags: ['Contracts'],
    parameters: [
      { name: 'page', in: 'query', schema: schemas.PaginationQuerySchema.shape.page, description: 'Page number' },
      { name: 'limit', in: 'query', schema: schemas.PaginationQuerySchema.shape.limit, description: 'Items per page' },
      { name: 'status', in: 'query', schema: schemas.ContractSchema.shape.status, description: 'Filter by status' },
      { name: 'vendorId', in: 'query', schema: schemas.UUIDParamSchema, description: 'Filter by vendor' },
      { name: 'search', in: 'query', schema: schemas.SearchQuerySchema.shape.q, description: 'Search query' },
    ],
    responses: {
      '200': {
        description: 'Successful response',
        schema: schemas.PaginatedResponseSchema(schemas.ContractSchema),
      },
      '401': { description: 'Unauthorized', schema: schemas.ErrorResponseSchema },
      '500': { description: 'Server error', schema: schemas.ErrorResponseSchema },
    },
  });

  spec.addEndpoint({
    path: '/contracts',
    method: 'post',
    operationId: 'createContract',
    summary: 'Create contract',
    description: 'Upload and create a new contract. Optionally triggers AI analysis.',
    tags: ['Contracts'],
    requestBody: {
      description: 'Contract creation payload',
      schema: schemas.ContractCreateSchema,
    },
    responses: {
      '201': {
        description: 'Contract created',
        schema: schemas.SuccessResponseSchema(schemas.ContractSchema),
      },
      '400': { description: 'Validation error', schema: schemas.ErrorResponseSchema },
      '401': { description: 'Unauthorized', schema: schemas.ErrorResponseSchema },
    },
  });

  spec.addEndpoint({
    path: '/contracts/{id}',
    method: 'get',
    operationId: 'getContract',
    summary: 'Get contract by ID',
    description: 'Retrieve a specific contract by its ID',
    tags: ['Contracts'],
    parameters: [
      { name: 'id', in: 'path', required: true, schema: schemas.UUIDParamSchema, description: 'Contract ID' },
    ],
    responses: {
      '200': {
        description: 'Successful response',
        schema: schemas.SuccessResponseSchema(schemas.ContractSchema),
      },
      '404': { description: 'Contract not found', schema: schemas.ErrorResponseSchema },
    },
  });

  spec.addEndpoint({
    path: '/contracts/{id}',
    method: 'patch',
    operationId: 'updateContract',
    summary: 'Update contract',
    description: 'Update an existing contract',
    tags: ['Contracts'],
    parameters: [
      { name: 'id', in: 'path', required: true, schema: schemas.UUIDParamSchema, description: 'Contract ID' },
    ],
    requestBody: {
      description: 'Contract update payload',
      schema: schemas.ContractUpdateSchema,
    },
    responses: {
      '200': {
        description: 'Contract updated',
        schema: schemas.SuccessResponseSchema(schemas.ContractSchema),
      },
      '404': { description: 'Contract not found', schema: schemas.ErrorResponseSchema },
    },
  });

  spec.addEndpoint({
    path: '/contracts/{id}',
    method: 'delete',
    operationId: 'deleteContract',
    summary: 'Delete contract',
    description: 'Soft delete a contract (marks as deleted)',
    tags: ['Contracts'],
    parameters: [
      { name: 'id', in: 'path', required: true, schema: schemas.UUIDParamSchema, description: 'Contract ID' },
    ],
    responses: {
      '204': { description: 'Contract deleted' },
      '404': { description: 'Contract not found', schema: schemas.ErrorResponseSchema },
    },
  });

  // ==================== Vendor Endpoints ====================

  spec.addEndpoint({
    path: '/vendors',
    method: 'get',
    operationId: 'listVendors',
    summary: 'List vendors',
    description: 'Retrieve a paginated list of vendors',
    tags: ['Vendors'],
    parameters: [
      { name: 'page', in: 'query', schema: schemas.PaginationQuerySchema.shape.page },
      { name: 'limit', in: 'query', schema: schemas.PaginationQuerySchema.shape.limit },
      { name: 'status', in: 'query', schema: schemas.VendorSchema.shape.status },
      { name: 'category', in: 'query', schema: schemas.VendorSchema.shape.category },
      { name: 'search', in: 'query', schema: schemas.SearchQuerySchema.shape.q },
    ],
    responses: {
      '200': {
        description: 'Successful response',
        schema: schemas.PaginatedResponseSchema(schemas.VendorSchema),
      },
    },
  });

  spec.addEndpoint({
    path: '/vendors',
    method: 'post',
    operationId: 'createVendor',
    summary: 'Create vendor',
    description: 'Create a new vendor',
    tags: ['Vendors'],
    requestBody: {
      description: 'Vendor creation payload',
      schema: schemas.VendorCreateSchema,
    },
    responses: {
      '201': {
        description: 'Vendor created',
        schema: schemas.SuccessResponseSchema(schemas.VendorSchema),
      },
    },
  });

  spec.addEndpoint({
    path: '/vendors/{id}',
    method: 'get',
    operationId: 'getVendor',
    summary: 'Get vendor by ID',
    tags: ['Vendors'],
    parameters: [
      { name: 'id', in: 'path', required: true, schema: schemas.UUIDParamSchema },
    ],
    responses: {
      '200': {
        description: 'Successful response',
        schema: schemas.SuccessResponseSchema(schemas.VendorSchema),
      },
      '404': { description: 'Vendor not found', schema: schemas.ErrorResponseSchema },
    },
  });

  // ==================== Agent Endpoints ====================

  spec.addEndpoint({
    path: '/agents/chat',
    method: 'post',
    operationId: 'agentChat',
    summary: 'Chat with AI agent',
    description: 'Send a message to an AI agent and receive an intelligent response. Supports streaming.',
    tags: ['Agents'],
    requestBody: {
      description: 'Chat request',
      schema: schemas.AgentChatRequestSchema,
    },
    responses: {
      '200': {
        description: 'Chat response',
        schema: schemas.SuccessResponseSchema(schemas.AgentChatResponseSchema),
      },
    },
  });

  spec.addEndpoint({
    path: '/agents/tasks',
    method: 'post',
    operationId: 'createAgentTask',
    summary: 'Create agent task',
    description: 'Queue a task for an AI agent to process',
    tags: ['Agents'],
    requestBody: {
      description: 'Task creation payload',
      schema: schemas.AgentTaskCreateSchema,
    },
    responses: {
      '202': {
        description: 'Task queued',
        schema: schemas.SuccessResponseSchema(schemas.AgentTaskSchema),
      },
    },
  });

  spec.addEndpoint({
    path: '/agents/tasks/{id}',
    method: 'get',
    operationId: 'getAgentTask',
    summary: 'Get task status',
    description: 'Check the status of an agent task',
    tags: ['Agents'],
    parameters: [
      { name: 'id', in: 'path', required: true, schema: schemas.UUIDParamSchema },
    ],
    responses: {
      '200': {
        description: 'Task status',
        schema: schemas.SuccessResponseSchema(schemas.AgentTaskSchema),
      },
      '404': { description: 'Task not found', schema: schemas.ErrorResponseSchema },
    },
  });

  spec.addEndpoint({
    path: '/agents/insights',
    method: 'get',
    operationId: 'listInsights',
    summary: 'List AI insights',
    description: 'Retrieve AI-generated insights and recommendations',
    tags: ['Agents'],
    parameters: [
      { name: 'severity', in: 'query', schema: schemas.AgentInsightSchema.shape.severity },
      { name: 'contractId', in: 'query', schema: schemas.UUIDParamSchema },
      { name: 'vendorId', in: 'query', schema: schemas.UUIDParamSchema },
      { name: 'isActionable', in: 'query', schema: schemas.AgentInsightSchema.shape.isActionable },
    ],
    responses: {
      '200': {
        description: 'Insights list',
        schema: schemas.PaginatedResponseSchema(schemas.AgentInsightSchema),
      },
    },
  });

  // ==================== System Endpoints ====================

  spec.addEndpoint({
    path: '/health',
    method: 'get',
    operationId: 'healthCheck',
    summary: 'Health check',
    description: 'Check API health status',
    tags: ['System'],
    security: [],
    responses: {
      '200': {
        description: 'API is healthy',
        schema: schemas.SuccessResponseSchema(
          schemas.z.object({
            status: schemas.z.literal('healthy'),
            version: schemas.z.string(),
            timestamp: schemas.z.string().datetime(),
          }),
        ),
      },
    },
  });

  return spec;
}

// ==================== Swagger UI HTML ====================

function getSwaggerUIHtml(specUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pactwise API Documentation</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css">
  <style>
    body { margin: 0; padding: 0; }
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info .title { color: #291528; }
    .swagger-ui .opblock-tag { color: #291528; font-weight: 600; }
    .swagger-ui .opblock.opblock-get .opblock-summary-method { background: #61affe; }
    .swagger-ui .opblock.opblock-post .opblock-summary-method { background: #49cc90; }
    .swagger-ui .opblock.opblock-put .opblock-summary-method { background: #fca130; }
    .swagger-ui .opblock.opblock-delete .opblock-summary-method { background: #f93e3e; }
    .swagger-ui .opblock.opblock-patch .opblock-summary-method { background: #50e3c2; }
    .swagger-ui .btn.execute { background-color: #291528; border-color: #291528; }
    .swagger-ui .btn.execute:hover { background-color: #9e829c; border-color: #9e829c; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
  <script>
    window.onload = function() {
      window.ui = SwaggerUIBundle({
        url: '${specUrl}',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIBundle.SwaggerUIStandalonePreset
        ],
        layout: "BaseLayout",
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        tryItOutEnabled: true,
      });
    };
  </script>
</body>
</html>`;
}

// ==================== Request Handler ====================

/**
 * Handle documentation requests
 * Routes:
 * - GET /docs - Swagger UI
 * - GET /docs/openapi.json - OpenAPI spec (JSON)
 * - GET /docs/openapi.yaml - OpenAPI spec (YAML)
 */
export async function handleDocsRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;
  const corsHeaders = getCorsHeaders(req);

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // Only GET requests
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const spec = buildPactwiseAPISpec();

  // Route based on path
  if (path.endsWith('/openapi.json') || path.endsWith('/spec.json')) {
    return new Response(spec.toJSON(), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }

  if (path.endsWith('/openapi.yaml') || path.endsWith('/spec.yaml')) {
    return new Response(spec.toYAML(), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/yaml',
      },
    });
  }

  // Default: serve Swagger UI
  const baseUrl = `${url.protocol}//${url.host}`;
  const specUrl = `${baseUrl}/functions/v1/docs/openapi.json`;

  return new Response(getSwaggerUIHtml(specUrl), {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}

/**
 * Create a middleware-style docs handler for integration with existing functions
 */
export function createDocsMiddleware() {
  return {
    isDocsRequest: (req: Request): boolean => {
      const url = new URL(req.url);
      return url.pathname.includes('/docs') || url.pathname.includes('/openapi');
    },
    handle: handleDocsRequest,
  };
}
