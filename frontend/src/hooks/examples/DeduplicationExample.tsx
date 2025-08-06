import React from 'react';
// import { api } from '../../../convex/_generated/api';
import { 
  useDeduplicatedQuery, 
  useBatchedQueries, 
  useDeduplicatedMutation,
  useOptimisticMutation,
  useDeduplicationStats 
} from '@/hooks/useDeduplicatedConvex';

// Mock types - replace with actual imports
interface Contract {
  _id: string;
  title: string;
  vendorId: string;
  status: string;
}

interface Vendor {
  _id: string;
  name: string;
}

interface User {
  _id: string;
  name: string;
}

/**
 * Example: Using deduplicated queries
 * Multiple components requesting the same data will share the request
 */
export const ContractListWithDeduplication: React.FC = () => {
  // This query will be deduplicated if multiple components request it
  const contracts = useDeduplicatedQuery(api.contracts.list, { 
    enterpriseId: 'enterprise123' 
  });

  // Batch multiple queries together
  const batchedData = useBatchedQueries(
    {
      contracts: api.contracts.list,
      vendors: api.vendors.list,
      users: api.users.list,
    },
    {
      contracts: { enterpriseId: 'enterprise123' },
      vendors: { enterpriseId: 'enterprise123' },
      users: { enterpriseId: 'enterprise123' },
    }
  );

  // Show deduplication stats
  const stats = useDeduplicationStats();

  return (
    <div>
      <div className="mb-4 p-4 bg-gray-100 rounded">
        <h3 className="font-semibold">Deduplication Stats</h3>
        <p>Cache Hits: {stats.hits}</p>
        <p>Cache Misses: {stats.misses}</p>
        <p>Hit Rate: {(stats.hitRate * 100).toFixed(2)}%</p>
      </div>

      {contracts && (
        <div>
          <h2>Contracts ({(contracts as Contract[]).length})</h2>
          {/* Contract list rendering */}
        </div>
      )}

      {batchedData.vendors && (
        <div>
          <h2>Vendors ({(batchedData.vendors as Vendor[]).length})</h2>
          {/* Vendor list rendering */}
        </div>
      )}
    </div>
  );
};

/**
 * Example: Deduplicated mutations
 * Prevents duplicate form submissions
 */
export const ContractFormWithDeduplication: React.FC = () => {
  const createContract = useDeduplicatedMutation(
    api.contracts.create,
    {
      retries: 3,
      retryDelay: 2000,
      // Custom deduplication key based on contract data
      deduplicationKey: (args: { title: string; vendorId: string; }) => `${args.title}-${args.vendorId}`,
    }
  );

  const handleSubmit = async (formData: { title: string; vendorId: string; }) => {
    try {
      // This will be deduplicated if called multiple times with same data
      await createContract({
        title: formData.title,
        vendorId: formData.vendorId,
        // ... other fields
      });
    } catch (error) {
      console.error('Failed to create contract:', error);
    }
  };

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      handleSubmit({ title: 'New Contract', vendorId: 'vendor123' });
    }}>
      {/* Form fields */}
    </form>
  );
};

/**
 * Example: Optimistic updates with deduplication
 */
export const OptimisticContractUpdate: React.FC<{ contractId: string }> = ({ 
  contractId 
}) => {
  const { mutate: updateStatus, optimisticData } = useOptimisticMutation(
    api.contracts.updateStatus,
    {
      optimisticUpdate: (args: { contractId: string; status: string; }) => ({
        contractId: args.contractId,
        status: args.status,
        updatedAt: new Date().toISOString(),
      }),
      rollback: (error: Error, args: { contractId: string; status: string; }) => {
        console.error('Failed to update contract status:', error);
        // Could show a toast notification here
      },
    }
  );

  const handleStatusChange = (newStatus: string) => {
    updateStatus({
      contractId,
      status: newStatus,
    });
  };

  return (
    <div>
      {optimisticData ? (
        <p className="text-blue-600">
          Updating status to {(optimisticData as { status: string }).status}...
        </p>
      ) : (
        <select onChange={(e) => handleStatusChange(e.target.value)}>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
        </select>
      )}
    </div>
  );
};

/**
 * Example: Components that benefit from deduplication
 */
export const DashboardWithDeduplication: React.FC = () => {
  return (
    <div className="grid grid-cols-2 gap-4">
      {/* These components all request the same data */}
      <ContractSummaryCard />
      <RecentContractsWidget />
      <ContractMetricsChart />
      <ActiveContractsList />
    </div>
  );
};

// Each of these components requests contracts data
// With deduplication, only one request is made
const ContractSummaryCard: React.FC = () => {
  const contracts = useDeduplicatedQuery(api.contracts.list, {
    enterpriseId: 'enterprise123',
  });
  
  return (
    <div className="p-4 border rounded">
      <h3>Total Contracts</h3>
      <p className="text-2xl font-bold">{(contracts as Contract[])?.length || 0}</p>
    </div>
  );
};

const RecentContractsWidget: React.FC = () => {
  const contracts = useDeduplicatedQuery(api.contracts.list, {
    enterpriseId: 'enterprise123',
  });
  
  const recent = (contracts as Contract[])?.slice(0, 5) || [];
  
  return (
    <div className="p-4 border rounded">
      <h3>Recent Contracts</h3>
      {recent.map(contract => (
        <div key={contract._id}>{contract.title}</div>
      ))}
    </div>
  );
};

const ContractMetricsChart: React.FC = () => {
  const contracts = useDeduplicatedQuery(api.contracts.list, {
    enterpriseId: 'enterprise123',
  });
  
  // Calculate metrics from the same deduplicated data
  const metrics = contracts ? {
    active: (contracts as Contract[]).filter(c => c.status === 'active').length,
    draft: (contracts as Contract[]).filter(c => c.status === 'draft').length,
    expired: (contracts as Contract[]).filter(c => c.status === 'expired').length,
  } : null;
  
  return (
    <div className="p-4 border rounded">
      <h3>Contract Status</h3>
      {metrics && (
        <div>
          <p>Active: {metrics.active}</p>
          <p>Draft: {metrics.draft}</p>
          <p>Expired: {metrics.expired}</p>
        </div>
      )}
    </div>
  );
};

const ActiveContractsList: React.FC = () => {
  const contracts = useDeduplicatedQuery(api.contracts.list, {
    enterpriseId: 'enterprise123',
  });
  
  const active = (contracts as Contract[])?.filter(c => c.status === 'active') || [];
  
  return (
    <div className="p-4 border rounded">
      <h3>Active Contracts ({active.length})</h3>
      {active.map(contract => (
        <div key={contract._id} className="py-1">
          {contract.title}
        </div>
      ))}
    </div>
  );
};