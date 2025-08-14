'use client'

import { useDemoAccess } from '@/hooks/useDemoAccess'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle, Lock, RotateCcw } from 'lucide-react'

export function DemoUnlockStatus() {
  const { isDemoUnlocked, resetDemoAccess } = useDemoAccess()
  
  const demos = [
    { id: 'contract-analysis', name: 'Contract Analysis' },
    { id: 'vendor-evaluation', name: 'Vendor Evaluation' },
    { id: 'negotiation-assistant', name: 'Negotiation Assistant' },
    { id: 'compliance-monitoring', name: 'Compliance Monitoring' }
  ]
  
  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50 max-w-xs">
      <h3 className="font-semibold mb-2 text-sm">Demo Access Status</h3>
      <div className="space-y-1 mb-3">
        {demos.map(demo => (
          <div key={demo.id} className="flex items-center justify-between text-xs">
            <span>{demo.name}</span>
            {isDemoUnlocked(demo.id) ? (
              <Badge variant="outline" className="text-green-600 border-green-600">
                <CheckCircle className="w-3 h-3 mr-1" />
                Unlocked
              </Badge>
            ) : (
              <Badge variant="outline" className="text-gray-500">
                <Lock className="w-3 h-3 mr-1" />
                Locked
              </Badge>
            )}
          </div>
        ))}
      </div>
      <Button 
        onClick={resetDemoAccess} 
        size="sm" 
        variant="outline"
        className="w-full text-xs"
      >
        <RotateCcw className="w-3 h-3 mr-1" />
        Reset Demo Access
      </Button>
    </div>
  )
}