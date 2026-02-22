/// <reference path="../../types/global.d.ts" />

import { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from './supabase.ts';
import { DatabaseError } from './errors.ts';

/**
 * Transaction utilities for Supabase edge functions.
 *
 * IMPORTANT: Supabase's PostgREST API is stateless — each `.from()` call
 * is a separate HTTP request on a separate database connection. This means
 * you CANNOT use client-side BEGIN/COMMIT across multiple queries.
 *
 * The correct pattern for atomic multi-table operations is:
 *   1. Write a PL/pgSQL function that does all work in a single transaction
 *   2. Call it via `supabase.rpc()`
 *
 * This module provides helpers for that pattern.
 *
 * @example
 * // Call an atomic RPC function
 * const result = await callAtomicOperation(supabase, 'create_contract_with_items', {
 *   p_contract: contractData,
 *   p_line_items: lineItems,
 *   p_enterprise_id: user.enterprise_id,
 * });
 *
 * @example
 * // Use withAtomicRpc for typed results
 * const contract = await withAtomicRpc<Contract>(
 *   supabase,
 *   'create_contract_with_items',
 *   params
 * );
 */

// ============================================================================
// TYPES
// ============================================================================

export interface AtomicOperationResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface AtomicOperationOptions {
  /** Timeout in milliseconds (passed as RPC param if the function supports it) */
  timeout?: number;
  /** Whether to use the admin client (bypasses RLS) */
  useAdmin?: boolean;
}

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Call a PostgreSQL function that performs an atomic multi-table operation.
 * The function is expected to handle its own error cases and return JSON.
 *
 * @param client - Supabase client instance
 * @param functionName - Name of the PL/pgSQL function
 * @param params - Parameters to pass to the function
 * @returns The function's return value
 * @throws DatabaseError if the RPC call fails
 */
export async function callAtomicOperation<T = unknown>(
  client: SupabaseClient,
  functionName: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  const { data, error } = await client.rpc(functionName, params);

  if (error) {
    throw new DatabaseError(
      `Atomic operation "${functionName}" failed: ${error.message}`
    );
  }

  return data as T;
}

/**
 * Call an atomic RPC function using the admin client.
 * Use this when the operation needs to bypass RLS (e.g., cross-enterprise operations).
 *
 * @param functionName - Name of the PL/pgSQL function
 * @param params - Parameters to pass to the function
 * @returns The function's return value
 * @throws DatabaseError if the RPC call fails
 */
export async function callAtomicOperationAdmin<T = unknown>(
  functionName: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  const client = createAdminClient();
  return callAtomicOperation<T>(client, functionName, params);
}

/**
 * Execute an atomic RPC function with structured result handling.
 * Expects the PostgreSQL function to return JSON with { success, data, error } shape.
 *
 * @param client - Supabase client instance
 * @param functionName - Name of the PL/pgSQL function
 * @param params - Parameters to pass to the function
 * @returns AtomicOperationResult with typed data
 * @throws DatabaseError if the RPC call itself fails (not business logic errors)
 */
export async function withAtomicRpc<T = unknown>(
  client: SupabaseClient,
  functionName: string,
  params: Record<string, unknown> = {},
): Promise<AtomicOperationResult<T>> {
  const { data, error } = await client.rpc(functionName, params);

  if (error) {
    throw new DatabaseError(
      `Atomic operation "${functionName}" failed: ${error.message}`
    );
  }

  // If the function returns a structured result, parse it
  const result = data as AtomicOperationResult<T>;
  if (result && typeof result === 'object' && 'success' in result) {
    return result;
  }

  // Otherwise wrap the raw result
  return {
    success: true,
    data: data as T,
  };
}

// ============================================================================
// MULTI-STEP OPERATION HELPER
// ============================================================================

/**
 * Execute a sequence of related database operations, rolling back on failure.
 * Each step is an independent Supabase query — if any step fails, previous
 * steps are compensated using the provided rollback functions.
 *
 * NOTE: This is NOT a true database transaction. It uses compensating
 * actions (saga pattern) for operations that can't be wrapped in a single
 * PL/pgSQL function. Prefer atomic RPC functions when possible.
 *
 * @param steps - Array of operation steps with execute and rollback functions
 * @returns Array of results from each step
 */
export async function withCompensatingTransaction<T extends unknown[]>(
  steps: {
    name: string;
    execute: () => Promise<unknown>;
    rollback: () => Promise<void>;
  }[],
): Promise<T> {
  const results: unknown[] = [];
  const completedSteps: typeof steps = [];

  for (const step of steps) {
    try {
      const result = await step.execute();
      results.push(result);
      completedSteps.push(step);
    } catch (error) {
      // Rollback completed steps in reverse order
      console.error(`Step "${step.name}" failed, rolling back ${completedSteps.length} steps`);

      for (let i = completedSteps.length - 1; i >= 0; i--) {
        try {
          await completedSteps[i].rollback();
        } catch (rollbackError) {
          console.error(
            `Rollback failed for step "${completedSteps[i].name}":`,
            rollbackError
          );
        }
      }

      throw new DatabaseError(
        `Multi-step operation failed at "${step.name}": ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  return results as T;
}

// ============================================================================
// BATCH OPERATION HELPERS
// ============================================================================

/**
 * Insert records in batches with error handling.
 * If any batch fails, returns partial results with error details.
 *
 * @param client - Supabase client instance
 * @param table - Table name to insert into
 * @param records - Array of records to insert
 * @param batchSize - Number of records per batch (default: 100)
 * @returns Object with inserted count, failed count, and errors
 */
export async function batchInsert<T extends Record<string, unknown>>(
  client: SupabaseClient,
  table: string,
  records: T[],
  batchSize = 100,
): Promise<{
  inserted: number;
  failed: number;
  errors: Array<{ batch: number; error: string }>;
}> {
  const errors: Array<{ batch: number; error: string }> = [];
  let inserted = 0;

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;

    const { error } = await client
      .from(table)
      .insert(batch as unknown[]);

    if (error) {
      errors.push({ batch: batchNumber, error: error.message });
    } else {
      inserted += batch.length;
    }
  }

  return {
    inserted,
    failed: records.length - inserted,
    errors,
  };
}
