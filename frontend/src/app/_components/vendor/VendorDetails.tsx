'use client'

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Mail,
  Phone,
  Globe,
  MapPin,
  Edit,
  FileText,
  AlertTriangle,
  TrendingUp,
  Calendar,
  DollarSign,
  Users,
  Activity,
  Clock,
  Star,
  ExternalLink,
} from "lucide-react";
import { VendorType } from "@/types/vendor.types";
import VendorPerformanceDashboard from './VendorPerformanceDashboard';

interface VendorDetailsProps {
  vendor: VendorType;
  onEdit?: () => void;
  onClose?: () => void;
}

export const VendorDetails: React.FC<VendorDetailsProps> = ({
  vendor,
  onEdit,
}) => {
  const [activeTab, setActiveTab] = useState("overview");

  // Mock data for demonstration - in real app, this would come from API
  const vendorContracts = [
    {
      id: "1",
      title: "Software License Agreement",
      status: "active",
      value: 50000,
      startDate: "2024-01-15",
      endDate: "2024-12-31",
      type: "software",
    },
    {
      id: "2", 
      title: "Maintenance Contract",
      status: "active",
      value: 15000,
      startDate: "2024-03-01",
      endDate: "2025-02-28",
      type: "maintenance",
    },
  ];

  const performanceMetrics = {
    deliveryScore: 85,
    qualityScore: 92,
    communicationScore: 88,
    timelinessScore: 79,
    overallScore: 86,
  };

  const recentActivity = [
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
        return "bg-green-100 text-green-800 border-green-200";
      case "inactive":
        return "bg-gray-100 text-gray-800 border-gray-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case "low":
        return "text-green-600";
      case "medium":
        return "text-yellow-600";
      case "high":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 75) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="text-lg font-semibold bg-primary/10">
              {vendor.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold">{vendor.name}</h1>
              <Badge className={getStatusColor(vendor.status || "active")}>
                {vendor.status || "Active"}
              </Badge>
            </div>
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <span>#{vendor.vendor_number}</span>
              <span>•</span>
              <span className="capitalize">{vendor.category}</span>
              <span>•</span>
              <span className={getRiskColor(vendor.risk_level || "low")}>
                {vendor.risk_level?.toUpperCase()} Risk
              </span>
            </div>
          </div>
        </div>
        <Button onClick={onEdit} variant="outline">
          <Edit className="mr-2 h-4 w-4" />
          Edit Vendor
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium">Total Spend</p>
                <p className="text-2xl font-bold">
                  ${vendor.total_spend?.toLocaleString() || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Active Contracts</p>
                <p className="text-2xl font-bold">{vendor.active_contracts || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Star className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm font-medium">Performance Score</p>
                <p className={`text-2xl font-bold ${getScoreColor(performanceMetrics.overallScore)}`}>
                  {performanceMetrics.overallScore}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium">Compliance Score</p>
                <p className={`text-2xl font-bold ${getScoreColor(vendor.compliance_score || 0)}`}>
                  {vendor.compliance_score || 0}%
                </p>
              </div>
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

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Contact Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {vendor.contactEmail && (
                  <div className="flex items-center space-x-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Email</p>
                      <p className="text-sm text-muted-foreground">{vendor.contactEmail}</p>
                    </div>
                  </div>
                )}
                {vendor.contactPhone && (
                  <div className="flex items-center space-x-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Phone</p>
                      <p className="text-sm text-muted-foreground">{vendor.contactPhone}</p>
                    </div>
                  </div>
                )}
                {vendor.website && (
                  <div className="flex items-center space-x-3">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Website</p>
                      <a 
                        href={vendor.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline flex items-center space-x-1"
                      >
                        <span>{vendor.website}</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
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
              </CardContent>
            </Card>

            {/* Risk Assessment */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5" />
                  <span>Risk Assessment</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Risk Level</span>
                  <Badge variant="outline" className={getRiskColor(vendor.risk_level || "low")}>
                    {vendor.risk_level?.toUpperCase() || "LOW"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Compliance Score</span>
                  <span className={`font-bold ${getScoreColor(vendor.compliance_score || 0)}`}>
                    {vendor.compliance_score || 0}%
                  </span>
                </div>
                <Separator />
                <div className="space-y-2">
                  <p className="text-sm font-medium">Last Review</p>
                  <p className="text-sm text-muted-foreground">
                    {vendor.updated_at ? new Date(vendor.updated_at).toLocaleDateString() : "Not reviewed"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Notes Section */}
          {vendor.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{vendor.notes}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="contracts" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Active Contracts</h3>
            <Button size="sm">
              <FileText className="mr-2 h-4 w-4" />
              View All Contracts
            </Button>
          </div>
          <div className="space-y-4">
            {vendorContracts.map((contract) => (
              <Card key={contract.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">{contract.title}</p>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span>${contract.value.toLocaleString()}</span>
                        <span>•</span>
                        <span>{contract.startDate} - {contract.endDate}</span>
                        <span>•</span>
                        <span className="capitalize">{contract.type}</span>
                      </div>
                    </div>
                    <Badge className={getStatusColor(contract.status)}>
                      {contract.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <VendorPerformanceDashboard vendor={vendor} vendorId={vendor._id} />
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>Recent Activity</span>
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