'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import type { DateRange } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Shield,
  Search,
  Download,
  Filter,
  Calendar as CalendarIcon,
  User,
  FileText,
  Settings,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function AuditSettingsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState('all');
  const [selectedAction, setSelectedAction] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  
  // Audit log entries
  const auditLogs = [
    {
      id: 1,
      timestamp: new Date('2024-01-15T10:30:00'),
      user: 'John Doe',
      userId: 'user_123',
      action: 'contract.created',
      resource: 'Software License Agreement',
      resourceId: 'contract_456',
      details: 'Created new contract with TechCorp',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      result: 'success',
      riskLevel: 'low'
    },
    {
      id: 2,
      timestamp: new Date('2024-01-15T10:25:00'),
      user: 'Jane Smith',
      userId: 'user_789',
      action: 'user.login',
      resource: 'Authentication System',
      resourceId: 'auth_001',
      details: 'User logged in successfully',
      ipAddress: '10.0.0.50',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      result: 'success',
      riskLevel: 'low'
    },
    {
      id: 3,
      timestamp: new Date('2024-01-15T10:20:00'),
      user: 'Admin User',
      userId: 'user_admin',
      action: 'settings.updated',
      resource: 'Security Settings',
      resourceId: 'settings_security',
      details: 'Updated two-factor authentication settings',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      result: 'success',
      riskLevel: 'medium'
    },
    {
      id: 4,
      timestamp: new Date('2024-01-15T10:15:00'),
      user: 'Unknown User',
      userId: 'unknown',
      action: 'user.login',
      resource: 'Authentication System',
      resourceId: 'auth_001',
      details: 'Failed login attempt with invalid credentials',
      ipAddress: '203.0.113.195',
      userAgent: 'curl/7.68.0',
      result: 'failure',
      riskLevel: 'high'
    },
    {
      id: 5,
      timestamp: new Date('2024-01-15T10:10:00'),
      user: 'John Doe',
      userId: 'user_123',
      action: 'contract.updated',
      resource: 'Vendor Agreement',
      resourceId: 'contract_789',
      details: 'Updated contract terms and conditions',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      result: 'success',
      riskLevel: 'low'
    }
  ];

  // Security events for the security tab
  const securityEvents = [
    {
      id: 1,
      timestamp: new Date('2024-01-15T10:15:00'),
      type: 'failed_login',
      severity: 'high',
      user: 'Unknown User',
      description: 'Multiple failed login attempts from suspicious IP',
      ipAddress: '203.0.113.195',
      location: 'Unknown',
      resolved: false
    },
    {
      id: 2,
      timestamp: new Date('2024-01-14T15:30:00'),
      type: 'permission_escalation',
      severity: 'medium',
      user: 'Jane Smith',
      description: 'User requested admin permissions',
      ipAddress: '10.0.0.50',
      location: 'New York, NY',
      resolved: true
    },
    {
      id: 3,
      timestamp: new Date('2024-01-14T09:20:00'),
      type: 'api_abuse',
      severity: 'medium',
      user: 'API User',
      description: 'API rate limit exceeded',
      ipAddress: '198.51.100.42',
      location: 'San Francisco, CA',
      resolved: true
    }
  ];

  const handleSearch = () => {
    toast.success('Search filters applied');
  };

  const handleExportLogs = () => {
    toast.success('Audit logs export started');
  };

  const handleViewDetails = (logId: number) => {
    toast.success(`Viewing details for audit log ${logId}`);
  };

  const getResultBadge = (result: string) => {
    switch (result) {
      case 'success':
        return <Badge variant="default" className="bg-green-100 text-green-800">Success</Badge>;
      case 'failure':
        return <Badge variant="destructive">Failure</Badge>;
      case 'warning':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Warning</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getRiskBadge = (level: string) => {
    switch (level) {
      case 'low':
        return <Badge variant="outline" className="border-green-200 text-green-700">Low</Badge>;
      case 'medium':
        return <Badge variant="outline" className="border-yellow-200 text-yellow-700">Medium</Badge>;
      case 'high':
        return <Badge variant="outline" className="border-red-200 text-red-700">High</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'low':
        return <Badge variant="outline" className="border-blue-200 text-blue-700">Low</Badge>;
      case 'medium':
        return <Badge variant="outline" className="border-yellow-200 text-yellow-700">Medium</Badge>;
      case 'high':
        return <Badge variant="destructive">High</Badge>;
      case 'critical':
        return <Badge variant="destructive" className="bg-red-600">Critical</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getActionIcon = (action: string) => {
    if (action.includes('login')) return <User className="h-4 w-4" />;
    if (action.includes('contract')) return <FileText className="h-4 w-4" />;
    if (action.includes('settings')) return <Settings className="h-4 w-4" />;
    return <Activity className="h-4 w-4" />;
  };

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = searchTerm === '' || 
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesUser = selectedUser === 'all' || log.userId === selectedUser;
    const matchesAction = selectedAction === 'all' || log.action.includes(selectedAction);
    
    return matchesSearch && matchesUser && matchesAction;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Audit & Compliance</h1>
        <p className="text-muted-foreground">
          Monitor user activities, security events, and maintain compliance records.
        </p>
      </div>

      <Tabs defaultValue="audit" className="space-y-6">
        <TabsList>
          <TabsTrigger value="audit">Audit Logs</TabsTrigger>
          <TabsTrigger value="security">Security Events</TabsTrigger>
          <TabsTrigger value="compliance">Compliance Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="audit" className="space-y-6">
          {/* Audit Logs Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filter Audit Logs
              </CardTitle>
              <CardDescription>
                Search and filter audit logs by various criteria.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="search">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Search logs..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="user-filter">User</Label>
                  <Select value={selectedUser} onValueChange={setSelectedUser}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select user" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="user_123">John Doe</SelectItem>
                      <SelectItem value="user_789">Jane Smith</SelectItem>
                      <SelectItem value="user_admin">Admin User</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="action-filter">Action Type</Label>
                  <Select value={selectedAction} onValueChange={setSelectedAction}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Actions</SelectItem>
                      <SelectItem value="login">Login Events</SelectItem>
                      <SelectItem value="contract">Contract Actions</SelectItem>
                      <SelectItem value="settings">Settings Changes</SelectItem>
                      <SelectItem value="user">User Management</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Date Range</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange?.from ? (
                          dateRange?.to ? (
                            `${format(dateRange.from, 'LLL dd')} - ${format(dateRange.to, 'LLL dd')}`
                          ) : (
                            format(dateRange.from, 'LLL dd, y')
                          )
                        ) : (
                          'Pick a date range'
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="range"
                        selected={dateRange}
                        onSelect={(range) => setDateRange(range)}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSearch}>
                  <Search className="h-4 w-4 mr-2" />
                  Apply Filters
                </Button>
                <Button variant="outline" onClick={handleExportLogs}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Logs
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Audit Logs Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Audit Logs
              </CardTitle>
              <CardDescription>
                Detailed log of all user activities and system events.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>Risk Level</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">
                        {log.timestamp.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{log.user}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getActionIcon(log.action)}
                          <code className="text-sm bg-muted px-1 rounded">{log.action}</code>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{log.resource}</div>
                          <div className="text-sm text-muted-foreground">{log.details}</div>
                        </div>
                      </TableCell>
                      <TableCell>{getResultBadge(log.result)}</TableCell>
                      <TableCell>{getRiskBadge(log.riskLevel)}</TableCell>
                      <TableCell className="font-mono text-sm">{log.ipAddress}</TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleViewDetails(log.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {filteredLogs.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No audit logs found matching your criteria.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          {/* Security Events */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Security Events
              </CardTitle>
              <CardDescription>
                Monitor security-related events and potential threats.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {securityEvents.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="text-sm">
                        {event.timestamp.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <code className="text-sm bg-muted px-1 rounded">{event.type}</code>
                      </TableCell>
                      <TableCell>{getSeverityBadge(event.severity)}</TableCell>
                      <TableCell className="font-medium">{event.user}</TableCell>
                      <TableCell>{event.description}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-mono text-sm">{event.ipAddress}</div>
                          <div className="text-sm text-muted-foreground">{event.location}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {event.resolved ? (
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Resolved
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <XCircle className="h-3 w-3 mr-1" />
                            Open
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-6">
          {/* Compliance Reports */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">SOC 2 Compliance</CardTitle>
                <CardDescription>
                  System and Organization Controls
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Status</span>
                  <Badge variant="default" className="bg-green-100 text-green-800">Compliant</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Last Audit</span>
                  <span className="text-sm text-muted-foreground">Dec 2023</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Next Review</span>
                  <span className="text-sm text-muted-foreground">Dec 2024</span>
                </div>
                <Button variant="outline" className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Download Report
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">GDPR Compliance</CardTitle>
                <CardDescription>
                  General Data Protection Regulation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Status</span>
                  <Badge variant="default" className="bg-green-100 text-green-800">Compliant</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Data Requests</span>
                  <span className="text-sm text-muted-foreground">0 pending</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Retention Policy</span>
                  <span className="text-sm text-muted-foreground">Active</span>
                </div>
                <Button variant="outline" className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Download Report
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">ISO 27001</CardTitle>
                <CardDescription>
                  Information Security Management
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Status</span>
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">In Progress</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Certification</span>
                  <span className="text-sm text-muted-foreground">Q2 2024</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Implementation</span>
                  <span className="text-sm text-muted-foreground">75%</span>
                </div>
                <Button variant="outline" className="w-full">
                  <Clock className="h-4 w-4 mr-2" />
                  View Progress
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Compliance Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Compliance Actions</CardTitle>
              <CardDescription>
                Generate compliance reports and manage regulatory requirements.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button variant="outline" className="justify-start">
                  <Download className="h-4 w-4 mr-2" />
                  Generate Full Audit Report
                </Button>
                <Button variant="outline" className="justify-start">
                  <Download className="h-4 w-4 mr-2" />
                  Export User Data
                </Button>
                <Button variant="outline" className="justify-start">
                  <Download className="h-4 w-4 mr-2" />
                  Access Control Report
                </Button>
                <Button variant="outline" className="justify-start">
                  <Download className="h-4 w-4 mr-2" />
                  Data Processing Activities
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}