import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { useEffect, useState, useCallback, useRef } from 'react'

import { Database } from '@/types/database.types'
import { createClient } from '@/utils/supabase/client'

const supabase = createClient()

type Tables = Database['public']['Tables']
type TableName = keyof Tables

// ============================================================================
// OPTIMIZED CACHE MANAGEMENT
// ============================================================================

interface CacheEntry<T> {
  data: T
  timestamp: number
  isStale: boolean
}

class QueryCache {
  private cache = new Map<string, CacheEntry<unknown>>()
  private pendingRequests = new Map<string, Promise<unknown>>()

  get<T>(key: string, staleTime = 30000): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined
    if (!entry) return null

    const age = Date.now() - entry.timestamp
    entry.isStale = age > staleTime

    return entry.data
  }

  set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      isStale: false
    })
  }

  invalidate(pattern: string | RegExp): void {
    if (typeof pattern === 'string') {
      this.cache.delete(pattern)
      this.pendingRequests.delete(pattern)
    } else {
      for (const key of this.cache.keys()) {
        if (pattern.test(key)) {
          this.cache.delete(key)
          this.pendingRequests.delete(key)
        }
      }
    }
  }

  clear(): void {
    this.cache.clear()
    this.pendingRequests.clear()
  }

  async dedupe<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const existing = this.pendingRequests.get(key)
    if (existing) {
      return existing as Promise<T>
    }

    const promise = fn()
    this.pendingRequests.set(key, promise)

    try {
      const result = await promise
      return result
    } finally {
      this.pendingRequests.delete(key)
    }
  }
}

const globalCache = new QueryCache()

interface UseSupabaseQueryOptions<T> {
  enabled?: boolean
  refetchOnWindowFocus?: boolean
  staleTime?: number  // NEW: How long data is considered fresh (ms)
  cacheKey?: string   // NEW: Optional cache key
  onSuccess?: (data: T) => void
  onError?: (error: Error) => void
}

export function useSupabaseQuery<
  TTable extends TableName,
  TData = Tables[TTable]['Row'][]
>(
  queryFn: () => Promise<{ data: TData | null; error: Error | null }>,
  options: UseSupabaseQueryOptions<TData> = {}
) {
  const [data, setData] = useState<TData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isFetching, setIsFetching] = useState(false) // NEW: Background fetching state
  const [error, setError] = useState<Error | null>(null)

  const {
    enabled = true,
    refetchOnWindowFocus = false,  // CHANGED: Default to false for better performance
    staleTime = 30000,  // NEW: 30 seconds default
    cacheKey,
    onSuccess,
    onError
  } = options

  const queryFnRef = useRef(queryFn)
  const onSuccessRef = useRef(onSuccess)
  const onErrorRef = useRef(onError)
  const abortControllerRef = useRef<AbortController | null>(null) // NEW: Request cancellation

  useEffect(() => {
    queryFnRef.current = queryFn
    onSuccessRef.current = onSuccess
    onErrorRef.current = onError
  })

  const fetchData = useCallback(async (skipCache = false) => {
    if (!enabled) {
      return;
    }

    // NEW: Check cache first
    if (cacheKey && !skipCache) {
      const cachedData = globalCache.get<TData>(cacheKey, staleTime)
      if (cachedData) {
        setData(cachedData)
        setIsLoading(false)
        setError(null)

        const entry = (globalCache as any).cache?.get?.(cacheKey)
        if (entry && !(entry as CacheEntry<TData>).isStale) {
          return // Data is fresh
        }
        setIsFetching(true) // Background refetch
      }
    }

    setIsLoading(!data) // Only show loading if no data
    setIsFetching(true)
    setError(null)

    // NEW: Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    try {
      // NEW: Request deduplication
      const cacheKeyToUse = cacheKey || `query_${Math.random()}`
      const result = await globalCache.dedupe(cacheKeyToUse, () =>
        queryFnRef.current()
      )

      if (result.error) {
        throw result.error
      }

      if (result.data) {
        // NEW: Update cache
        if (cacheKey) {
          globalCache.set(cacheKey, result.data)
        }
        setData(result.data)
        onSuccessRef.current?.(result.data)
      }
    } catch (err) {
      // NEW: Don't treat abort as error
      if (err instanceof DOMException && err.name === 'AbortError') {
        return
      }

      const error = err as Error
      setError(error)
      onErrorRef.current?.(error)
    } finally {
      setIsLoading(false)
      setIsFetching(false)
    }
  }, [enabled, cacheKey, staleTime, data])

  useEffect(() => {
    fetchData()

    // NEW: Cleanup on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [fetchData])

  useEffect(() => {
    if (!refetchOnWindowFocus) return

    const handleFocus = () => fetchData()
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [fetchData, refetchOnWindowFocus])

  return {
    data,
    isLoading,
    isFetching, // NEW: Separate loading state
    error,
    refetch: () => fetchData(true), // Skip cache on manual refetch
    invalidate: cacheKey ? () => globalCache.invalidate(cacheKey) : undefined // NEW: Cache invalidation
  }
}

export function useSupabaseRealtime<
  TTable extends TableName,
  _TData = Tables[TTable]['Row']
>(
  table: TTable,
  options: {
    event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*'
    filter?: string
    onInsert?: (payload: RealtimePostgresChangesPayload<any>) => void
    onUpdate?: (payload: RealtimePostgresChangesPayload<any>) => void
    onDelete?: (payload: RealtimePostgresChangesPayload<any>) => void
    onChange?: (payload: RealtimePostgresChangesPayload<any>) => void
  } = {}
) {
  const [channel, setChannel] = useState<RealtimeChannel | null>(null)
  const [isSubscribed, setIsSubscribed] = useState(false)

  // Store callback refs to avoid recreating channel on every callback change
  const callbacksRef = useRef(options)

  // Update callbacks ref on every render without triggering effect
  useEffect(() => {
    callbacksRef.current = options
  })

  useEffect(() => {
    const {
      event = '*',
      filter
    } = options

    const channelName = `${table}_${Date.now()}`
    const newChannel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event,
          schema: 'public',
          table: table as string,
          filter
        } as any,
        (payload: any) => {
          const { onChange, onInsert, onUpdate, onDelete } = callbacksRef.current

          onChange?.(payload)

          switch (payload.eventType) {
            case 'INSERT':
              onInsert?.(payload)
              break
            case 'UPDATE':
              onUpdate?.(payload)
              break
            case 'DELETE':
              onDelete?.(payload)
              break
          }
        }
      )
      .subscribe((status) => {
        setIsSubscribed(status === 'SUBSCRIBED')
      })

    setChannel(newChannel)

    return () => {
      newChannel.unsubscribe()
    }
  }, [table, options.event, options.filter])

  return { channel, isSubscribed }
}

