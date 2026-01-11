import { useEffect, useState, useCallback } from 'react'

import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/utils/supabase/client'

import { useSupabaseQuery, useSupabaseRealtime, useSupabaseMutation } from './useSupabase'

const supabase = createClient()

// Manual type definitions for notifications (not in generated types)
interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  priority: 'low' | 'medium' | 'high'
  is_read: boolean
  link?: string | null
  metadata?: Record<string, any> | null
  created_at: string
  updated_at: string
}

type NotificationInsert = Omit<Notification, 'id' | 'created_at' | 'updated_at'>
type NotificationUpdate = Partial<Omit<Notification, 'id' | 'created_at'>>

interface UseNotificationsOptions {
  unreadOnly?: boolean
  priority?: Notification['priority']
  limit?: number
  realtime?: boolean
}

export function useNotifications(options: UseNotificationsOptions = {}) {
  const { user, userProfile } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  
  const buildQuery = useCallback(() => {
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user!.id)

    if (options.unreadOnly) {
      query = query.eq('is_read', false)
    }

    if (options.priority) {
      query = query.eq('priority', options.priority)
    }

    query = query.order('created_at', { ascending: false })

    if (options.limit) {
      query = query.limit(options.limit)
    }

    return query
  }, [user, options])

  const { data, isLoading, error, refetch } = useSupabaseQuery(
    async () => {
      const result = await buildQuery()
      return { data: result.data, error: result.error }
    },
    {
      enabled: !!user?.id
    }
  )

  // Fetch unread count
  const { data: unreadData } = useSupabaseQuery(
    async () => {
      const result = await supabase
        .from('notifications')
        .select('id', { count: 'exact' })
        .eq('user_id', user!.id)
        .eq('is_read', false)
      
      return { data: result.count, error: result.error }
    },
    {
      enabled: !!user?.id
    }
  )

  useEffect(() => {
    if (data) {
      setNotifications(data as unknown as Notification[])
    }
  }, [data])

  useEffect(() => {
    if (unreadData !== null && unreadData !== undefined) {
      setUnreadCount(unreadData as number)
    }
  }, [unreadData])

  // Real-time subscription for new notifications
  const { isSubscribed } = useSupabaseRealtime('notifications' as any, {
    filter: user?.id ? `user_id=eq.${user.id}` : undefined,
    onInsert: (payload: any) => {
      if (options.realtime) {
        setNotifications(prev => [payload.new as Notification, ...prev])
        if (!(payload.new as Notification).is_read) {
          setUnreadCount(prev => prev + 1)
        }
      }
    },
    onUpdate: (payload: any) => {
      if (options.realtime) {
        setNotifications(prev =>
          prev.map(notification =>
            notification.id === (payload.new as Notification).id ? payload.new as Notification : notification
          )
        )
        // Update unread count if read status changed
        const oldNotification = notifications.find(n => n.id === (payload.new as Notification).id)
        if (oldNotification && !oldNotification.is_read && (payload.new as Notification).is_read) {
          setUnreadCount(prev => Math.max(0, prev - 1))
        } else if (oldNotification && oldNotification.is_read && !(payload.new as Notification).is_read) {
          setUnreadCount(prev => prev + 1)
        }
      }
    },
    onDelete: (payload: any) => {
      if (options.realtime) {
        const deletedNotification = notifications.find(n => n.id === (payload.old as Notification).id)
        setNotifications(prev =>
          prev.filter(notification => notification.id !== (payload.old as Notification).id)
        )
        if (deletedNotification && !deletedNotification.is_read) {
          setUnreadCount(prev => Math.max(0, prev - 1))
        }
      }
    }
  })

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    refetch,
    isSubscribed: options.realtime ? isSubscribed : false
  }
}

