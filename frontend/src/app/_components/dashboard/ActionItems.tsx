'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { AlertCircle, Calendar, FileText, TrendingDown, Clock, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import type { Id } from '@/types/id.types';

interface ActionItem {
  id: string;
  type: 'expiring' | 'pending' | 'overdue' | 'compliance';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  dueDate?: string;
  actionUrl?: string;
}

interface ActionItemsProps {
  enterpriseId: Id<"enterprises">;
}

export const ActionItems: React.FC<ActionItemsProps> = ({ enterpriseId }) => {
  const router = useRouter();
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchActionItems = async () => {
      const supabase = createClient();
      const items: ActionItem[] = [];

      try {
        // Fetch contracts expiring in next 30 days
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

        const { data: expiringContracts, error: expiringError } = await supabase
          .from('contracts')
          .select('id, title, end_date, vendors(name)')
          .eq('enterprise_id', enterpriseId)
          .eq('status', 'active')
          .gte('end_date', new Date().toISOString())
          .lte('end_date', thirtyDaysFromNow.toISOString())
          .order('end_date', { ascending: true })
          .limit(5);

        if (!expiringError && expiringContracts) {
          expiringContracts.forEach((contract: any) => {
            const daysUntilExpiry = Math.ceil(
              (new Date(contract.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
            );

            items.push({
              id: contract.id,
              type: 'expiring',
              title: `Contract Expiring in ${daysUntilExpiry} Days`,
              description: `${contract.title} with ${contract.vendors?.name || 'vendor'} expires ${new Date(contract.end_date).toLocaleDateString()}`,
              priority: daysUntilExpiry <= 7 ? 'high' : daysUntilExpiry <= 14 ? 'medium' : 'low',
              dueDate: contract.end_date,
              actionUrl: `/dashboard/contracts/${contract.id}`
            });
          });
        }

        // Fetch pending analysis contracts
        const { data: pendingContracts, error: pendingError } = await supabase
          .from('contracts')
          .select('id, title, created_at')
          .eq('enterprise_id', enterpriseId)
          .eq('status', 'pending_analysis')
          .order('created_at', { ascending: true })
          .limit(3);

        if (!pendingError && pendingContracts) {
          pendingContracts.forEach((contract: any) => {
            items.push({
              id: contract.id,
              type: 'pending',
              title: 'Contract Pending Analysis',
              description: `${contract.title} uploaded ${new Date(contract.created_at).toLocaleDateString()}`,
              priority: 'medium',
              actionUrl: `/dashboard/contracts/${contract.id}`
            });
          });
        }

        // Fetch expired contracts that are still active (data quality issue)
        const { data: overdueContracts, error: overdueError } = await supabase
          .from('contracts')
          .select('id, title, end_date')
          .eq('enterprise_id', enterpriseId)
          .eq('status', 'active')
          .lt('end_date', new Date().toISOString())
          .limit(3);

        if (!overdueError && overdueContracts && overdueContracts.length > 0) {
          overdueContracts.forEach((contract: any) => {
            items.push({
              id: contract.id,
              type: 'overdue',
              title: 'Overdue Contract',
              description: `${contract.title} expired ${new Date(contract.end_date).toLocaleDateString()}`,
              priority: 'high',
              dueDate: contract.end_date,
              actionUrl: `/dashboard/contracts/${contract.id}`
            });
          });
        }

        setActionItems(items.sort((a, b) => {
          const priorityOrder = { high: 0, medium: 1, low: 2 };
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }));
      } catch (error) {
        console.error('Error fetching action items:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (enterpriseId) {
      fetchActionItems();
    }
  }, [enterpriseId]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-50 text-red-700 border-red-300';
      case 'medium':
        return 'bg-amber-50 text-amber-700 border-amber-300';
      case 'low':
        return 'bg-blue-50 text-blue-700 border-blue-300';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-300';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'expiring':
        return <Calendar className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'overdue':
        return <AlertCircle className="h-4 w-4" />;
      case 'compliance':
        return <TrendingDown className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-white border-purple-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-purple-900 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Action Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-6 w-6 border-2 border-purple-900 border-t-transparent rounded-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border-purple-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-purple-900 flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Action Items
          {actionItems.length > 0 && (
            <Badge variant="outline" className="ml-auto bg-red-50 text-red-700 border-red-300">
              {actionItems.length} {actionItems.length === 1 ? 'item' : 'items'}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {actionItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-1">All Clear!</h3>
            <p className="text-sm text-gray-600">No urgent action items at this time</p>
          </div>
        ) : (
          <div className="space-y-3">
            {actionItems.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 p-4 rounded-lg border border-gray-200 hover:border-purple-300 transition-colors cursor-pointer"
                onClick={() => item.actionUrl && router.push(item.actionUrl)}
              >
                <div className={`mt-0.5 p-2 rounded-lg ${getPriorityColor(item.priority)}`}>
                  {getTypeIcon(item.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-sm text-gray-900">{item.title}</h4>
                    <Badge variant="outline" className={`text-xs ${getPriorityColor(item.priority)}`}>
                      {item.priority}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600">{item.description}</p>
                </div>
                {item.actionUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-purple-900 hover:text-purple-700 hover:bg-purple-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(item.actionUrl!);
                    }}
                  >
                    View
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
