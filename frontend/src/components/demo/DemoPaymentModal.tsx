'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Lock, Sparkles, CheckCircle, CreditCard, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface DemoPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  demoName: string
}

export default function DemoPaymentModal({ 
  isOpen, 
  onClose, 
  onSuccess,
  demoName 
}: DemoPaymentModalProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentComplete, setPaymentComplete] = useState(false)

  const handlePayment = async () => {
    setIsProcessing(true)
    
    try {
      // Create checkout session
      const response = await fetch('/api/create-demo-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          demoName,
          amount: 1000 // $10 in cents
        })
      })

      const { url, error } = await response.json()
      
      if (error) {
        console.error('Payment error:', error)
        setIsProcessing(false)
        return
      }

      // Redirect to Stripe Checkout
      if (url) {
        window.location.href = url
      } else {
        // Fallback: if no URL returned, show error
        console.error('No checkout URL received')
        setIsProcessing(false)
      }
    } catch (error) {
      console.error('Payment failed:', error)
      setIsProcessing(false)
    }
  }

  const handleMockPayment = () => {
    // For testing purposes - simulate payment success
    setIsProcessing(true)
    setTimeout(() => {
      setPaymentComplete(true)
      setIsProcessing(false)
      setTimeout(() => {
        onSuccess()
        onClose()
      }, 2000)
    }, 2000)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative z-10 w-full max-w-md mx-4"
          >
            <Card className="relative overflow-hidden bg-white border-gray-200">
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 transition-colors z-10"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>

              {/* Decorative gradient */}
              <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10" />
              
              <div className="relative p-8">
                {!paymentComplete ? (
                  <>
                    {/* Icon */}
                    <div className="flex justify-center mb-6">
                      <div className="relative">
                        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
                          <Lock className="w-10 h-10 text-white" />
                        </div>
                        <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                          <Sparkles className="w-5 h-5 text-yellow-900" />
                        </div>
                      </div>
                    </div>

                    {/* Title */}
                    <h2 className="text-2xl font-bold text-center mb-2">
                      Unlock Full Demo Results
                    </h2>
                    
                    {/* Description */}
                    <p className="text-gray-600 text-center mb-6">
                      Get complete access to <span className="font-semibold">{demoName}</span> diagnostic results and detailed insights
                    </p>

                    {/* Features */}
                    <div className="space-y-3 mb-6">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Full diagnostic results</p>
                          <p className="text-xs text-gray-500">Complete analysis without any restrictions</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Detailed insights</p>
                          <p className="text-xs text-gray-500">AI-powered recommendations and action items</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Export capabilities</p>
                          <p className="text-xs text-gray-500">Download results as PDF or CSV</p>
                        </div>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-6">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">One-time payment</span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-bold">$10</span>
                          <span className="text-gray-500 text-sm">USD</span>
                        </div>
                      </div>
                    </div>

                    {/* Payment buttons */}
                    <div className="space-y-3">
                      <Button 
                        onClick={handlePayment}
                        disabled={isProcessing}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                      >
                        {isProcessing ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <CreditCard className="w-4 h-4 mr-2" />
                            Pay with Card - $10
                          </>
                        )}
                      </Button>
                      
                      <Button 
                        onClick={handleMockPayment}
                        disabled={isProcessing}
                        variant="outline"
                        className="w-full border-dashed"
                      >
                        🧪 Test Mode (No Charge)
                      </Button>
                      
                      <button
                        onClick={onClose}
                        className="w-full text-sm text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        Maybe later
                      </button>
                    </div>

                    {/* Security note */}
                    <div className="flex items-center justify-center gap-2 mt-6 text-xs text-gray-400">
                      <Shield className="w-3 h-3" />
                      <span>Secure payment powered by Stripe</span>
                    </div>
                  </>
                ) : (
                  /* Success state */
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-8"
                  >
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-10 h-10 text-green-600" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Payment Successful!</h3>
                    <p className="text-gray-600">Unlocking your demo results...</p>
                  </motion.div>
                )}
              </div>
            </Card>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}