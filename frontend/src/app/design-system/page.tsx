"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton, SkeletonCard, SkeletonTable } from "@/components/ui/skeleton"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

/**
 * Pactwise Design System Showcase
 *
 * This page demonstrates all enhanced components with the Bloomberg Terminal × Linear
 * aesthetic and purple/pink brand identity.
 */
export default function DesignSystemPage() {
  return (
    <div className="min-h-screen bg-ghost-100 noise-texture">
      <div className="gradient-mesh min-h-screen">
        <div className="container mx-auto px-6 py-20">
          {/* Header */}
          <div className="mb-16 text-center">
            <h1 className="text-6xl font-display font-bold text-purple-900 mb-4 tracking-tight">
              Pactwise Design System
            </h1>
            <p className="text-xl text-ghost-700 max-w-2xl mx-auto">
              Bloomberg Terminal × Linear aesthetic with distinctive purple/pink brand identity
            </p>
          </div>

          {/* Typography Section */}
          <section className="mb-20">
            <h2 className="text-4xl font-display font-bold text-purple-900 mb-8 tracking-tight">
              Typography
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <Card variant="premium" animated>
                <CardHeader>
                  <CardTitle>Display Font - Syne</CardTitle>
                  <CardDescription>Geometric and distinctive for headlines</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="font-display text-4xl font-bold text-purple-900">
                      Headlines
                    </p>
                    <p className="font-display text-2xl font-semibold text-purple-900">
                      Subheadings
                    </p>
                    <p className="font-display text-xl font-medium text-purple-900">
                      Card Titles
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card variant="premium" animated>
                <CardHeader>
                  <CardTitle>Body Font - Montserrat</CardTitle>
                  <CardDescription>Clean and readable for content</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="font-sans text-base text-ghost-900">
                      Body text at 16px provides excellent readability across all devices.
                    </p>
                    <p className="font-sans text-sm text-ghost-700">
                      Secondary text at 14px for descriptions and metadata.
                    </p>
                    <p className="font-sans text-xs text-ghost-600">
                      Small text at 12px for labels and captions.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card variant="premium" animated>
                <CardHeader>
                  <CardTitle>Mono Font - JetBrains Mono</CardTitle>
                  <CardDescription>Technical precision for data</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="data-value text-2xl">$1,234,567.89</p>
                    <p className="font-jetbrains text-sm text-ghost-700">
                      CONTRACT-2024-001
                    </p>
                    <p className="font-jetbrains text-xs text-ghost-600">
                      2024-01-15 14:32:45
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Buttons Section */}
          <section className="mb-20">
            <h2 className="text-4xl font-display font-bold text-purple-900 mb-8 tracking-tight">
              Buttons
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card variant="default" animated>
                <CardHeader>
                  <CardTitle>Button Variants</CardTitle>
                  <CardDescription>Sophisticated micro-interactions with purple/pink accents</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-3">
                      <Button variant="default">Default</Button>
                      <Button variant="secondary">Secondary</Button>
                      <Button variant="outline">Outline</Button>
                      <Button variant="ghost">Ghost</Button>
                      <Button variant="link">Link</Button>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Button variant="premium">Premium</Button>
                      <Button variant="terminal">TERMINAL</Button>
                      <Button variant="destructive">Destructive</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card variant="default" animated>
                <CardHeader>
                  <CardTitle>Button Sizes</CardTitle>
                  <CardDescription>From compact to extra large</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <Button size="sm">Small</Button>
                      <Button size="default">Default</Button>
                      <Button size="lg">Large</Button>
                      <Button size="xl">Extra Large</Button>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <Button size="icon" variant="default">🔍</Button>
                      <Button size="icon" variant="outline">⚙️</Button>
                      <Button size="icon" variant="ghost">✕</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Cards Section */}
          <section className="mb-20">
            <h2 className="text-4xl font-display font-bold text-purple-900 mb-8 tracking-tight">
              Cards
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <Card variant="default" animated>
                <CardHeader>
                  <CardTitle>Default Card</CardTitle>
                  <CardDescription>Clean white background with elegant shadow</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-ghost-700">
                    Perfect for most content, with subtle borders and refined spacing.
                  </p>
                </CardContent>
              </Card>

              <Card variant="premium" animated>
                <CardHeader>
                  <CardTitle>Premium Card</CardTitle>
                  <CardDescription>Purple accents with gradient background</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-ghost-700">
                    Elevated design with purple borders and subtle gradient overlay.
                  </p>
                </CardContent>
              </Card>

              <Card variant="terminal" animated>
                <CardHeader>
                  <CardTitle className="font-jetbrains text-text-primary">Terminal Card</CardTitle>
                  <CardDescription className="font-jetbrains text-text-secondary text-xs">
                    Bloomberg-inspired dark theme
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-text-secondary font-jetbrains text-sm">
                    Technical precision with monospace typography and dark background.
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Inputs Section */}
          <section className="mb-20">
            <h2 className="text-4xl font-display font-bold text-purple-900 mb-8 tracking-tight">
              Inputs
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card variant="default" animated>
                <CardHeader>
                  <CardTitle>Input Variants</CardTitle>
                  <CardDescription>Multiple styles for different contexts</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-ghost-900 mb-2 block">Default Input</label>
                      <Input variant="default" placeholder="Enter text..." />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-ghost-900 mb-2 block">Premium Input</label>
                      <Input variant="premium" placeholder="Premium style..." />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-ghost-900 mb-2 block">Ghost Input</label>
                      <Input variant="ghost" placeholder="Subtle background..." />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card variant="default" animated>
                <CardHeader>
                  <CardTitle>Validation States</CardTitle>
                  <CardDescription>Success, warning, and error states</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-success-800 mb-2 block">Success</label>
                      <Input validation="success" placeholder="Valid input" defaultValue="john@example.com" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-warning-800 mb-2 block">Warning</label>
                      <Input validation="warning" placeholder="Needs attention" defaultValue="weak-password" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-error-800 mb-2 block">Error</label>
                      <Input validation="error" placeholder="Invalid input" defaultValue="invalid-email" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Badges Section */}
          <section className="mb-20">
            <h2 className="text-4xl font-display font-bold text-purple-900 mb-8 tracking-tight">
              Badges & Status Indicators
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card variant="default" animated>
                <CardHeader>
                  <CardTitle>Badge Variants</CardTitle>
                  <CardDescription>Diverse styles for different uses</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-3">
                      <Badge variant="default">Default</Badge>
                      <Badge variant="secondary">Secondary</Badge>
                      <Badge variant="outline">Outline</Badge>
                      <Badge variant="ghost">Ghost</Badge>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Badge variant="premium">Premium</Badge>
                      <Badge variant="terminal">TERMINAL</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card variant="default" animated>
                <CardHeader>
                  <CardTitle>Status Badges</CardTitle>
                  <CardDescription>With pulse animations and dots</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-3">
                      <Badge variant="success" dot>Active</Badge>
                      <Badge variant="warning" dot>Pending</Badge>
                      <Badge variant="error" dot>Failed</Badge>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Badge variant="success" size="lg" dot>Processing</Badge>
                      <Badge variant="default" size="sm">New</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Loading States Section */}
          <section className="mb-20">
            <h2 className="text-4xl font-display font-bold text-purple-900 mb-8 tracking-tight">
              Loading States
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card variant="default" animated>
                <CardHeader>
                  <CardTitle>Loading Spinners</CardTitle>
                  <CardDescription>Branded spinner animations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="flex items-center gap-6">
                      <LoadingSpinner variant="default" size="sm" />
                      <LoadingSpinner variant="default" size="default" />
                      <LoadingSpinner variant="default" size="lg" />
                      <LoadingSpinner variant="default" size="xl" />
                    </div>
                    <div className="flex items-center gap-6">
                      <LoadingSpinner variant="premium" size="lg" />
                      <LoadingSpinner variant="secondary" size="lg" />
                      <LoadingSpinner variant="terminal" size="lg" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card variant="default" animated>
                <CardHeader>
                  <CardTitle>Skeleton Loaders</CardTitle>
                  <CardDescription>Shimmer effects for content loading</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Skeleton variant="shimmer" className="h-10 w-full" />
                    <Skeleton variant="shimmer" className="h-6 w-3/4" />
                    <Skeleton variant="shimmer" className="h-6 w-1/2" />
                    <div className="flex gap-3">
                      <Skeleton variant="premium" className="h-8 w-20" />
                      <Skeleton variant="premium" className="h-8 w-24" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="mt-8">
              <Card variant="default">
                <CardHeader>
                  <CardTitle>Pre-built Skeleton Patterns</CardTitle>
                  <CardDescription>Common loading patterns for cards and tables</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <SkeletonCard />
                    <SkeletonTable rows={3} />
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Utility Classes Section */}
          <section className="mb-20">
            <h2 className="text-4xl font-display font-bold text-purple-900 mb-8 tracking-tight">
              Utility Classes
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card variant="premium" animated>
                <CardHeader>
                  <CardTitle>Gradient Text</CardTitle>
                  <CardDescription>Premium gradient effects for headlines</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <h3 className="text-3xl text-gradient-premium">
                      Premium Gradient
                    </h3>
                    <h3 className="text-3xl text-gradient-accent">
                      Accent Gradient
                    </h3>
                  </div>
                </CardContent>
              </Card>

              <Card variant="default" animated className="card-premium">
                <CardHeader>
                  <CardTitle>Data Display</CardTitle>
                  <CardDescription>Monospace for technical precision</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-ghost-600 mb-1">Revenue</p>
                      <p className="metric-large">$2,847,392</p>
                    </div>
                    <div>
                      <p className="text-sm text-ghost-600 mb-1">Contract ID</p>
                      <p className="data-value text-lg">PACT-2024-1547</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Footer */}
          <div className="text-center pt-12 border-t-2 border-purple-200">
            <p className="text-ghost-700 font-display font-semibold">
              Pactwise Design System v1.0
            </p>
            <p className="text-ghost-600 text-sm mt-2">
              Bloomberg Terminal × Linear aesthetic with purple/pink brand identity
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
