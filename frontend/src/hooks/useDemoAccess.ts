'use client'

import { useState, useEffect } from 'react'

interface DemoAccess {
  [key: string]: boolean
}

export function useDemoAccess() {
  const [unlockedDemos, setUnlockedDemos] = useState<DemoAccess>({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Load unlocked demos from localStorage
    const stored = localStorage.getItem('unlockedDemos')
    if (stored) {
      try {
        setUnlockedDemos(JSON.parse(stored))
      } catch (e) {
        console.error('Failed to parse demo access:', e)
      }
    }
    setIsLoading(false)
  }, [])

  const unlockDemo = (demoId: string) => {
    const updated = { ...unlockedDemos, [demoId]: true }
    setUnlockedDemos(updated)
    localStorage.setItem('unlockedDemos', JSON.stringify(updated))
  }

  const isDemoUnlocked = (demoId: string): boolean => {
    return unlockedDemos[demoId] === true
  }

  const resetDemoAccess = () => {
    setUnlockedDemos({})
    localStorage.removeItem('unlockedDemos')
  }

  return {
    unlockDemo,
    isDemoUnlocked,
    resetDemoAccess,
    isLoading
  }
}