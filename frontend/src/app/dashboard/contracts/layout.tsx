'use client'

import React from "react";

interface ContractDashboardLayoutProps {
  children: React.ReactNode;
}

const ContractDashboardLayout: React.FC<ContractDashboardLayoutProps> = ({
  children
}) => {
  return (
    <main className="flex-1 overflow-hidden">
      <div className="h-full flex flex-col">
        {/* Dynamic Content Area - This is where the children will be rendered */}
        <div className="flex-1 overflow-auto" style={{ backgroundColor: '#f7f5f0' }}>
          {children}
        </div>
      </div>
    </main>
  );
};

export default ContractDashboardLayout;