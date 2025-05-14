import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TabContent } from './transactions/TabContent';
import { useCrypto } from '@/contexts/CryptoContext';
import { Loader } from 'lucide-react';

export const TransactionManagement: React.FC = () => {
  const { getallTransactions,cancelTransaction,approveTransaction } = useCrypto();
  const [allTransactions, setAllTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        const transactions = await getallTransactions(); // Fetch all transactions
        setAllTransactions(transactions);
      } catch (err) {
        console.error('Failed to fetch transactions:', err);
        setError('Failed to load transactions. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-500">
        {error}
      </div>
    );
  }

  const pendingTransactions = allTransactions.filter(t => t.status === 'pending');
  const completedTransactions = allTransactions.filter(t => t.status === 'completed');
  const cancelledTransactions = allTransactions.filter(t => t.status === 'cancelled');

  const handleApprove = async (id: string) => {
    try {
      // Implement your approve logic here
      await approveTransaction(id);
      // Refresh transactions
      const updated = await getallTransactions();
      setAllTransactions(updated);
    } catch (err) {
      console.error('Failed to approve transaction:', err);
    }
  };

  const handleCancel = async (id: string) => {
    try {
      // Implement your cancel logic here
      await cancelTransaction(id);
      // Refresh transactions
      const updated = await getallTransactions();
      setAllTransactions(updated);
    } catch (err) {
      console.error('Failed to cancel transaction:', err);
    }
  };

  return (
    <Card className="crypto-card">
      <CardHeader>
        <CardTitle>Transaction Management</CardTitle>
        <CardDescription>Review and manage user transactions</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="pending">
          <TabsList className="bg-crypto-darker mb-4">
            <TabsTrigger value="pending" className="relative">
              Pending
              {pendingTransactions.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-yellow-500 text-black text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {pendingTransactions.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          </TabsList>
          
          <TabContent
            value="pending"
            status="pending"
            isAdmin={true}
            onApprove={handleApprove}
            onCancel={handleCancel}
            emptyMessage="No pending transactions to review."
          />

          
          <TabContent
            value="completed"
            status="completed"
            emptyMessage="No completed transactions."
          />
          
          <TabContent
            value="cancelled"
            status="cancelled"
            emptyMessage="No cancelled transactions."
          />
        </Tabs>
      </CardContent>
    </Card>
  );
};