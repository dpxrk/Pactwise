'use client'

import React, { useEffect } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useDashboardStore } from "@/stores/dashboard-store";
import { useRouter, usePathname } from 'next/navigation';

interface ContractDashboardLayoutProps {
  children: React.ReactNode;
}

const contractTypes = [
  { label: "All Contracts", route: "/contracts" },
  { label: "Active", route: "/contracts/active" },
  { label: "Pending Signature", route: "/contracts/pending" },
  { label: "Drafts", route: "/contracts/drafts" },
  { label: "Expired", route: "/contracts/expired" },
  { label: "Archived", route: "/contracts/archived" },
];

const ContractDashboardLayout: React.FC<ContractDashboardLayoutProps> = ({ 
  children 
}) => {
  const { selectedType, searchQuery, setSelectedType, setSearchQuery } = useDashboardStore();
  const router = useRouter();
  const pathname = usePathname();

  // Update selected tab based on current path
  useEffect(() => {
    const pathToType: { [key: string]: string } = {
      "/contracts": "All Contracts",
      "/contracts/active": "Active",
      "/contracts/pending": "Pending Signature",
      "/contracts/drafts": "Drafts",
      "/contracts/expired": "Expired",
      "/contracts/archived": "Archived",
    };

    const newType = pathToType[pathname] || "All Contracts";
    if (newType !== selectedType) {
      setSelectedType(newType);
    }
  }, [pathname, selectedType, setSelectedType]);

  const handleTabChange = (type: string) => {
    const route = contractTypes.find(t => t.label === type)?.route || "/contracts";
    router.push(route);
  };

  return (
    <main className="flex-1 overflow-hidden">
      <div className="h-full flex flex-col">
        <div className="p-4 border-b bg-white dark:bg-card">
          {/* Header and Search */}
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
            <h1 className="text-2xl font-bold text-primary">Contracts</h1>
            <div className="flex items-center space-x-4">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search contracts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </div>

          {/* Status Tabs */}
          <div className="mt-4">
            <Tabs value={selectedType} className="w-full">
              <TabsList className="flex overflow-x-auto">
                {contractTypes.map((type) => (
                  <TabsTrigger
                    key={type.label}
                    value={type.label}
                    onClick={() => handleTabChange(type.label)}
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    {type.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Dynamic Content Area - This is where the children will be rendered */}
        <div className="flex-1 p-4 overflow-auto bg-white dark:bg-card shadow-inner">
          {children}
        </div>
      </div>
    </main>
  );
};

export default ContractDashboardLayout;

    // Calculate contract statistics
    // const stats = useMemo(() => {
    //   return {
    //     total: contracts.length,
    //     active: contracts.filter((c) => c.status === "active").length,
    //     pendingSignature: contracts.filter(
    //       (c) => c.status === "pending_signature"
    //     ).length,
    //     expiringSoon: contracts.filter((c) => {
    //       const expiryDate = new Date(c.expires_at);
    //       const thirtyDaysFromNow = new Date();
    //       thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    //       return expiryDate <= thirtyDaysFromNow && c.status === "active";
    //     }).length,
    //   };
    // }, [contracts]);