import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, FileCheck, Gauge, XCircle } from 'lucide-react';
import type { Transaction } from '@/types/crypto';
import { useCrypto } from '@/contexts/CryptoContext';

interface StatsDashboardProps {
  initialTransactions?: Transaction[];
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const StatsDashboard: React.FC<StatsDashboardProps> = ({ 
  initialTransactions = [],
  autoRefresh = true,
  refreshInterval = 30000
}) => {
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [loading, setLoading] = useState(!initialTransactions.length);
  const [error, setError] = useState<string | null>(null);
  const { getallTransactions } = useCrypto();

  const fetchTransactionData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getallTransactions();
      setTransactions(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch transactions');
      console.error('Transaction fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [getallTransactions]);

  useEffect(() => {
      fetchTransactionData();
  }, [fetchTransactionData]);

  // Updated to match TransactionManagement's status naming
  const { pending, completed, cancelled } = React.useMemo(() => {
    const result = {
      pending: [] as Transaction[],
      completed: [] as Transaction[],
      cancelled: [] as Transaction[]
    };

    transactions.forEach(t => {
      if (!t?.status) return;
      
      const status = t.status.toLowerCase();
      if (status === 'pending') {
        result.pending.push(t);
      } else if (status === 'completed') {
        result.completed.push(t);
      } else if (status === 'cancelled' || status === 'refused') { // Handle both cases
        result.cancelled.push(t);
      }
    });

    return result;
  }, [transactions]);

  const volumes = React.useMemo(() => {
    const sum = (txns: Transaction[]) => txns.reduce((sum, t) => sum + (t?.amount || 0), 0);
    return {
      pending: sum(pending),
      completed: sum(completed),
      cancelled: sum(cancelled),
      total: sum(pending) + sum(completed)
    };
  }, [pending, completed, cancelled]);

  if (loading) {
    return <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
      {[1, 2, 3, 4].map(i => (
        <Card key={i} className="h-32 animate-pulse bg-gray-200/50 rounded-lg" />
      ))}
    </div>;
  }

  if (error) {
    return <Card className="mb-6 border-red-200 bg-red-50">
      <CardContent className="p-6 text-red-600">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Error loading transactions</p>
            <p className="text-sm">{error}</p>
          </div>
          <button 
            onClick={fetchTransactionData}
            className="px-3 py-1 text-sm bg-red-100 rounded-md hover:bg-red-200 transition"
            disabled={loading}
          >
            {loading ? 'Retrying...' : 'Retry'}
          </button>
        </div>
      </CardContent>
    </Card>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
      <StatCard
        title="Pending"
        value={pending.length}
        secondaryValue={`$${volumes.pending.toLocaleString('en-US', { 
          minimumFractionDigits: 2, 
          maximumFractionDigits: 2 
        })}`}
        icon={<AlertCircle className="h-5 w-5 text-yellow-500" />}
        iconBg="bg-yellow-500/10"
      />
      <StatCard
        title="Completed"
        value={completed.length}
        secondaryValue={`$${volumes.completed.toLocaleString('en-US', { 
          minimumFractionDigits: 2, 
          maximumFractionDigits: 2 
        })}`}
        icon={<FileCheck className="h-5 w-5 text-green-500" />}
        iconBg="bg-green-500/10"
      />
      <StatCard
        title="Cancelled"
        value={cancelled.length}
        icon={<XCircle className="h-5 w-5 text-red-500" />}
        iconBg="bg-red-500/10"
      />
      <StatCard
        title="Total Volume"
        value={`$${volumes.total.toLocaleString('en-US', { 
          minimumFractionDigits: 2, 
          maximumFractionDigits: 2 
        })}`}
        icon={<Gauge className="h-5 w-5 text-blue-500" />}
        iconBg="bg-blue-500/10"
      />
    </div>
  );
};

const StatCard = ({
  title,
  value,
  secondaryValue,
  icon,
  iconBg
}: {
  title: string;
  value: React.ReactNode;
  secondaryValue?: string;
  icon: React.ReactNode;
  iconBg: string;
}) => (
  <Card className="crypto-card hover:shadow-md transition-shadow">
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <h3 className="text-2xl font-bold">{value}</h3>
          {secondaryValue && <p className="text-xs text-muted-foreground">{secondaryValue}</p>}
        </div>
        <div className={`h-10 w-10 ${iconBg} rounded-full flex items-center justify-center`}>
          {icon}
        </div>
      </div>
    </CardContent>
  </Card>
);