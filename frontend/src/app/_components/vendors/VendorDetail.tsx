"use client";

import { useRouter } from 'next/navigation';
import React, { useState, useMemo } from 'react';
import { toast } from 'sonner';
import {
  Activity,
  AlertCircle,
  Building,
  Edit,
  Globe,
  Mail,
  MapPin,
  Phone,
  Shield,
  TrendingDown,
  TrendingUp,
  Users
} from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { format } from '@/lib/date';
import { useVendor, useUpdateVendor } from '@/hooks/queries/useVendors';
import type { Id } from '@/types/id.types';


interface VendorDetailProps {
  vendorId: Id<"vendors">;
  enterpriseId: Id<"enterprises">;
}

export function VendorDetail({ vendorId, enterpriseId }: VendorDetailProps) {
  const router = useRouter();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    website: '',
    address: '',
    notes: '',
  });

  // Fetch vendor details with contracts
  const { data: vendor, isLoading, error } = useVendor(vendorId);
  const updateVendorMutation = useUpdateVendor();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load vendor: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  if (!vendor) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Vendor not found or you don't have permission to view it.
        </AlertDescription>
      </Alert>
    );
  }

  // Calculate metrics from contracts
  const vendorMetrics = useMemo(() => {
    const contracts = vendor.contracts || [];
    const contractsByStatus: Record<string, number> = {};
    const contractsByType: Record<string, number> = {};
    let totalValue = 0;

    contracts.forEach((contract: any) => {
      const status = contract.status || 'unknown';
      const type = contract.contract_type || 'other';
      contractsByStatus[status] = (contractsByStatus[status] || 0) + 1;
      contractsByType[type] = (contractsByType[type] || 0) + 1;
      totalValue += contract.value || 0;
    });

    return {
      totalContracts: contracts.length,
      activeContracts: contracts.filter((c: any) => c.status === 'active').length,
      totalValue,
      averageContractValue: contracts.length > 0 ? totalValue / contracts.length : 0,
      contractsByStatus,
      contractsByType,
    };
  }, [vendor.contracts]);

  const handleEditClick = () => {
    setEditFormData({
      contactName: vendor.primary_contact_name || '',
      contactEmail: vendor.primary_contact_email || '',
      contactPhone: vendor.primary_contact_phone || '',
      website: vendor.website || '',
      address: vendor.address || '',
      notes: vendor.notes || '',
    });
    setIsEditDialogOpen(true);
  };

  const handleEditSubmit = async () => {
    try {
      await updateVendorMutation.mutateAsync({
        id: vendorId,
        updates: {
          primary_contact_name: editFormData.contactName || undefined,
          primary_contact_email: editFormData.contactEmail || undefined,
          primary_contact_phone: editFormData.contactPhone || undefined,
          website: editFormData.website || undefined,
          address: editFormData.address || undefined,
          notes: editFormData.notes || undefined,
        },
      });
      setIsEditDialogOpen(false);
    } catch (error) {
      // Error toast is handled by the mutation hook
    }
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getComplianceColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Building className="h-6 w-6" />
                {vendor.name}
              </CardTitle>
              <CardDescription className="mt-2 flex items-center gap-4">
                {vendor.category && (
                  <Badge variant="secondary">{vendor.category}</Badge>
                )}
                <Badge variant={vendor.status === 'active' ? 'default' : 'secondary'}>
                  {vendor.status || 'active'}
                </Badge>
              </CardDescription>
            </div>
            <Button onClick={handleEditClick}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {vendor.primary_contact_email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{vendor.primary_contact_email}</span>
              </div>
            )}
            {vendor.primary_contact_phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{vendor.primary_contact_phone}</span>
              </div>
            )}
            {vendor.website && (
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <a href={vendor.website} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                  Website
                </a>
              </div>
            )}
            {vendor.address && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{vendor.address}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Performance Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getPerformanceColor(vendor.performance_score || 0)}`}>
              {vendor.performance_score || 0}%
            </div>
            <Progress value={vendor.performance_score || 0} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Compliance Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getComplianceColor(vendor.compliance_score || 100)}`}>
              {vendor.compliance_score || 100}%
            </div>
            <Progress value={vendor.compliance_score || 100} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Contracts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vendorMetrics.totalContracts}</div>
            <div className="text-sm text-muted-foreground">
              {vendorMetrics.activeContracts} active
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${vendorMetrics.totalValue.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">
              Avg: ${vendorMetrics.averageContractValue.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="contracts" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="contracts">Contracts</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="contracts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Associated Contracts</CardTitle>
              <CardDescription>
                All contracts associated with this vendor
              </CardDescription>
            </CardHeader>
            <CardContent>
              {vendor.contracts && vendor.contracts.length > 0 ? (
                <div className="space-y-4">
                  {vendor.contracts.map((contract: any) => (
                    <div
                      key={contract.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                      onClick={() => router.push(`/dashboard/contracts/${contract.id}`)}
                    >
                      <div>
                        <div className="font-medium">{contract.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {contract.contract_type || 'General'} • {contract.status || 'Draft'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          {contract.value ? `$${contract.value.toLocaleString()}` : 'N/A'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {contract.end_date ? `Ends ${format(new Date(contract.end_date), 'MMM dd, yyyy')}` : 'No end date'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No contracts found for this vendor
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contract Distribution */}
          {vendorMetrics.totalContracts > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Contracts by Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(vendorMetrics.contractsByStatus).map(([status, count]) => (
                      <div key={status} className="flex justify-between items-center">
                        <span className="text-sm capitalize">{status}</span>
                        <Badge variant="secondary">{count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Contracts by Type</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(vendorMetrics.contractsByType).map(([type, count]) => (
                      <div key={type} className="flex justify-between items-center">
                        <span className="text-sm capitalize">{type.replace('_', ' ')}</span>
                        <Badge variant="secondary">{count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>
                Vendor performance analysis and trends
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <span>On-time Delivery Rate</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">95%</span>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span>Quality Score</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">88%</span>
                  <TrendingDown className="h-4 w-4 text-yellow-600" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>Responsiveness</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">92%</span>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Documents</CardTitle>
              <CardDescription>
                Required compliance documentation and certifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Compliance document tracking coming soon
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Timeline of vendor interactions and changes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Activity timeline coming soon
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Vendor Details</DialogTitle>
            <DialogDescription>
              Update vendor contact information and details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="contactName">Contact Name</Label>
              <Input
                id="contactName"
                value={editFormData.contactName}
                onChange={(e) => setEditFormData({ ...editFormData, contactName: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="contactEmail">Contact Email</Label>
              <Input
                id="contactEmail"
                type="email"
                value={editFormData.contactEmail}
                onChange={(e) => setEditFormData({ ...editFormData, contactEmail: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="contactPhone">Contact Phone</Label>
              <Input
                id="contactPhone"
                value={editFormData.contactPhone}
                onChange={(e) => setEditFormData({ ...editFormData, contactPhone: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={editFormData.website}
                onChange={(e) => setEditFormData({ ...editFormData, website: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={editFormData.address}
                onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={editFormData.notes}
                onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditSubmit}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
