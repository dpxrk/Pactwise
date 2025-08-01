'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { 
  Home, 
  Search, 
  ArrowLeft, 
  FileText, 
  Users, 
  Settings,
  HelpCircle,
  Mail
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NotFound() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/dashboard/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const quickActions = [
    {
      icon: <Home className="h-5 w-5" />,
      title: 'Dashboard',
      description: 'Go to your main dashboard',
      href: '/dashboard'
    },
    {
      icon: <FileText className="h-5 w-5" />,
      title: 'Contracts',
      description: 'View and manage your contracts',
      href: '/dashboard/contracts'
    },
    {
      icon: <Users className="h-5 w-5" />,
      title: 'Vendors',
      description: 'Manage your vendor relationships',
      href: '/dashboard/vendors'
    },
    {
      icon: <Settings className="h-5 w-5" />,
      title: 'Settings',
      description: 'Configure your account settings',
      href: '/dashboard/settings'
    }
  ];

  const helpResources = [
    {
      title: 'Getting Started Guide',
      description: 'Learn the basics of using Pactwise'
    },
    {
      title: 'Contract Management',
      description: 'How to create and manage contracts'
    },
    {
      title: 'Vendor Onboarding',
      description: 'Best practices for adding vendors'
    },
    {
      title: 'API Documentation',
      description: 'Integrate with our API'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-4xl mx-auto text-center space-y-8">
        {/* Main 404 Message */}
        <div className="space-y-4">
          <div className="text-8xl font-bold text-blue-600">404</div>
          <h1 className="text-4xl font-bold text-gray-900">Page Not Found</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            The page you're looking for doesn't exist or has been moved. 
            Let's help you find what you need.
          </p>
        </div>

        {/* Search Section */}
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search for Content
            </CardTitle>
            <CardDescription>
              Try searching for contracts, vendors, or settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search Pactwise..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button type="submit" className="w-full">
                Search
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-900">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow cursor-pointer">
                <Link href={action.href}>
                  <CardContent className="p-6 text-center space-y-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto">
                      {action.icon}
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-semibold">{action.title}</h3>
                      <p className="text-sm text-muted-foreground">{action.description}</p>
                    </div>
                  </CardContent>
                </Link>
              </Card>
            ))}
          </div>
        </div>

        <Separator className="max-w-2xl mx-auto" />

        {/* Help Resources */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-900">Need Help?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {helpResources.map((resource, index) => (
              <div key={index} className="p-4 bg-white rounded-lg border hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-start gap-3">
                  <HelpCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <h3 className="font-medium">{resource.title}</h3>
                    <p className="text-sm text-muted-foreground">{resource.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button onClick={() => router.back()} variant="outline" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </Button>
          <Button asChild>
            <Link href="/dashboard">
              <Home className="h-4 w-4 mr-2" />
              Go to Dashboard
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="mailto:support@pactwise.com">
              <Mail className="h-4 w-4 mr-2" />
              Contact Support
            </Link>
          </Button>
        </div>

        {/* Footer */}
        <div className="pt-8 text-sm text-gray-500">
          <p>
            If you believe this is an error, please{' '}
            <Link href="mailto:support@pactwise.com" className="text-blue-600 hover:underline">
              contact our support team
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}