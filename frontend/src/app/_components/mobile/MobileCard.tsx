'use client';

import React, { useState } from 'react';
import { format, formatDistanceToNow, isAfter } from 'date-fns';
import { 
  ChevronRight, 
  MoreVertical, 
  Star, 
  Share, 
  Eye, 
  Edit, 
  Trash2,
  Download,
  Archive,
  Clock,
  Calendar,
  DollarSign,
  User,
  Users,
  Building,
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Zap,
  TrendingUp,
  MapPin,
  Phone,
  Mail,
  Globe,
  Activity,
  Bookmark,
  Flag,
  MessageSquare,
  Settings
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

// Base card props
interface BaseCardProps {
  id: string;
  onClick?: () => void;
  onAction?: (action: string, id: string) => void;
  className?: string;
  actions?: CardAction[];
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  status?: string;
  isFavorite?: boolean;
  isBookmarked?: boolean;
}

// Card action
interface CardAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  variant?: 'default' | 'destructive';
}

// Contract card props
export interface ContractCardProps extends BaseCardProps {
  type: 'contract';
  title: string;
  vendor: string;
  value: number;
  startDate: Date;
  endDate: Date;
  progress?: number;
  renewalStatus?: 'auto' | 'manual' | 'expired';
  department?: string;
  assignedTo?: {
    id: string;
    name: string;
    avatar?: string;
  }[];
}

// Vendor card props
export interface VendorCardProps extends BaseCardProps {
  type: 'vendor';
  name: string;
  category: string;
  location?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  website?: string;
  riskLevel: 'low' | 'medium' | 'high';
  complianceScore: number;
  totalSpend: number;
  activeContracts: number;
  lastActivity?: Date;
}

// Workflow card props
export interface WorkflowCardProps extends BaseCardProps {
  type: 'workflow';
  name: string;
  description?: string;
  currentStep: string;
  progress: number;
  assignedTo?: {
    id: string;
    name: string;
    avatar?: string;
  }[];
  dueDate?: Date;
  startedAt: Date;
  estimatedCompletion?: Date;
}

// User card props
export interface UserCardProps extends BaseCardProps {
  type: 'user';
  name: string;
  email: string;
  role: string;
  department: string;
  avatar?: string;
  lastActive?: Date;
  activeContracts?: number;
  pendingApprovals?: number;
}

// Document card props
export interface DocumentCardProps extends BaseCardProps {
  type: 'document';
  title: string;
  description?: string;
  fileType: string;
  size: string;
  uploadedBy: string;
  uploadedAt: Date;
  tags?: string[];
  version?: string;
}

// Union type for all card props
export type MobileCardProps = 
  | ContractCardProps 
  | VendorCardProps 
  | WorkflowCardProps 
  | UserCardProps 
  | DocumentCardProps;

// Status colors
const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'active':
    case 'approved':
    case 'completed':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
    case 'pending':
    case 'review':
    case 'running':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
    case 'expired':
    case 'rejected':
    case 'failed':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
    case 'draft':
    case 'inactive':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    default:
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
  }
};

// Priority colors
const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'urgent':
      return 'bg-red-500';
    case 'high':
      return 'bg-orange-500';
    case 'medium':
      return 'bg-yellow-500';
    case 'low':
      return 'bg-blue-500';
    default:
      return 'bg-gray-500';
  }
};

// Risk level colors
const getRiskLevelColor = (riskLevel: string) => {
  switch (riskLevel) {
    case 'high':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
    case 'low':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  }
};

// Common card actions
const getDefaultActions = (type: string): CardAction[] => {
  const baseActions: CardAction[] = [
    { id: 'view', label: 'View Details', icon: Eye, onClick: () => {} },
    { id: 'edit', label: 'Edit', icon: Edit, onClick: () => {} },
    { id: 'share', label: 'Share', icon: Share, onClick: () => {} },
  ];

  switch (type) {
    case 'contract':
      return [
        ...baseActions,
        { id: 'download', label: 'Download', icon: Download, onClick: () => {} },
        { id: 'archive', label: 'Archive', icon: Archive, onClick: () => {} },
        { id: 'delete', label: 'Delete', icon: Trash2, onClick: () => {}, variant: 'destructive' },
      ];
    case 'vendor':
      return [
        ...baseActions,
        { id: 'contact', label: 'Contact', icon: MessageSquare, onClick: () => {} },
        { id: 'archive', label: 'Archive', icon: Archive, onClick: () => {} },
      ];
    case 'workflow':
      return [
        ...baseActions,
        { id: 'pause', label: 'Pause', icon: XCircle, onClick: () => {} },
        { id: 'settings', label: 'Settings', icon: Settings, onClick: () => {} },
      ];
    default:
      return baseActions;
  }
};

