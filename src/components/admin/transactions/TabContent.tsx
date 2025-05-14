import React, { useState, useEffect } from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { TransactionList } from './TransactionList';
import { useCrypto } from '@/contexts/CryptoContext';
import { Loader } from 'lucide-react';

interface TabContentProps {
  value: string;
  status: 'pending' | 'completed' | 'cancelled';
  isAdmin?: boolean;
  onApprove?: (id: string) => void;
  onCancel?: (id: String) => void;
  emptyMessage: string;
}

export const TabContent: React.FC<TabContentProps> = ({
  value,
  status,
  isAdmin = false,
  onApprove,
  onCancel,
  emptyMessage
}) => {
  const { getallTransactions } = useCrypto();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTransactions = async () => {
      try {
        setLoading(true);
        const allData = await getallTransactions(); // Fetch all transactions
        const filteredData =allData.filter(t => t.status === status);
        setTransactions(filteredData);
      } catch (err) {
        console.error('Failed to fetch transactions:', err);
        setError('Failed to load transactions. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadTransactions();
  }, [status, getallTransactions]);

  if (loading) {
    return (
      <TabsContent value={value}>
        <div className="flex justify-center items-center py-8">
          <Loader className="h-6 w-6 animate-spin" />
        </div>
      </TabsContent>
    );
  }

  if (error) {
    return (
      <TabsContent value={value}>
        <div className="text-center py-8 text-red-500">
          {error}
        </div>
      </TabsContent>
    );
  }

  return (
    <TabsContent value={value}>
      <TransactionList
        transactions={transactions}
        isAdmin={isAdmin}
        onApprove={onApprove}
        onCancel={onCancel}
        emptyMessage={emptyMessage}
      />
    </TabsContent>
  );
};