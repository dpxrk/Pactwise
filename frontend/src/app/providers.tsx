'use client'

import { ToastProvider } from '@/components/premium/Toast'
import { AuthProvider } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { SwarmModeProvider } from '@/contexts/SwarmModeContext'
import { AgentProvider } from '@/providers/AgentProvider'
import { QueryProvider } from '@/providers/QueryProvider'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <ThemeProvider defaultTheme="dark">
        <ToastProvider>
          <SwarmModeProvider defaultConfig={{ algorithm: 'pso' }}>
            <AuthProvider>
              <AgentProvider>
                {children}
              </AgentProvider>
            </AuthProvider>
          </SwarmModeProvider>
        </ToastProvider>
      </ThemeProvider>
    </QueryProvider>
  )
}