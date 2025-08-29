'use client'

import dynamic from "next/dynamic";
import React from "react";

import LoadingSpinner from "@/app/_components/common/LoadingSpinner";

const AnalyticsDashboard = dynamic(
  () => import("@/app/_components/analytics/AnalyticsDashboard"),
  {
    loading: () => <LoadingSpinner />,
    ssr: false
  }
);

const Analytics = () => {
  return (
    <div className="p-6">
      <AnalyticsDashboard />
    </div>
  );
};

export default Analytics;
