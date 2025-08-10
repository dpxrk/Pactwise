"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { FileText, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';

interface Activity {
  id: string;
  type: 'contract_created' | 'contract_signed' | 'contract_expired' | 'vendor_added' | 'payment_processed';
  title: string;
  description: string;
  timestamp: string;
  user?: {
    name: string;
    avatar?: string;
  };
  status?: 'success' | 'warning' | 'error' | 'pending';
}

export function RecentActivity() {
  const activities: Activity[] = [
    {
      id: '1',
      type: 'contract_created',
      title: 'New Contract Created',
      description: 'Service Agreement with Acme Corp',
      timestamp: '2 hours ago',
      user: { name: 'John Doe' },
      status: 'success'
    },
    {
      id: '2',
      type: 'contract_signed',
      title: 'Contract Signed',
      description: 'NDA with Tech Solutions Inc',
      timestamp: '4 hours ago',
      user: { name: 'Jane Smith' },
      status: 'success'
    },
    {
      id: '3',
      type: 'contract_expired',
      title: 'Contract Expired',
      description: 'Maintenance Agreement with BuildCo',
      timestamp: '1 day ago',
      status: 'warning'
    },
    {
      id: '4',
      type: 'vendor_added',
      title: 'New Vendor Added',
      description: 'CloudTech Services registered',
      timestamp: '2 days ago',
      user: { name: 'Mike Johnson' },
      status: 'success'
    },
    {
      id: '5',
      type: 'payment_processed',
      title: 'Payment Processed',
      description: 'Invoice #1234 paid to Software Ltd',
      timestamp: '3 days ago',
      status: 'success'
    }
  ];

  const getStatusIcon = (status?: Activity['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-blue-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'contract_created':
      case 'contract_signed':
      case 'contract_expired':
        return <FileText className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>
          Latest updates from your contracts and vendors
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                {activity.user ? (
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={activity.user.avatar} />
                    <AvatarFallback>
                      {activity.user.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                    {getActivityIcon(activity.type)}
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{activity.title}</p>
                  {getStatusIcon(activity.status)}
                </div>
                <p className="text-sm text-muted-foreground">{activity.description}</p>
                <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default RecentActivity;