'use client'

import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import useVendorStore from "@/stores/vendor-store";
import { useDashboardStore } from "@/stores/dashboard-store";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

const InactiveVendors = () => {
  const { vendors } = useVendorStore();
  const { searchQuery, setSearchQuery } = useDashboardStore();
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [inactivityFilter, setInactivityFilter] = useState<string>("all");

  // Filter only inactive vendors based on search and filters
  const filteredVendors = useMemo(() => {
    return vendors.filter((vendor) => {
      // First filter for inactive status
      if (vendor.status !== "inactive") return false;

      const matchesSearch =
        !searchQuery ||
        vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vendor.vendor_number
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        vendor.contactEmail?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        categoryFilter === "all" || vendor.category === categoryFilter;

      // Filter by inactivity period if specified
      if (inactivityFilter !== "all") {
        const lastActiveDate = vendor.updated_at ? new Date(vendor.updated_at) : new Date();
        const monthsDiff =
          (new Date().getTime() - lastActiveDate.getTime()) /
          (1000 * 60 * 60 * 24 * 30);

        switch (inactivityFilter) {
          case "3months":
            if (monthsDiff > 3) return false;
            break;
          case "6months":
            if (monthsDiff > 6) return false;
            break;
          case "1year":
            if (monthsDiff > 12) return false;
            break;
        }
      }

      return matchesSearch && matchesCategory;
    });
  }, [vendors, searchQuery, categoryFilter, inactivityFilter]);

  // Calculate inactive vendor statistics
  const stats = useMemo(() => {
    const totalHistoricalSpend = filteredVendors.reduce(
      (sum, vendor) => sum + (vendor.total_spend || 0),
      0
    );

    const lastActiveVendors = filteredVendors.reduce(
      (counts, vendor) => {
        const monthsDiff =
          (new Date().getTime() - (vendor.updated_at ? new Date(vendor.updated_at).getTime() : new Date().getTime())) /
          (1000 * 60 * 60 * 24 * 30);
        if (monthsDiff <= 3) counts.threeMonths++;
        if (monthsDiff <= 6) counts.sixMonths++;
        return counts;
      },
      { threeMonths: 0, sixMonths: 0 }
    );

    return {
      total: filteredVendors.length,
      historicalSpend: totalHistoricalSpend,
      recentlyInactive: lastActiveVendors.threeMonths,
      pendingReview: filteredVendors.filter((v) => !v.metadata?.reviewed)
        .length,
    };
  }, [filteredVendors]);

  return (
    <div className="space-y-6 p-6">
      {/* Header with Stats */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Inactive Vendors</h2>
        <Button variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Review Inactive Vendors
        </Button>
      </div>

      {/* Inactive Vendor Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Inactive Vendors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Historical Spend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats.historicalSpend.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Recently Inactive
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recentlyInactive}</div>
            <p className="text-xs text-muted-foreground">Last 3 months</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Pending Review
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingReview}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search inactive vendors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="technology">Technology</SelectItem>
            <SelectItem value="services">Services</SelectItem>
            <SelectItem value="manufacturing">Manufacturing</SelectItem>
            <SelectItem value="consulting">Consulting</SelectItem>
            <SelectItem value="supplies">Supplies</SelectItem>
          </SelectContent>
        </Select>
        <Select value={inactivityFilter} onValueChange={setInactivityFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Inactive period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="3months">Last 3 Months</SelectItem>
            <SelectItem value="6months">Last 6 Months</SelectItem>
            <SelectItem value="1year">Last Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Inactive Vendors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVendors.map((vendor) => (
          <Card
            key={vendor._id}
            className="hover:shadow-lg transition-shadow cursor-pointer"
          >
            <CardHeader>
              <CardTitle className="text-lg font-medium">
                {vendor.name}
              </CardTitle>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  #{vendor.vendor_number}
                </span>
                <span className="text-sm px-2 py-1 rounded-full bg-gray-100 text-gray-800">
                  Inactive
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Category:
                  </span>
                  <span className="font-medium">{vendor.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Last Active:
                  </span>
                  <span className="font-medium">
                    {vendor.updated_at ? new Date(vendor.updated_at).toLocaleDateString() : 'Unknown'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Historical Spend:
                  </span>
                  <span className="font-medium">
                    ${vendor.total_spend?.toLocaleString() || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Review Status:
                  </span>
                  <span
                    className={`font-medium flex items-center ${
                      vendor.metadata?.reviewed
                        ? "text-green-600"
                        : "text-yellow-600"
                    }`}
                  >
                    {vendor.metadata?.reviewed ? "Reviewed" : "Pending Review"}
                    {!vendor.metadata?.reviewed && (
                      <AlertCircle className="ml-1 h-4 w-4" />
                    )}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {filteredVendors.length === 0 && (
          <div className="col-span-full text-center py-10 text-muted-foreground">
            No inactive vendors found
          </div>
        )}
      </div>
    </div>
  );
};

export default InactiveVendors;
