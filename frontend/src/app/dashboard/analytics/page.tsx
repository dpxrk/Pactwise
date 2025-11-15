'use client'

import dynamic from "next/dynamic";
import React from "react";

import LoadingSpinner from "@/app/_components/common/LoadingSpinner";
import { useAuth } from "@/contexts/AuthContext";

const AnalyticsDashboard = dynamic(
  () => import("@/app/_components/analytics/AnalyticsDashboard"),
  {
    loading: () => <LoadingSpinner />,
    ssr: false
  }
);

const Analytics = () => {
  const { userProfile } = useAuth();

  if (!userProfile?.enterprise_id) {
    return (
      <div className="p-6">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="p-6">
      <AnalyticsDashboard enterpriseId={userProfile.enterprise_id} />
    </div>
  );
};

export default Analytics;