export function useNotificationMutations() {
  const { user } = useAuth()
  const mutations = useSupabaseMutation('notifications' as any)

  const markAsRead = useCallback(async (
    notificationId: string,
    options?: {
      onSuccess?: () => void
      onError?: (error: Error) => void
    }
  ) => {
    const result = await mutations.update(
      { is_read: true } as NotificationUpdate,
      { column: 'id', value: notificationId }
    )

    if (result.error) {
      options?.onError?.(result.error)
    } else {
      options?.onSuccess?.()
    }

    return result
  }, [mutations])

  const markAllAsRead = useCallback(async (
    options?: {
      onSuccess?: () => void
      onError?: (error: Error) => void
    }
  ) => {
    if (!user?.id) {
      const error = new Error('User not authenticated')
      options?.onError?.(error)
      return { error }
    }

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false)

      if (error) throw error

      options?.onSuccess?.()
      return { error: null }
    } catch (err) {
      const error = err as Error
      options?.onError?.(error)
      return { error }
    }
  }, [user])

  const deleteNotification = useCallback(async (
    notificationId: string,
    options?: {
      onSuccess?: () => void
      onError?: (error: Error) => void
    }
  ) => {
    return mutations.remove(
      { column: 'id', value: notificationId },
      options
    )
  }, [mutations])

  const clearAll = useCallback(async (
    options?: {
      onSuccess?: () => void
      onError?: (error: Error) => void
    }
  ) => {
    if (!user?.id) {
      const error = new Error('User not authenticated')
      options?.onError?.(error)
      return { error }
    }

    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id)

      if (error) throw error

      options?.onSuccess?.()
      return { error: null }
    } catch (err) {
      const error = err as Error
      options?.onError?.(error)
      return { error }
    }
  }, [user])

  return {
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    isLoading: mutations.isLoading,
    error: mutations.error
  }
}

// Manual type definitions for notification preferences (not in generated types)
interface NotificationPreferences {
  id: string
  user_id: string
  email_notifications: boolean
  push_notifications: boolean
  in_app_notifications: boolean
  notification_types: string[]
  created_at: string
  updated_at: string
}

export function useNotificationPreferences() {
  const { user, userProfile } = useAuth()

  const { data, isLoading, error, refetch } = useSupabaseQuery(
    async () => {
      const result = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user!.id)
        .single()

      return { data: result.data, error: result.error }
    },
    {
      enabled: !!user?.id
    }
  )

  const updatePreferences = useCallback(async (
    preferences: Partial<NotificationPreferences>,
    options?: {
      onSuccess?: () => void
      onError?: (error: Error) => void
    }
  ) => {
    if (!user?.id) {
      const error = new Error('User not authenticated')
      options?.onError?.(error)
      return { error }
    }

    try {
      const { error } = await (supabase as any)
        .from('notification_preferences')
        .upsert({
          ...preferences,
          user_id: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)

      if (error) throw error

      await refetch()
      options?.onSuccess?.()
      return { error: null }
    } catch (err) {
      const error = err as Error
      options?.onError?.(error)
      return { error }
    }
  }, [user, refetch])

  return {
    preferences: data as NotificationPreferences | null,
    isLoading,
    error,
    updatePreferences
  }
}

// Helper hook to create notifications (typically called from server actions)
export function useCreateNotification() {
  const mutations = useSupabaseMutation('notifications' as any)

  const createNotification = useCallback(async (
    notification: Omit<NotificationInsert, 'id' | 'created_at'>,
    options?: {
      onSuccess?: (data: Notification[]) => void
      onError?: (error: Error) => void
    }
  ) => {
    return mutations.insert(notification as any, options)
  }, [mutations])

  const createBulkNotifications = useCallback(async (
    notifications: Omit<NotificationInsert, 'id' | 'created_at'>[],
    options?: {
      onSuccess?: (data: Notification[]) => void
      onError?: (error: Error) => void
    }
  ) => {
    return mutations.insert(notifications as any, options)
  }, [mutations])

  return {
    createNotification,
    createBulkNotifications,
    isLoading: mutations.isLoading,
    error: mutations.error
  }
}