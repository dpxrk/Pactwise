/// <reference path="../../../types/global.d.ts" />

/**
 * OpenAPI 3.1 Specification Generator
 *
 * Generates OpenAPI spec from Zod schemas with:
 * - Automatic schema conversion
 * - Endpoint documentation
 * - Authentication configuration
 * - Examples and descriptions
 */

import { z } from 'zod';

// ==================== Types ====================

export interface OpenAPIInfo {
  title: string;
  version: string;
  description?: string;
  termsOfService?: string;
  contact?: {
    name?: string;
    url?: string;
    email?: string;
  };
  license?: {
    name: string;
    url?: string;
  };
}

export interface OpenAPIServer {
  url: string;
  description?: string;
  variables?: Record<string, {
    default: string;
    enum?: string[];
    description?: string;
  }>;
}

export interface OpenAPIEndpoint {
  path: string;
  method: 'get' | 'post' | 'put' | 'patch' | 'delete';
  operationId: string;
  summary: string;
  description?: string;
  tags?: string[];
  deprecated?: boolean;
  requestBody?: {
    description?: string;
    required?: boolean;
    schema: z.ZodSchema;
  };
  responses: Record<string, {
    description: string;
    schema?: z.ZodSchema;
  }>;
  parameters?: Array<{
    name: string;
    in: 'query' | 'path' | 'header';
    required?: boolean;
    description?: string;
    schema: z.ZodSchema;
  }>;
  security?: Array<Record<string, string[]>>;
}

export interface OpenAPITag {
  name: string;
  description?: string;
  externalDocs?: {
    description?: string;
    url: string;
  };
}

export interface OpenAPISpec {
  openapi: '3.1.0';
  info: OpenAPIInfo;
  servers: OpenAPIServer[];
  paths: Record<string, Record<string, unknown>>;
  components: {
    schemas: Record<string, unknown>;
    securitySchemes: Record<string, unknown>;
  };
  tags?: OpenAPITag[];
  security?: Array<Record<string, string[]>>;
}

// ==================== Zod to JSON Schema Converter ====================

export class ZodToJsonSchema {
  private definitions: Map<string, unknown> = new Map();

  convert(schema: z.ZodSchema, name?: string): Record<string, unknown> {
    const jsonSchema = this.convertSchema(schema);

    if (name) {
      this.definitions.set(name, jsonSchema);
      return { $ref: `#/components/schemas/${name}` };
    }

    return jsonSchema;
  }

  getDefinitions(): Record<string, unknown> {
    return Object.fromEntries(this.definitions);
  }

  private convertSchema(schema: z.ZodSchema): Record<string, unknown> {
    const def = schema._def;
    const typeName = def.typeName;

    switch (typeName) {
      case 'ZodString':
        return this.convertString(def);
      case 'ZodNumber':
        return this.convertNumber(def);
      case 'ZodBoolean':
        return { type: 'boolean' };
      case 'ZodArray':
        return this.convertArray(def);
      case 'ZodObject':
        return this.convertObject(def);
      case 'ZodEnum':
        return this.convertEnum(def);
      case 'ZodUnion':
        return this.convertUnion(def);
      case 'ZodOptional':
        return this.convertSchema(def.innerType);
      case 'ZodNullable':
        return { ...this.convertSchema(def.innerType), nullable: true };
      case 'ZodDefault':
        return { ...this.convertSchema(def.innerType), default: def.defaultValue() };
      case 'ZodLiteral':
        return { const: def.value };
      case 'ZodRecord':
        return this.convertRecord(def);
      case 'ZodDate':
        return { type: 'string', format: 'date-time' };
      case 'ZodAny':
        return {};
      case 'ZodUnknown':
        return {};
      default:
        return { type: 'string' };
    }
  }

