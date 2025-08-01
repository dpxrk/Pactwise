'use client';

import React, { useState, useMemo } from 'react';
import { format, formatDistanceToNow, isAfter, addHours } from 'date-fns';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  User, 
  FileText, 
  Building, 
  Calendar,
  MessageSquare,
  Eye,
  MoreHorizontal,
  Filter,
  SortAsc,
  SortDesc,
  Bell,
  Send,
  History,
  Users,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { showToast } from '../common/ToastNotifications';
import { usePermissions } from '../auth/PermissionGate';

// Approval request types
export interface ApprovalRequest {
  id: string;
  title: string;
  description?: string;
  type: 'contract' | 'vendor' | 'expense' | 'general';
  entityId?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'approved' | 'rejected' | 'escalated' | 'expired';
  
  // Requester info
  requestedBy: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  
  // Approval details
  approvers: {
    id: string;
    name: string;
    email: string;
    status: 'pending' | 'approved' | 'rejected';
    respondedAt?: Date;
    comment?: string;
  }[];
  
  requiredApprovals: number;
  currentApprovals: number;
  
  // Timing
  createdAt: Date;
  dueDate?: Date;
  escalationDate?: Date;
  
  // Workflow
  workflowId?: string;
  workflowStep?: number;
  
  // Additional data
  metadata?: Record<string, unknown>;
  attachments?: string[];
  comments?: {
    id: string;
    author: string;
    content: string;
    timestamp: Date;
  }[];
}

// Mock data for demonstration
const mockApprovalRequests: ApprovalRequest[] = [
  {
    id: '1',
    title: 'Software License Agreement - Microsoft Enterprise',
    description: 'Annual Microsoft 365 Enterprise license renewal for 150 users',
    type: 'contract',
    entityId: 'contract_123',
    priority: 'high',
    status: 'pending',
    requestedBy: {
      id: 'user_1',
      name: 'Sarah Johnson',
      email: 'sarah.j@company.com'
    },
    approvers: [
      {
        id: 'user_2',
        name: 'John Smith',
        email: 'john.s@company.com',
        status: 'pending'
      },
      {
        id: 'user_3',
        name: 'Lisa Chen',
        email: 'lisa.c@company.com',
        status: 'approved',
        respondedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        comment: 'Approved - pricing looks reasonable'
      }
    ],
    requiredApprovals: 2,
    currentApprovals: 1,
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
    dueDate: new Date(Date.now() + 18 * 60 * 60 * 1000),
    workflowId: 'workflow_1',
    workflowStep: 2
  },
  {
    id: '2',
    title: 'New Vendor Registration - TechCorp Solutions',
    description: 'Adding new IT services vendor to approved vendor list',
    type: 'vendor',
    entityId: 'vendor_456',
    priority: 'medium',
    status: 'pending',
    requestedBy: {
      id: 'user_4',
      name: 'Mike Davis',
      email: 'mike.d@company.com'
    },
    approvers: [
      {
        id: 'user_5',
        name: 'Anna Wilson',
        email: 'anna.w@company.com',
        status: 'pending'
      }
    ],
    requiredApprovals: 1,
    currentApprovals: 0,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    dueDate: new Date(Date.now() + 48 * 60 * 60 * 1000)
  }
];

// Priority colors
const priorityColors = {
  low: 'bg-blue-100 text-blue-800 dark:bg-blue-900/70 dark:text-blue-300',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/70 dark:text-yellow-300',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/70 dark:text-orange-300',
  urgent: 'bg-red-100 text-red-800 dark:bg-red-900/70 dark:text-red-300',
};

// Status colors
const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/70 dark:text-yellow-300',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900/70 dark:text-green-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/70 dark:text-red-300',
  escalated: 'bg-orange-100 text-orange-800 dark:bg-orange-900/70 dark:text-orange-300',
  expired: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

// Approval queue props
export interface ApprovalQueueProps {
  requests?: ApprovalRequest[];
  onApprove?: (requestId: string, comment?: string) => Promise<void>;
  onReject?: (requestId: string, comment: string) => Promise<void>;
  onEscalate?: (requestId: string, reason: string) => Promise<void>;
  onView?: (requestId: string) => void;
  className?: string;
}

