import React, { createContext, useContext, useState, useEffect } from 'react';
import type { CryptoContextType, Cryptocurrency, Transaction, WatchlistItem } from '@/types/crypto';
import { useAuth } from '@/contexts/AuthContext';

const CryptoContext = createContext<CryptoContextType | undefined>(undefined);

export function CryptoProvider({ children }: { children: React.ReactNode }) {
  const { user,setUser } = useAuth();
  const [cryptocurrencies, setCryptocurrencies] = useState<Cryptocurrency[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all cryptocurrencies
  const fetchCryptocurrencies = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/cryptocurrencies');
      const data = await response.json();
      if (response.ok) {
        setCryptocurrencies(data);
      } else {
        throw new Error(data.message || 'Failed to fetch cryptocurrencies');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Get user transactions
  const getUserTransactions = async (userId: number): Promise<Transaction[]> => {
    try {
      const response = await fetch(`http://localhost:5000/api/transactions?userId=${userId}`);
      const { transactions: apiTransactions } = await response.json();
      
      if (response.ok) {
        return apiTransactions.map((t: any) => ({
          id: t.id,
          userId: t.user_id,
          cryptoId: t.crypto_id,
          wallet: t.wallet,
          image: t.image,
          type: t.type,
          amount: parseFloat(t.amount),
          price: parseFloat(t.price),
          status: t.status,
          created_at: t.created_at
        }));
      }
      throw new Error('Failed to fetch transactions');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return [];
    }
  };
  const getallTransactions = async (): Promise<Transaction[]> => {
    try {
      const response = await fetch(`http://localhost:5000/api/transactionsall`);
      const { transactions: apiTransactions } = await response.json();
      
      if (response.ok) {
        return apiTransactions.map((t: any) => ({
          id: t.id,
          userId: t.user_id,
          cryptoId: t.crypto_id,
          type: t.type,
          wallet: t.wallet,
          amount: parseFloat(t.amount),
          price: parseFloat(t.price),
          status: t.status,
          created_at: t.created_at
        }));
      }
      throw new Error('Failed to fetch transactions');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return [];
    }
  };

  // Fetch user's watchlist
  const fetchWatchlist = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/watchlist?userId=${user.id}`);
      const data = await response.json();
      if (response.ok) {
        setWatchlist(data);
      } else {
        throw new Error(data.message || 'Failed to fetch watchlist');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Add to watchlist
  const addToWatchlist = async (cryptoId: string): Promise<boolean> => {
    if (!user?.id) return false;
    
    try {
      const response = await fetch('http://localhost:5000/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, cryptoId })
      });
      
      const data = await response.json();
      if (response.ok) {
        await fetchWatchlist();
        return true;
      }
      throw new Error(data.message || 'Failed to add to watchlist');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  };

  // Remove from watchlist
  const removeFromWatchlist = async (cryptoId: string): Promise<boolean> => {
    if (!user?.id) return false;
    
    try {
      const response = await fetch(`http://localhost:5000/api/watchlist/${cryptoId}?userId=${user.id}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      if (response.ok) {
        await fetchWatchlist();
        return true;
      }
      throw new Error(data.message || 'Failed to remove from watchlist');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  };

  const fetchusername = async (id: Number): Promise<string> => {
    try {
      const response = await fetch(`http://localhost:5000/api/name?id=${id}`);
      if (!response.ok) throw new Error('Failed to fetch user name');
      return response.text(); // Assuming your API returns just the name string
    } catch (error) {
      console.error('Error fetching user name:', error);
      throw error; // Or return a default value
    }
  };
  // Add transaction
  const addTransaction = async (
    transaction: Omit<Transaction, 'id' | 'status' | 'created_at'>
  ): Promise<boolean> => {
    try {
      const response = await fetch('http://localhost:5000/api/transactions', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          userId: transaction.userId,
          cryptoId: transaction.cryptoId,
          wallet: transaction.wallet,
          type: transaction.type,
          amount: transaction.amount,
          price: transaction.price
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Transaction failed');
      }
  
      await fetchTransactions();
      return true;
    } catch (err) {
      console.error('Transaction error:', err);
      setError(err instanceof Error ? err.message : 'Transaction failed');
      return false;
    }
  };

  // Fetch transactions
  const fetchTransactions = async () => {
    if (!user?.id) {
      setTransactions([]);
      return;
    }
  
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/transactions?userId=${user.id}`);
      const { transactions: apiTransactions } = await response.json(); // Destructure the response
      
      if (response.ok) {
        // Transform API data to match your frontend interface
        const formattedTransactions = apiTransactions.map((t: any) => ({
          id: t.id,
          userId: t.user_id,
          cryptoId: t.crypto_id,
          type: t.type,
          wallet: t.wallet,
          amount: parseFloat(t.amount),
          price: parseFloat(t.price),
          status: t.status,
          created_at: t.created_at
        }));
        
        setTransactions(formattedTransactions);
      } else {
        throw new Error('Failed to fetch transactions');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };


  const pendingTransactions = Array.isArray(transactions) 
  ? transactions.filter(t => t.status === 'pending') 
  : [];

// 4. Similarly update your loadSavedTransactions function
const loadSavedTransactions = async (): Promise<void> => {
  if (!user?.id) {
    setTransactions([]);
    return;
  }
  try {
    const userTransactions = await getUserTransactions(Number(user.id));
    setTransactions(Array.isArray(userTransactions) ? userTransactions : []);
  } catch (error) {
    setTransactions([]);
  }
};
  // Approve transaction
  const approveTransaction = async (transactionId: string): Promise<boolean> => {
    try {
      const response = await fetch(`http://localhost:5000/api/transactions/${transactionId}/approve`, {
        method: 'PATCH'
      });
      
      const data = await response.json();
      if (response.ok) {
        await fetchTransactions();
        return true;
      }
      throw new Error(data.message || 'Failed to approve transaction');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  };

  // Cancel transaction
  const cancelTransaction = async (transactionId: string): Promise<boolean> => {
    try {
      const response = await fetch(`http://localhost:5000/api/transactions/${transactionId}/cancel`, {
        method: 'PATCH'
      });
      
      const data = await response.json();
      if (response.ok) {
        await fetchTransactions();
        return true;
      }
      throw new Error(data.message || 'Failed to cancel transaction');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  };
  
  // Refresh all data
  const refreshData = () => {
    fetchCryptocurrencies();
     // Assuming you have a fetchHoldings function
    if (user) {
      
      fetchWatchlist();
      fetchTransactions(); // Fetch user data if user is available
    }
  };
  

  // Initial data loading
  useEffect(() => {
    fetchCryptocurrencies();
    if (user) {
      fetchWatchlist();
      fetchTransactions();
    }
  }, [user]);

  const value: CryptoContextType = {
    cryptocurrencies,
    transactions: Array.isArray(transactions) ? transactions : [],
    pendingTransactions,
    watchlist,
    loading,
    error,
    addToWatchlist,
    removeFromWatchlist,
    addTransaction,
    approveTransaction,
    cancelTransaction,
    fetchusername,
    getUserTransactions,
    getallTransactions,
    loadSavedTransactions,
    refreshData,
  };

  return <CryptoContext.Provider value={value}>{children}</CryptoContext.Provider>;
}

export const useCrypto = (): CryptoContextType => {
  const context = useContext(CryptoContext);
  if (context === undefined) {
    throw new Error('useCrypto must be used within a CryptoProvider');
  }
  return context;
};