  private convertString(def: z.ZodStringDef): Record<string, unknown> {
    const result: Record<string, unknown> = { type: 'string' };

    for (const check of def.checks || []) {
      switch (check.kind) {
        case 'min':
          result.minLength = check.value;
          break;
        case 'max':
          result.maxLength = check.value;
          break;
        case 'email':
          result.format = 'email';
          break;
        case 'url':
          result.format = 'uri';
          break;
        case 'uuid':
          result.format = 'uuid';
          break;
        case 'datetime':
          result.format = 'date-time';
          break;
        case 'regex':
          result.pattern = check.regex.source;
          break;
      }
    }

    return result;
  }

  private convertNumber(def: z.ZodNumberDef): Record<string, unknown> {
    const result: Record<string, unknown> = { type: 'number' };

    for (const check of def.checks || []) {
      switch (check.kind) {
        case 'min':
          result.minimum = check.value;
          break;
        case 'max':
          result.maximum = check.value;
          break;
        case 'int':
          result.type = 'integer';
          break;
      }
    }

    return result;
  }

  private convertArray(def: z.ZodArrayDef): Record<string, unknown> {
    const result: Record<string, unknown> = {
      type: 'array',
      items: this.convertSchema(def.type),
    };

    if (def.minLength) {
      result.minItems = def.minLength.value;
    }

    if (def.maxLength) {
      result.maxItems = def.maxLength.value;
    }

    return result;
  }

  private convertObject(def: z.ZodObjectDef): Record<string, unknown> {
    const shape = def.shape();
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      properties[key] = this.convertSchema(value as z.ZodSchema);
      const valueDef = (value as z.ZodSchema)._def;
      if (valueDef.typeName !== 'ZodOptional' && valueDef.typeName !== 'ZodDefault') {
        required.push(key);
      }
    }

    return {
      type: 'object',
      properties,
      ...(required.length > 0 ? { required } : {}),
    };
  }

  private convertEnum(def: z.ZodEnumDef): Record<string, unknown> {
    return {
      type: 'string',
      enum: def.values,
    };
  }

  private convertUnion(def: z.ZodUnionDef): Record<string, unknown> {
    return {
      oneOf: def.options.map((opt: z.ZodSchema) => this.convertSchema(opt)),
    };
  }

  private convertRecord(def: z.ZodRecordDef): Record<string, unknown> {
    return {
      type: 'object',
      additionalProperties: this.convertSchema(def.valueType),
    };
  }
}

// ==================== OpenAPI Spec Generator ====================

export class OpenAPIGenerator {
  private spec: OpenAPISpec;
  private converter: ZodToJsonSchema;

