'use client'

import { AuthProvider } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { QueryProvider } from '@/providers/QueryProvider'
import { AgentProvider } from '@/providers/AgentProvider'
import { ToastProvider } from '@/components/premium/Toast'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <ThemeProvider defaultTheme="dark">
        <ToastProvider>
          <AuthProvider>
            <AgentProvider>
              {children}
            </AgentProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </QueryProvider>
  )
}