// Contract card component
const ContractCard: React.FC<ContractCardProps> = (props) => {
  const {
    title,
    vendor,
    value,
    startDate,
    endDate,
    progress,
    renewalStatus,
    department,
    assignedTo,
    status,
    priority,
    isFavorite,
    onClick,
    onAction,
    actions = getDefaultActions('contract'),
    className
  } = props;

  const isExpiringSoon = endDate && isAfter(endDate, new Date()) && 
    (endDate.getTime() - new Date().getTime()) < (30 * 24 * 60 * 60 * 1000);

  return (
    <Card className={cn(
      'cursor-pointer transition-all duration-300 ease-out hover:shadow-xl hover:scale-[1.02] hover:-translate-y-1 active:scale-[0.98] group',
      priority && 'border-l-4',
      priority === 'urgent' && 'border-l-red-500',
      priority === 'high' && 'border-l-orange-500',
      priority === 'medium' && 'border-l-yellow-500',
      priority === 'low' && 'border-l-blue-500',
      className
    )} onClick={onClick}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-base line-clamp-1 group-hover:text-primary transition-colors duration-300">{title}</h3>
              {isFavorite && <Star className="h-4 w-4 text-yellow-500 fill-current group-hover:scale-110 transition-transform duration-300" />}
            </div>
            <p className="text-sm text-muted-foreground line-clamp-1">{vendor}</p>
          </div>
          
          <div className="flex items-center gap-1 ml-2">
            {status && (
              <Badge className={cn('text-xs', getStatusColor(status))}>
                {status}
              </Badge>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {actions.map((action, index) => (
                  <React.Fragment key={action.id}>
                    <DropdownMenuItem 
                      onClick={(e) => {
                        e.stopPropagation();
                        action.onClick();
                        onAction?.(action.id, props.id);
                      }}
                      className={action.variant === 'destructive' ? 'text-red-600' : ''}
                    >
                      <action.icon className="h-4 w-4 mr-2" />
                      {action.label}
                    </DropdownMenuItem>
                    {index === actions.length - 2 && <DropdownMenuSeparator />}
                  </React.Fragment>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Value and dates */}
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
              <DollarSign className="h-3 w-3" />
              <span>Value</span>
            </div>
            <p className="font-semibold text-lg">${value.toLocaleString()}</p>
          </div>
          
          <div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
              <Calendar className="h-3 w-3" />
              <span>End Date</span>
            </div>
            <p className={cn(
              'text-sm font-medium',
              isExpiringSoon && 'text-orange-600'
            )}>
              {format(endDate, 'MMM dd, yyyy')}
            </p>
          </div>
        </div>

        {/* Progress */}
        {progress !== undefined && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Additional info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {department && (
              <Badge variant="secondary" className="text-xs">
                {department}
              </Badge>
            )}
            {renewalStatus && (
              <Badge variant="outline" className="text-xs">
                {renewalStatus} renewal
              </Badge>
            )}
          </div>
          
          {assignedTo && assignedTo.length > 0 && (
            <div className="flex items-center gap-1">
              <div className="flex -space-x-1">
                {assignedTo.slice(0, 3).map(person => (
                  <Avatar key={person.id} className="h-6 w-6 border-2 border-background">
                    <AvatarImage src={person.avatar} />
                    <AvatarFallback className="text-xs">
                      {person.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {assignedTo.length > 3 && (
                  <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                    <span className="text-xs">+{assignedTo.length - 3}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {isExpiringSoon && (
          <div className="mt-3 p-2 bg-orange-50 border border-orange-200 rounded-lg flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <span className="text-xs text-orange-800">Expires in {formatDistanceToNow(endDate)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Vendor card component
const VendorCard: React.FC<VendorCardProps> = (props) => {
  const {
    name,
    category,
    location,
    contactPerson,
    email,
    phone,
    riskLevel,
    complianceScore,
    totalSpend,
    activeContracts,
    lastActivity,
    status,
    onClick,
    onAction,
    actions = getDefaultActions('vendor'),
    className
  } = props;

  return (
    <Card className={cn(
      'cursor-pointer transition-all duration-300 ease-out hover:shadow-xl hover:scale-[1.02] hover:-translate-y-1 active:scale-[0.98] group',
      className
    )} onClick={onClick}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base line-clamp-1 mb-1 group-hover:text-primary transition-colors duration-300">{name}</h3>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">{category}</Badge>
              <Badge className={cn('text-xs', getRiskLevelColor(riskLevel))}>
                {riskLevel} risk
              </Badge>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {actions.map((action, index) => (
                <React.Fragment key={action.id}>
                  <DropdownMenuItem 
                    onClick={(e) => {
                      e.stopPropagation();
                      action.onClick();
                      onAction?.(action.id, props.id);
                    }}
                  >
                    <action.icon className="h-4 w-4 mr-2" />
                    {action.label}
                  </DropdownMenuItem>
                  {index === actions.length - 2 && <DropdownMenuSeparator />}
                </React.Fragment>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Contact info */}
        {(location || contactPerson) && (
          <div className="space-y-1 mb-3">
            {location && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span>{location}</span>
              </div>
            )}
            {contactPerson && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <User className="h-3 w-3" />
                <span>{contactPerson}</span>
              </div>
            )}
          </div>
        )}

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Total Spend</div>
            <p className="font-semibold">${totalSpend.toLocaleString()}</p>
          </div>
          
          <div>
            <div className="text-xs text-muted-foreground mb-1">Compliance</div>
            <div className="flex items-center gap-2">
              <Progress value={complianceScore} className="h-2 flex-1" />
              <span className="text-sm font-medium">{complianceScore}%</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="h-3 w-3" />
            <span>{activeContracts} active contracts</span>
          </div>
          
          {lastActivity && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Activity className="h-3 w-3" />
              <span>{formatDistanceToNow(lastActivity, { addSuffix: true })}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Workflow card component
const WorkflowCard: React.FC<WorkflowCardProps> = (props) => {
  const {
    name,
    description,
    currentStep,
    progress,
    assignedTo,
    dueDate,
    startedAt,
    estimatedCompletion,
    status,
    onClick,
    onAction,
    actions = getDefaultActions('workflow'),
    className
  } = props;

  const isOverdue = dueDate && isAfter(new Date(), dueDate);

  return (
    <Card className={cn(
      'cursor-pointer transition-all duration-300 ease-out hover:shadow-xl hover:scale-[1.02] hover:-translate-y-1 active:scale-[0.98] group',
      isOverdue && 'border-red-200 bg-red-50/50',
      className
    )} onClick={onClick}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base line-clamp-1 mb-1 group-hover:text-primary transition-colors duration-300">{name}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
          </div>
          
          <div className="flex items-center gap-1 ml-2">
            {status && (
              <Badge className={cn('text-xs', getStatusColor(status))}>
                {status}
              </Badge>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {actions.map(action => (
                  <DropdownMenuItem 
                    key={action.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      action.onClick();
                      onAction?.(action.id, props.id);
                    }}
                  >
                    <action.icon className="h-4 w-4 mr-2" />
                    {action.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Current step */}
        <div className="mb-3">
          <div className="text-xs text-muted-foreground mb-1">Current Step</div>
          <p className="text-sm font-medium">{currentStep}</p>
        </div>

        {/* Progress */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {assignedTo && assignedTo.length > 0 && (
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3 text-muted-foreground" />
                <div className="flex -space-x-1">
                  {assignedTo.slice(0, 2).map(person => (
                    <Avatar key={person.id} className="h-5 w-5 border border-background">
                      <AvatarImage src={person.avatar} />
                      <AvatarFallback className="text-xs">
                        {person.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="text-xs text-muted-foreground">
            {dueDate && (
              <div className={cn(
                'flex items-center gap-1',
                isOverdue && 'text-red-600'
              )}>
                <Clock className="h-3 w-3" />
                <span>
                  {isOverdue ? 'Overdue' : `Due ${formatDistanceToNow(dueDate, { addSuffix: true })}`}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// User card component
const UserCard: React.FC<UserCardProps> = (props) => {
  const {
    name,
    email,
    role,
    department,
    avatar,
    lastActive,
    activeContracts,
    pendingApprovals,
    status,
    onClick,
    onAction,
    actions = getDefaultActions('user'),
    className
  } = props;

  return (
    <Card className={cn(
      'cursor-pointer transition-all duration-300 ease-out hover:shadow-xl hover:scale-[1.02] hover:-translate-y-1 active:scale-[0.98] group',
      className
    )} onClick={onClick}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={avatar} />
            <AvatarFallback>{name.charAt(0)}</AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base line-clamp-1 group-hover:text-primary transition-colors duration-300">{name}</h3>
            <p className="text-sm text-muted-foreground line-clamp-1">{email}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">{role}</Badge>
              <Badge variant="secondary" className="text-xs">{department}</Badge>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {actions.map(action => (
                <DropdownMenuItem 
                  key={action.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    action.onClick();
                    onAction?.(action.id, props.id);
                  }}
                >
                  <action.icon className="h-4 w-4 mr-2" />
                  {action.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Stats */}
        {(activeContracts !== undefined || pendingApprovals !== undefined) && (
          <div className="grid grid-cols-2 gap-4 mb-3">
            {activeContracts !== undefined && (
              <div>
                <div className="text-xs text-muted-foreground mb-1">Active Contracts</div>
                <p className="font-semibold text-lg">{activeContracts}</p>
              </div>
            )}
            
            {pendingApprovals !== undefined && (
              <div>
                <div className="text-xs text-muted-foreground mb-1">Pending Approvals</div>
                <p className="font-semibold text-lg">{pendingApprovals}</p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between">
          {status && (
            <Badge className={cn('text-xs', getStatusColor(status))}>
              {status}
            </Badge>
          )}
          
          {lastActive && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Activity className="h-3 w-3" />
              <span>Active {formatDistanceToNow(lastActive, { addSuffix: true })}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Document card component
const DocumentCard: React.FC<DocumentCardProps> = (props) => {
  const {
    title,
    description,
    fileType,
    size,
    uploadedBy,
    uploadedAt,
    tags,
    version,
    onClick,
    onAction,
    actions = getDefaultActions('document'),
    className
  } = props;

  return (
    <Card className={cn(
      'cursor-pointer transition-all duration-300 ease-out hover:shadow-xl hover:scale-[1.02] hover:-translate-y-1 active:scale-[0.98] group',
      className
    )} onClick={onClick}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base line-clamp-1 mb-1 group-hover:text-primary transition-colors duration-300">{title}</h3>
            {description && (
              <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
            )}
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {actions.map(action => (
                <DropdownMenuItem 
                  key={action.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    action.onClick();
                    onAction?.(action.id, props.id);
                  }}
                >
                  <action.icon className="h-4 w-4 mr-2" />
                  {action.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* File info */}
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Type</div>
            <Badge variant="outline" className="text-xs">{fileType}</Badge>
          </div>
          
          <div>
            <div className="text-xs text-muted-foreground mb-1">Size</div>
            <p className="text-sm font-medium">{size}</p>
          </div>
        </div>

        {/* Tags */}
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {tags.slice(0, 3).map(tag => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {tags.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            <span>{uploadedBy}</span>
          </div>
          
          <div className="flex items-center gap-2">
            {version && <span>v{version}</span>}
            <span>{formatDistanceToNow(uploadedAt, { addSuffix: true })}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Main mobile card component
export const MobileCard: React.FC<MobileCardProps> = (props) => {
  switch (props.type) {
    case 'contract':
      return <ContractCard {...props} />;
    case 'vendor':
      return <VendorCard {...props} />;
    case 'workflow':
      return <WorkflowCard {...props} />;
    case 'user':
      return <UserCard {...props} />;
    case 'document':
      return <DocumentCard {...props} />;
    default:
      return null;
  }
};

export default MobileCard;