  constructor(info: OpenAPIInfo, servers?: OpenAPIServer[]) {
    this.converter = new ZodToJsonSchema();

    this.spec = {
      openapi: '3.1.0',
      info,
      servers: servers || [
        {
          url: 'http://localhost:54321/functions/v1',
          description: 'Local development server',
        },
      ],
      paths: {},
      components: {
        schemas: {},
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'Supabase JWT token',
          },
          apiKey: {
            type: 'apiKey',
            in: 'header',
            name: 'apikey',
            description: 'Supabase anon key',
          },
        },
      },
      security: [
        { bearerAuth: [] },
        { apiKey: [] },
      ],
    };
  }

  /**
   * Add an endpoint to the spec
   */
  addEndpoint(endpoint: OpenAPIEndpoint): this {
    const path = endpoint.path.startsWith('/') ? endpoint.path : `/${endpoint.path}`;

    if (!this.spec.paths[path]) {
      this.spec.paths[path] = {};
    }

    const operation: Record<string, unknown> = {
      operationId: endpoint.operationId,
      summary: endpoint.summary,
      tags: endpoint.tags,
    };

    if (endpoint.description) {
      operation.description = endpoint.description;
    }

    if (endpoint.deprecated) {
      operation.deprecated = true;
    }

    // Parameters
    if (endpoint.parameters && endpoint.parameters.length > 0) {
      operation.parameters = endpoint.parameters.map(param => ({
        name: param.name,
        in: param.in,
        required: param.required ?? (param.in === 'path'),
        description: param.description,
        schema: this.converter.convert(param.schema),
      }));
    }

    // Request body
    if (endpoint.requestBody) {
      operation.requestBody = {
        description: endpoint.requestBody.description,
        required: endpoint.requestBody.required ?? true,
        content: {
          'application/json': {
            schema: this.converter.convert(endpoint.requestBody.schema),
          },
        },
      };
    }

    // Responses
    operation.responses = {};
    for (const [code, response] of Object.entries(endpoint.responses)) {
      const responseObj: Record<string, unknown> = {
        description: response.description,
      };

      if (response.schema) {
        responseObj.content = {
          'application/json': {
            schema: this.converter.convert(response.schema),
          },
        };
      }

      operation.responses[code] = responseObj;
    }

    // Security
    if (endpoint.security) {
      operation.security = endpoint.security;
    }

    this.spec.paths[path][endpoint.method] = operation;

    return this;
  }

  /**
   * Add a named schema to components
   */
  addSchema(name: string, schema: z.ZodSchema, description?: string): this {
    const jsonSchema = this.converter.convert(schema);
    if (description) {
      (jsonSchema as Record<string, unknown>).description = description;
    }
    this.spec.components.schemas[name] = jsonSchema;
    return this;
  }

  /**
   * Add a tag
   */
  addTag(tag: OpenAPITag): this {
    if (!this.spec.tags) {
      this.spec.tags = [];
    }
    this.spec.tags.push(tag);
    return this;
  }

  /**
   * Add multiple endpoints at once
   */
  addEndpoints(endpoints: OpenAPIEndpoint[]): this {
    for (const endpoint of endpoints) {
      this.addEndpoint(endpoint);
    }
    return this;
  }

  /**
   * Generate the complete spec
   */
  generate(): OpenAPISpec {
    // Add any remaining schema definitions
    const definitions = this.converter.getDefinitions();
    this.spec.components.schemas = {
      ...this.spec.components.schemas,
      ...definitions,
    };

    return this.spec;
  }

  /**
   * Generate spec as JSON string
   */
  toJSON(pretty = true): string {
    return JSON.stringify(this.generate(), null, pretty ? 2 : 0);
  }

  /**
   * Generate spec as YAML string
   */
  toYAML(): string {
    const spec = this.generate();
    return this.jsonToYaml(spec);
  }

  private jsonToYaml(obj: unknown, indent = 0): string {
    const spaces = '  '.repeat(indent);

    if (obj === null || obj === undefined) {
      return 'null';
    }

    if (typeof obj === 'string') {
      if (obj.includes('\n') || obj.includes(':') || obj.includes('#')) {
        return `"${obj.replace(/"/g, '\\"')}"`;
      }
      return obj;
    }

    if (typeof obj === 'number' || typeof obj === 'boolean') {
      return String(obj);
    }

    if (Array.isArray(obj)) {
      if (obj.length === 0) return '[]';
      return obj.map(item =>
        `${spaces}- ${this.jsonToYaml(item, indent + 1).trimStart()}`
      ).join('\n');
    }

    if (typeof obj === 'object') {
      const entries = Object.entries(obj);
      if (entries.length === 0) return '{}';
      return entries.map(([key, value]) => {
        const valueStr = this.jsonToYaml(value, indent + 1);
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          return `${spaces}${key}:\n${valueStr}`;
        }
        if (Array.isArray(value)) {
          return `${spaces}${key}:\n${valueStr}`;
        }
        return `${spaces}${key}: ${valueStr}`;
      }).join('\n');
    }

    return String(obj);
  }
}

// ==================== Factory Function ====================

export function createOpenAPISpec(
  title: string,
  version: string,
  description?: string,
): OpenAPIGenerator {
  return new OpenAPIGenerator({
    title,
    version,
    description,
    contact: {
      name: 'Pactwise Support',
      email: 'support@pactwise.com',
    },
    license: {
      name: 'Proprietary',
    },
  });
}