export function useSupabaseMutation<
  TTable extends TableName,
  TInsert = Tables[TTable]['Insert'],
  TUpdate = Tables[TTable]['Update'],
  TRow = Tables[TTable]['Row']
>(table: TTable) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const insert = useCallback(async (
    data: TInsert | TInsert[],
    options?: { onSuccess?: (data: TRow[]) => void; onError?: (error: Error) => void }
  ) => {
    setIsLoading(true)
    setError(null)

    try {
      const { data: result, error } = await (supabase as any)
        .from(table)
        .insert(data)
        .select()

      if (error) throw error

      // NEW: Invalidate cache for this table
      globalCache.invalidate(new RegExp(`^${table}`))

      options?.onSuccess?.(result as TRow[])
      return { data: result as TRow[], error: null }
    } catch (err) {
      const error = err as Error
      setError(error)
      options?.onError?.(error)
      return { data: null, error }
    } finally {
      setIsLoading(false)
    }
  }, [table])

  const update = useCallback(async (
    updates: TUpdate,
    filter: { column: string; value: unknown },
    options?: { onSuccess?: (data: TRow[]) => void; onError?: (error: Error) => void }
  ) => {
    setIsLoading(true)
    setError(null)

    try {
      const { data: result, error } = await (supabase as any)
        .from(table)
        .update(updates)
        .eq(filter.column, filter.value)
        .select()

      if (error) throw error

      // NEW: Invalidate cache for this table
      globalCache.invalidate(new RegExp(`^${table}`))

      options?.onSuccess?.(result as TRow[])
      return { data: result as TRow[], error: null }
    } catch (err) {
      const error = err as Error
      setError(error)
      options?.onError?.(error)
      return { data: null, error }
    } finally {
      setIsLoading(false)
    }
  }, [table])

  const remove = useCallback(async (
    filter: { column: string; value: unknown },
    options?: { onSuccess?: () => void; onError?: (error: Error) => void }
  ) => {
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await (supabase as any)
        .from(table)
        .delete()
        .eq(filter.column, filter.value)

      if (error) throw error

      // NEW: Invalidate cache for this table
      globalCache.invalidate(new RegExp(`^${table}`))

      options?.onSuccess?.()
      return { error: null }
    } catch (err) {
      const error = err as Error
      setError(error)
      options?.onError?.(error)
      return { error }
    } finally {
      setIsLoading(false)
    }
  }, [table])

  return {
    insert,
    update,
    remove,
    isLoading,
    error
  }
}

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

// Export cache utilities for manual invalidation
export function invalidateQueries(pattern: string | RegExp) {
  globalCache.invalidate(pattern)
}

export function clearAllCache() {
  globalCache.clear()
}

export { globalCache as queryCache }

export function useSupabaseStorage(bucket: string) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<Error | null>(null)

  const upload = useCallback(async (
    path: string,
    file: File,
    options?: {
      upsert?: boolean
      onSuccess?: (url: string) => void
      onError?: (error: Error) => void
    }
  ) => {
    setIsUploading(true)
    setUploadError(null)

    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, { upsert: options?.upsert })

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path)

      options?.onSuccess?.(publicUrl)
      return { url: publicUrl, error: null }
    } catch (err) {
      const error = err as Error
      setUploadError(error)
      options?.onError?.(error)
      return { url: null, error }
    } finally {
      setIsUploading(false)
    }
  }, [bucket])

  const download = useCallback(async (path: string) => {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .download(path)

      if (error) throw error

      return { data, error: null }
    } catch (err) {
      return { data: null, error: err as Error }
    }
  }, [bucket])

  const remove = useCallback(async (paths: string[]) => {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove(paths)

      if (error) throw error

      return { error: null }
    } catch (err) {
      return { error: err as Error }
    }
  }, [bucket])

  const getPublicUrl = useCallback((path: string) => {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path)

    return data.publicUrl
  }, [bucket])

  return {
    upload,
    download,
    remove,
    getPublicUrl,
    isUploading,
    uploadError
  }
}