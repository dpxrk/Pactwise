import React from 'react';
import { 
  useContracts, 
  useContractLoading,
  useContractActions 
} from '@/stores/contracts';
import { 
  useSearchQuery, 
  useSearchActions,
  useFilteredContracts 
} from '@/stores/contracts';
import { Skeleton } from '@/components/premium';

/**
 * Example: Contract List using split stores
 * Demonstrates optimal usage of the new store structure
 */
export const ContractListExample: React.FC = () => {
  // Only subscribe to contracts and loading state
  const contracts = useContracts();
  const loading = useContractLoading();
  
  // Search state and actions
  const searchQuery = useSearchQuery();
  const { setSearchQuery } = useSearchActions();
  
  // Get filtered contracts (re-computes when contracts or search changes)
  const filteredContracts = useFilteredContracts();
  
  // Contract actions (stable reference, won't cause re-renders)
  const { deleteContract, fetchMoreContracts } = useContractActions();
  
  if (loading) {
    return <ContractListSkeleton />;
  }
  
  return (
    <div className="space-y-4">
      {/* Search input - only re-renders when searchQuery changes */}
      <SearchBar 
        value={searchQuery} 
        onChange={setSearchQuery} 
      />
      
      {/* Contract list - only re-renders when filteredContracts changes */}
      <ContractGrid 
        contracts={filteredContracts}
        onDelete={deleteContract}
      />
      
      {/* Load more button */}
      <LoadMoreButton 
        onClick={() => fetchMoreContracts(2)}
        hasMore={contracts.length < 100}
      />
    </div>
  );
};

/**
 * Search bar component - isolated re-renders
 */
const SearchBar: React.FC<{
  value: string;
  onChange: (value: string) => void;
}> = React.memo(({ value, onChange }) => {
  return (
    <input
      type="text"
      placeholder="Search contracts..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-4 py-2 border rounded-lg"
    />
  );
});

/**
 * Contract grid - only re-renders when contracts change
 */
const ContractGrid: React.FC<{
  contracts: any[];
  onDelete: (id: string) => void;
}> = React.memo(({ contracts, onDelete }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {contracts.map((contract) => (
        <ContractCard 
          key={contract._id} 
          contract={contract} 
          onDelete={onDelete}
        />
      ))}
    </div>
  );
});

/**
 * Individual contract card
 */
const ContractCard: React.FC<{
  contract: any;
  onDelete: (id: string) => void;
}> = React.memo(({ contract, onDelete }) => {
  return (
    <div className="p-4 border rounded-lg">
      <h3 className="font-semibold">{contract.title}</h3>
      <p className="text-sm text-gray-600">{contract.vendor?.name}</p>
      <button
        onClick={() => onDelete(contract._id)}
        className="mt-2 text-red-600 hover:text-red-800"
      >
        Delete
      </button>
    </div>
  );
});

/**
 * Loading skeleton
 */
const ContractListSkeleton: React.FC = () => {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    </div>
  );
};

/**
 * Load more button
 */
const LoadMoreButton: React.FC<{
  onClick: () => void;
  hasMore: boolean;
}> = ({ onClick, hasMore }) => {
  if (!hasMore) return null;
  
  return (
    <button
      onClick={onClick}
      className="w-full py-2 border rounded-lg hover:bg-gray-50"
    >
      Load More
    </button>
  );
};