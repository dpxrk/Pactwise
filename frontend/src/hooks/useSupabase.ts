import { useEffect, useState, useCallback } from 'react'
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database.types'

type Tables = Database['public']['Tables']
type TableName = keyof Tables

interface UseSupabaseQueryOptions<T> {
  enabled?: boolean
  refetchOnWindowFocus?: boolean
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
  const [error, setError] = useState<Error | null>(null)

  const {
    enabled = true,
    refetchOnWindowFocus = true,
    onSuccess,
    onError
  } = options

  const fetchData = useCallback(async () => {
    if (!enabled) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await queryFn()
      
      if (result.error) {
        throw result.error
      }

      setData(result.data)
      onSuccess?.(result.data!)
    } catch (err) {
      const error = err as Error
      setError(error)
      onError?.(error)
    } finally {
      setIsLoading(false)
    }
  }, [queryFn, enabled, onSuccess, onError])

  useEffect(() => {
    fetchData()
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
    error,
    refetch: fetchData
  }
}

export function useSupabaseRealtime<
  TTable extends TableName,
  TData = Tables[TTable]['Row']
>(
  table: TTable,
  options: {
    event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*'
    filter?: string
    onInsert?: (payload: RealtimePostgresChangesPayload<TData>) => void
    onUpdate?: (payload: RealtimePostgresChangesPayload<TData>) => void
    onDelete?: (payload: RealtimePostgresChangesPayload<TData>) => void
    onChange?: (payload: RealtimePostgresChangesPayload<TData>) => void
  } = {}
) {
  const [channel, setChannel] = useState<RealtimeChannel | null>(null)
  const [isSubscribed, setIsSubscribed] = useState(false)

  useEffect(() => {
    const {
      event = '*',
      filter,
      onInsert,
      onUpdate,
      onDelete,
      onChange
    } = options

    const channelName = `${table}_${Date.now()}`
    const newChannel = supabase
      .channel(channelName)
      .on<TData>(
        'postgres_changes',
        {
          event,
          schema: 'public',
          table: table as string,
          filter
        },
        (payload) => {
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
  }, [table, options])

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
      const { data: result, error } = await supabase
        .from(table as string)
        .insert(data as Record<string, unknown> | Record<string, unknown>[])
        .select()

      if (error) throw error

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
      const { data: result, error } = await supabase
        .from(table as string)
        .update(updates as Record<string, unknown>)
        .eq(filter.column, filter.value)
        .select()

      if (error) throw error

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
      const { error } = await supabase
        .from(table as string)
        .delete()
        .eq(filter.column, filter.value)

      if (error) throw error

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