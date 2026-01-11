'use client'

import React, { useState } from "react";
import {
  Star,
  Edit,
  DollarSign,
  FileText,
  TrendingUp,
  Users,
  Mail,
  Phone,
  MapPin,
  AlertTriangle,
  Activity,
  Calendar,
  Building2
} from "lucide-react";

import { AgentQuickActions } from "@/components/ai/AgentQuickActions";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tables } from "@/types/database.types";

import VendorPerformanceDashboard from './VendorPerformanceDashboard';

// Use properly typed vendor with relations
type VendorDetail = Tables<'vendors'> & {
  contracts?: Tables<'contracts'>[]
  vendor_performance_scores?: any[]
  vendor_documents?: any[]
  risk_level?: string | null
  vendor_number?: string | null
  total_spend?: number | null
  notes?: string | null
}

interface VendorDetailsProps {
  vendor: VendorDetail | null;
  onEdit?: () => void;
  onClose?: () => void;
}

export const VendorDetails: React.FC<VendorDetailsProps> = ({
  vendor,
  onEdit,
}) => {
  const [activeTab, setActiveTab] = useState("overview");
  const [isEditing, setIsEditing] = useState(false);

  // Early return if no vendor
  if (!vendor) {
    return <div>No vendor data available</div>;
  }

  // Use real contract data from vendor relations
  const vendorContracts = vendor.contracts || [];

  // Extract metadata for rich display
  const metadata = vendor.metadata as Record<string, any> || {};
  const spendTrend = metadata.spend_trend as number[] || [];
  const riskLevel = metadata.risk_level as string || vendor.risk_level || 'low';
  const recentActivities = metadata.recent_activities as Array<{ type: string; description: string; date: string }> || [];
  const certifications = metadata.certifications as string[] || [];
  const lastAuditDate = metadata.last_audit_date as string || null;
  const nextRenewalDate = metadata.next_renewal_date as string || null;
  const paymentTerms = metadata.payment_terms as string || 'Net 30';
  const primaryContactTitle = metadata.primary_contact_title as string || null;
  const industry = metadata.industry as string || vendor.category;
  const employeeCount = metadata.employee_count as number || null;
  const foundedYear = metadata.founded_year as number || null;

  const performanceMetrics = {
    deliveryScore: 85,
    qualityScore: 92,
    communicationScore: 88,
    timelinessScore: 79,
    overallScore: vendor.performance_score ? Math.round((vendor.performance_score as number) * 100) : 86,
  };

  const recentActivity = recentActivities.length > 0 ? recentActivities : [
    {
      date: "2024-06-01",
      type: "contract_renewal",
      description: "Renewed maintenance contract",
    },
    {
      date: "2024-05-15",
      type: "payment",
      description: "Payment processed: $12,500",
    },
    {
      date: "2024-04-20",
      type: "meeting",
      description: "Quarterly business review completed",
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 border border-green-200";
      case "inactive":
        return "bg-ghost-200 text-ghost-700 border border-ghost-300";
      case "pending":
        return "bg-purple-100 text-purple-800 border border-purple-200";
      default:
        return "bg-ghost-200 text-ghost-700 border border-ghost-300";
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case "low":
        return "text-green-600";
      case "medium":
        return "text-purple-600";
      case "high":
        return "text-red-600";
      default:
        return "#80808c";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 75) return "text-purple-600";
    return "text-red-600";
  };

  return (
    <div className="space-y-4">
      {/* Header Section */}
      <div className="flex items-start justify-between pb-4 border-b" style={{ borderColor: '#d2d1de' }}>
        <div className="flex items-start space-x-4">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="text-sm font-semibold" style={{ backgroundColor: 'rgba(41, 21, 40, 0.1)', color: '#291528' }}>
              {vendor.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <h1 className="text-xl font-semibold" style={{ color: '#291528' }}>{vendor.name}</h1>
              <Badge className={`${getStatusColor(vendor.status || "active")} text-xs font-medium uppercase tracking-wide`}>
                {vendor.status || "Active"}
              </Badge>
            </div>
            <div className="flex items-center space-x-3 text-xs font-mono" style={{ color: '#80808c' }}>
              {vendor.vendor_number && <span>#{vendor.vendor_number}</span>}
              {vendor.vendor_number && <span>•</span>}
              <span className="capitalize">{industry}</span>
              <span>•</span>
              <span className={getRiskColor(riskLevel)}>
                {riskLevel?.toUpperCase()} RISK
              </span>
              {employeeCount && (
                <>
                  <span>•</span>
                  <span>{employeeCount.toLocaleString()} EMP</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <AgentQuickActions
            entityType="vendor"
            entityId={vendor.id}
            compact={true}
          />
          <Button onClick={onEdit} variant="outline" size="sm" className="rounded-none border text-xs" style={{ borderColor: '#291528', color: '#291528' }}>
            <Edit className="mr-2 h-3.5 w-3.5" />
            Edit
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card className="border bg-white" style={{ borderColor: '#d2d1de' }}>
          <CardContent className="p-3">
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider flex items-center" style={{ color: '#9e829c', letterSpacing: '0.1em' }}>
                <DollarSign className="h-3 w-3 mr-1" />
                Total Spend
              </p>
              <p className="text-lg font-mono font-bold" style={{ color: '#291528' }}>
                ${vendor.total_spend?.toLocaleString() || 0}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border bg-white" style={{ borderColor: '#d2d1de' }}>
          <CardContent className="p-3">
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider flex items-center" style={{ color: '#9e829c', letterSpacing: '0.1em' }}>
                <FileText className="h-3 w-3 mr-1" />
                Contracts
              </p>
              <p className="text-lg font-mono font-bold" style={{ color: '#291528' }}>
                {vendor.active_contracts || 0}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border bg-white" style={{ borderColor: '#d2d1de' }}>
          <CardContent className="p-3">
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider flex items-center" style={{ color: '#9e829c', letterSpacing: '0.1em' }}>
                <Star className="h-3 w-3 mr-1" />
                Performance
              </p>
              <p className={`text-lg font-mono font-bold ${getScoreColor(performanceMetrics.overallScore)}`}>
                {performanceMetrics.overallScore}%
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border bg-white" style={{ borderColor: '#d2d1de' }}>
          <CardContent className="p-3">
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider flex items-center" style={{ color: '#9e829c', letterSpacing: '0.1em' }}>
                <TrendingUp className="h-3 w-3 mr-1" />
                Compliance
              </p>
              <p className={`text-lg font-mono font-bold ${getScoreColor(vendor.compliance_score ? Math.round((vendor.compliance_score as number) * 100) : 0)}`}>
                {vendor.compliance_score ? Math.round((vendor.compliance_score as number) * 100) : 0}%
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="contracts">Contracts</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Contact Information */}
            <Card className="border bg-white" style={{ borderColor: '#d2d1de' }}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider flex items-center" style={{ color: '#9e829c', letterSpacing: '0.1em' }}>
                  <Users className="h-4 w-4 mr-2" />
                  Contact Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {vendor.primary_contact_name && (
                  <div className="flex items-center space-x-3">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Primary Contact</p>
                      <p className="text-sm text-muted-foreground">
                        {vendor.primary_contact_name}
                        {primaryContactTitle && ` - ${primaryContactTitle}`}
                      </p>
                    </div>
                  </div>
                )}
                {vendor.primary_contact_email && (
                  <div className="flex items-center space-x-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Email</p>
                      <p className="text-sm text-muted-foreground">{vendor.primary_contact_email}</p>
                    </div>
                  </div>
                )}
                {vendor.primary_contact_phone && (
                  <div className="flex items-center space-x-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Phone</p>
                      <p className="text-sm text-muted-foreground">{vendor.primary_contact_phone}</p>
                    </div>
                  </div>
                )}
                {vendor.address && (
                  <div className="flex items-center space-x-3">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Address</p>
                      <p className="text-sm text-muted-foreground">{vendor.address}</p>
                    </div>
                  </div>
                )}
                {foundedYear && (
                  <div className="flex items-center space-x-3">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Founded</p>
                      <p className="text-sm text-muted-foreground">{foundedYear}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Risk Assessment & Compliance */}
            <Card className="border bg-white" style={{ borderColor: '#d2d1de' }}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider flex items-center" style={{ color: '#9e829c', letterSpacing: '0.1em' }}>
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Risk & Compliance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Risk Level</span>
                  <Badge variant="outline" className={getRiskColor(riskLevel)}>
                    {riskLevel?.toUpperCase()}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Compliance Score</span>
                  <span className={`font-bold ${getScoreColor(vendor.compliance_score ? Math.round((vendor.compliance_score as number) * 100) : 0)}`}>
                    {vendor.compliance_score ? Math.round((vendor.compliance_score as number) * 100) : 0}%
                  </span>
                </div>
                <Separator />
                {lastAuditDate && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Last Audit</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(lastAuditDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {nextRenewalDate && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Next Renewal</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(nextRenewalDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {paymentTerms && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Payment Terms</p>
                    <p className="text-sm text-muted-foreground">{paymentTerms}</p>
                  </div>
                )}
                {certifications.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Certifications</p>
                      <div className="flex flex-wrap gap-2">
                        {certifications.map((cert, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {cert}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Notes Section */}
          {vendor.notes && (
            <Card className="border bg-white" style={{ borderColor: '#d2d1de' }}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider" style={{ color: '#9e829c', letterSpacing: '0.1em' }}>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm" style={{ color: '#3a3e3b' }}>{vendor.notes}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="contracts" className="space-y-4 mt-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: '#9e829c', letterSpacing: '0.1em' }}>Active Contracts</h3>
            <Button size="sm" variant="outline" className="rounded-none border text-xs" style={{ borderColor: '#291528', color: '#291528' }}>
              <FileText className="mr-2 h-3.5 w-3.5" />
              View All
            </Button>
          </div>
          <div className="space-y-3">
            {vendorContracts.length > 0 ? (
              vendorContracts.map((contract) => (
                <Card key={contract.id} className="border bg-white" style={{ borderColor: '#d2d1de' }}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="font-medium text-sm" style={{ color: '#291528' }}>{contract.title}</p>
                        <div className="flex items-center space-x-2 text-xs font-mono" style={{ color: '#80808c' }}>
                          {contract.value && <span>${contract.value.toLocaleString()}</span>}
                          {contract.value && <span>•</span>}
                          {contract.start_date && contract.end_date && (
                            <>
                              <span>{new Date(contract.start_date).toLocaleDateString()} - {new Date(contract.end_date).toLocaleDateString()}</span>
                              <span>•</span>
                            </>
                          )}
                          {contract.contract_type && <span className="uppercase">{contract.contract_type}</span>}
                        </div>
                      </div>
                      <Badge className={`${getStatusColor(contract.status || 'unknown')} text-xs font-medium uppercase tracking-wide`}>
                        {contract.status || 'Unknown'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-8 text-sm" style={{ color: '#80808c' }}>
                No contracts found for this vendor
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4 mt-4">
          <VendorPerformanceDashboard vendor={vendor as any} vendorId={vendor.id} />
        </TabsContent>

        <TabsContent value="activity" className="space-y-4 mt-4">
          <Card className="border bg-white" style={{ borderColor: '#d2d1de' }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider flex items-center" style={{ color: '#9e829c', letterSpacing: '0.1em' }}>
                <Activity className="h-4 w-4 mr-2" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium">{activity.description}</p>
                      <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(activity.date).toLocaleDateString()}</span>
                        <span>•</span>
                        <span className="capitalize">{activity.type.replace('_', ' ')}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default VendorDetails;