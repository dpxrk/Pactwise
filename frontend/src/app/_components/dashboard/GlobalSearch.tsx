import { Search } from "lucide-react";
import React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface GlobalSearchProps {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({
  isOpen,
  onOpen,
  onClose,
}) => {
  const quickFilters = [
    "Contracts",
    "Vendors",
    "Templates",
    "Recent",
    "Pending Signature",
  ];

  return (
    <>
      {/* Search Trigger */}
      <div className="flex-1 max-w-2xl mx-4">
        <Button
          variant="outline"
          className="w-full justify-start text-muted-foreground rounded-none"
          onClick={onOpen}
        >
          <Search className="mr-2 h-4 w-4" />
          Search contracts, vendors, documents...
        </Button>
      </div>

      {/* Search Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
          onClick={onClose}
        >
          <div
            className="fixed left-[50%] top-[20%] translate-x-[-50%] w-full max-w-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Card className="bg-background border border-border shadow-lg rounded-none">
              <CardContent className="p-4 bg-background rounded-none">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search contracts, vendors, documents..."
                    className="h-12 pl-10 rounded-none"
                  />
                </div>
                <div className="mt-4">
                  <div className="text-sm font-medium text-muted-foreground mb-2">
                    Quick Filters
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {quickFilters.map((filter) => (
                      <Button
                        key={filter}
                        variant="outline"
                        size="sm"
                        className="text-xs rounded-none"
                      >
                        {filter}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </>
  );
};
