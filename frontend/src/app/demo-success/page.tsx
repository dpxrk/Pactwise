'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { CheckCircle, ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useDemoAccess } from '@/hooks/useDemoAccess'

export default function DemoSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { unlockDemo } = useDemoAccess()
  const [isVerifying, setIsVerifying] = useState(true)
  const [verificationSuccess, setVerificationSuccess] = useState(false)

  const sessionId = searchParams.get('session_id')
  const demoName = searchParams.get('demo')

  useEffect(() => {
    const verifyPayment = async () => {
      if (!sessionId || !demoName) {
        setIsVerifying(false)
        return
      }

      try {
        // Verify the payment session
        const response = await fetch('/api/verify-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId })
        })

        const result = await response.json()
        
        if (result.success) {
          // Map demo names to IDs
          const demoIdMap: Record<string, string> = {
            'Contract Analysis': 'contract-analysis',
            'Vendor Evaluation': 'vendor-evaluation',
            'Negotiation Assistant': 'negotiation-assistant',
            'Compliance Monitoring': 'compliance-monitoring'
          }
          
          const demoId = demoIdMap[demoName]
          if (demoId) {
            unlockDemo(demoId)
            setVerificationSuccess(true)
          }
        }
      } catch (error) {
        console.error('Payment verification failed:', error)
      } finally {
        setIsVerifying(false)
      }
    }

    // Simulate verification delay
    setTimeout(verifyPayment, 2000)
  }, [sessionId, demoName, unlockDemo])

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Verifying Payment</h2>
          <p className="text-gray-600">Please wait while we confirm your purchase...</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <Card className="p-8 text-center">
          {verificationSuccess ? (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2 }}
                className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
              >
                <CheckCircle className="w-10 h-10 text-green-600" />
              </motion.div>

              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Payment Successful!
              </h1>
              
              <p className="text-gray-600 mb-4">
                You've successfully unlocked <span className="font-semibold">{demoName}</span> demo access.
              </p>

              <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg mb-6">
                <div className="flex items-center justify-center gap-2 text-sm text-blue-800">
                  <Sparkles className="w-4 h-4" />
                  <span>Premium features are now available</span>
                </div>
              </div>

              <div className="space-y-3">
                <Button 
                  onClick={() => router.push('/')}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  Return to Demos
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => router.push('/dashboard')}
                  className="w-full"
                >
                  Explore Full Platform
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-red-600" />
              </div>

              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Payment Verification Failed
              </h1>
              
              <p className="text-gray-600 mb-6">
                We couldn't verify your payment. Please try again or contact support.
              </p>

              <Button 
                onClick={() => router.push('/')}
                variant="outline"
                className="w-full"
              >
                Return to Homepage
              </Button>
            </>
          )}
        </Card>
      </motion.div>
    </div>
  )
}