const ApprovalQueueComponent: React.FC<ApprovalQueueProps> = ({
  requests = mockApprovalRequests,
  onApprove,
  onReject,
  onEscalate,
  onView,
  className
}) => {
  const { userData } = usePermissions();
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'requiring_action'>('all');
  const [sortBy, setSortBy] = useState<'dueDate' | 'priority' | 'createdAt'>('dueDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [actionComment, setActionComment] = useState('');

  // Filter requests based on current user's involvement
  const userRequests = useMemo(() => {
    return requests.filter(request => 
      request.approvers.some(approver => approver.id === userData?._id) ||
      request.requestedBy.id === userData?._id
    );
  }, [requests, userData]);

  // Filter and sort requests
  const filteredRequests = useMemo(() => {
    let filtered = userRequests;

    // Apply filters
    switch (filter) {
      case 'pending':
        filtered = filtered.filter(req => req.status === 'pending');
        break;
      case 'requiring_action':
        filtered = filtered.filter(req => 
          req.status === 'pending' && 
          req.approvers.some(app => app.id === userData?._id && app.status === 'pending')
        );
        break;
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: number = 0;
      let bValue: number = 0;
      
      switch (sortBy) {
        case 'dueDate':
          aValue = a.dueDate?.getTime() || Infinity;
          bValue = b.dueDate?.getTime() || Infinity;
          break;
        case 'priority':
          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
          aValue = priorityOrder[a.priority];
          bValue = priorityOrder[b.priority];
          break;
        case 'createdAt':
          aValue = a.createdAt.getTime();
          bValue = b.createdAt.getTime();
          break;
        default:
          return 0;
      }

      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    });

    return filtered;
  }, [userRequests, filter, sortBy, sortDirection, userData]);

  // Get urgent items count
  const urgentCount = filteredRequests.filter(req => 
    req.priority === 'urgent' && req.status === 'pending'
  ).length;

  // Get overdue items count
  const overdueCount = filteredRequests.filter(req => 
    req.dueDate && isAfter(new Date(), req.dueDate) && req.status === 'pending'
  ).length;

  // Handle approval actions
  const handleApprove = async (request: ApprovalRequest) => {
    if (!onApprove) return;
    
    try {
      await onApprove(request.id, actionComment);
      showToast.success('Request approved successfully', {});
      setActionComment('');
      setIsDetailDialogOpen(false);
    } catch (error) {
      showToast.error('Failed to approve request', {});
    }
  };

  const handleReject = async (request: ApprovalRequest) => {
    if (!onReject || !actionComment.trim()) {
      showToast.warning('Please provide a reason for rejection', {});
      return;
    }
    
    try {
      await onReject(request.id, actionComment);
      showToast.success('Request rejected', {});
      setActionComment('');
      setIsDetailDialogOpen(false);
    } catch (error) {
      showToast.error('Failed to reject request', {});
    }
  };

  // Get time status for a request
  const getTimeStatus = (request: ApprovalRequest) => {
    if (!request.dueDate) return null;
    
    const now = new Date();
    if (isAfter(now, request.dueDate)) {
      return { type: 'overdue', label: 'Overdue', color: 'text-red-600' };
    }
    
    const hoursUntilDue = (request.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (hoursUntilDue <= 24) {
      return { type: 'urgent', label: 'Due soon', color: 'text-orange-600' };
    }
    
    return { type: 'normal', label: formatDistanceToNow(request.dueDate, { addSuffix: true }), color: 'text-muted-foreground' };
  };

  // Approval request card component
  const ApprovalRequestCard: React.FC<{ request: ApprovalRequest }> = ({ request }) => {
    const timeStatus = getTimeStatus(request);
    const userApprover = request.approvers.find(app => app.id === userData?._id);
    const canApprove = userApprover?.status === 'pending';

    return (
      <Card className={cn(
        'cursor-pointer transition-all hover:shadow-md',
        request.priority === 'urgent' && 'ring-2 ring-red-200',
        timeStatus?.type === 'overdue' && 'bg-red-50/50'
      )}
      onClick={() => {
        setSelectedRequest(request);
        setIsDetailDialogOpen(true);
      }}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className="font-medium line-clamp-1 mb-1">{request.title}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {request.description}
              </p>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <Badge className={cn('text-xs', priorityColors[request.priority])}>
                {request.priority}
              </Badge>
              <Badge className={cn('text-xs', statusColors[request.status])}>
                {request.status}
              </Badge>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm">
              {/* Requester */}
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={request.requestedBy.avatar} />
                  <AvatarFallback className="text-xs">
                    {request.requestedBy.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-muted-foreground">{request.requestedBy.name}</span>
              </div>

              {/* Progress */}
              <div className="flex items-center gap-2">
                <Progress 
                  value={(request.currentApprovals / request.requiredApprovals) * 100} 
                  className="h-2 w-16" 
                />
                <span className="text-xs text-muted-foreground">
                  {request.currentApprovals}/{request.requiredApprovals}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Time status */}
              {timeStatus && (
                <div className={cn('flex items-center gap-1 text-xs', timeStatus.color)}>
                  <Clock className="h-3 w-3" />
                  {timeStatus.label}
                </div>
              )}

              {/* Action indicator for current user */}
              {canApprove && (
                <Badge variant="outline" className="text-xs">
                  Action Required
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Request detail dialog
  const RequestDetailDialog: React.FC = () => {
    if (!selectedRequest) return null;

    const userApprover = selectedRequest.approvers.find(app => app.id === userData?._id);
    const canApprove = userApprover?.status === 'pending';

    return (
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {selectedRequest.title}
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="details">
            <TabsList>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="approvers">Approvers</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Request Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type:</span>
                      <Badge variant="outline">{selectedRequest.type}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Priority:</span>
                      <Badge className={priorityColors[selectedRequest.priority]}>
                        {selectedRequest.priority}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge className={statusColors[selectedRequest.status]}>
                        {selectedRequest.status}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created:</span>
                      <span>{format(selectedRequest.createdAt, 'MMM dd, yyyy HH:mm')}</span>
                    </div>
                    {selectedRequest.dueDate && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Due Date:</span>
                        <span>{format(selectedRequest.dueDate, 'MMM dd, yyyy HH:mm')}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Approval Progress</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={(selectedRequest.currentApprovals / selectedRequest.requiredApprovals) * 100} 
                        className="flex-1 h-3" 
                      />
                      <span className="text-sm font-medium">
                        {selectedRequest.currentApprovals}/{selectedRequest.requiredApprovals}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {selectedRequest.requiredApprovals - selectedRequest.currentApprovals} more approval(s) needed
                    </p>
                  </div>
                </div>
              </div>

              {selectedRequest.description && (
                <div>
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-sm text-muted-foreground">{selectedRequest.description}</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="approvers" className="space-y-4">
              <h4 className="font-medium">Approvers</h4>
              <div className="space-y-3">
                {selectedRequest.approvers.map(approver => (
                  <div key={approver.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>{approver.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{approver.name}</p>
                        <p className="text-sm text-muted-foreground">{approver.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={statusColors[approver.status]}>
                        {approver.status}
                      </Badge>
                      {approver.respondedAt && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(approver.respondedAt, 'MMM dd, HH:mm')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="timeline" className="space-y-4">
              <h4 className="font-medium">Timeline</h4>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <p className="font-medium">Request Created</p>
                    <p className="text-sm text-muted-foreground">
                      By {selectedRequest.requestedBy.name} • {format(selectedRequest.createdAt, 'MMM dd, yyyy HH:mm')}
                    </p>
                  </div>
                </div>

                {selectedRequest.approvers
                  .filter(app => app.respondedAt)
                  .map(approver => (
                    <div key={approver.id} className="flex items-start gap-3 p-3 border rounded-lg">
                      <div className={cn(
                        'w-2 h-2 rounded-full mt-2',
                        approver.status === 'approved' ? 'bg-green-600' : 'bg-red-600'
                      )}></div>
                      <div className="flex-1">
                        <p className="font-medium">
                          {approver.status === 'approved' ? 'Approved' : 'Rejected'} by {approver.name}
                        </p>
                        {approver.comment && (
                          <p className="text-sm text-muted-foreground mt-1">"{approver.comment}"</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {approver.respondedAt && format(approver.respondedAt, 'MMM dd, yyyy HH:mm')}
                        </p>
                      </div>
                    </div>
                  ))
                }
              </div>
            </TabsContent>
          </Tabs>

          {/* Actions */}
          {canApprove && (
            <div className="border-t pt-4 space-y-4">
              <div>
                <Label className="text-sm font-medium">Comment (optional for approval, required for rejection)</Label>
                <Textarea
                  value={actionComment}
                  onChange={(e) => setActionComment(e.target.value)}
                  placeholder="Add your comment..."
                  className="mt-1"
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleReject(selectedRequest)}
                  disabled={!actionComment.trim()}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button onClick={() => handleApprove(selectedRequest)}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Approval Queue</h2>
          <p className="text-muted-foreground">
            {filteredRequests.length} pending approval{filteredRequests.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Alerts */}
        {(urgentCount > 0 || overdueCount > 0) && (
          <div className="flex gap-2">
            {urgentCount > 0 && (
              <Alert className="border-orange-200 bg-orange-50">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {urgentCount} urgent request{urgentCount !== 1 ? 's' : ''} require attention
                </AlertDescription>
              </Alert>
            )}
            {overdueCount > 0 && (
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {overdueCount} overdue request{overdueCount !== 1 ? 's' : ''}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </div>

      {/* Filters and controls */}
      <div className="flex items-center gap-4">
        <Select value={filter} onValueChange={(value) => setFilter(value as FilterType)}>
          <SelectTrigger className="w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Requests</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="requiring_action">Requiring My Action</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortByType)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="dueDate">Due Date</SelectItem>
            <SelectItem value="priority">Priority</SelectItem>
            <SelectItem value="createdAt">Created Date</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
          className="px-3"
        >
          {sortDirection === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
        </Button>
      </div>

      {/* Request list */}
      <div className="space-y-3">
        {filteredRequests.map(request => (
          <ApprovalRequestCard key={request.id} request={request} />
        ))}

        {filteredRequests.length === 0 && (
          <div className="text-center py-12">
            <CheckCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">All caught up!</h3>
            <p className="text-muted-foreground">No approval requests at the moment.</p>
          </div>
        )}
      </div>

      {/* Detail dialog */}
      <RequestDetailDialog />
    </div>
  );
};

export const ApprovalQueue = React.memo(ApprovalQueueComponent, (prevProps, nextProps) => {
  // Only re-render if requests array changes
  return JSON.stringify(prevProps.requests) === JSON.stringify(nextProps.requests);
});

export default ApprovalQueue;