import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useCrypto } from '@/contexts/CryptoContext';
import OverviewTab from '@/components/dashboard/OverviewTab';
import TransactionsTab from '@/components/dashboard/TransactionsTab';
import FutureTab from '@/components/dashboard/FutureTab';
import { toast } from '@/hooks/use-toast';

interface Holding {
  crypto_id: string;
  amount: number;
}

const DashboardPage: React.FC = () => {
  const { user, setUser } = useAuth();
  const {
    cryptocurrencies,
    transactions,
    pendingTransactions,
    addTransaction,
    approveTransaction,
    cancelTransaction,
    addToWatchlist,
    refreshData
  } = useCrypto();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [totalCryptoValue, setTotalCryptoValue] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const isMounted = useRef(true);

  // Memoized function to filter transactions
  const filterTransactions = useCallback(() => {
    return {
      completed: transactions.filter(t => t.status === 'completed'),
      cancelled: transactions.filter(t => t.status === 'cancelled'),
    };
  }, [transactions]);

  const { completed: completedTransactions, cancelled: cancelledTransactions } = filterTransactions();

  const fetchHoldings = useCallback(async () => {
    try {

      const response = await fetch(`http://localhost:5000/api/holdings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId: Number(user.id) })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch holdings');
      }

      const data = await response.json();
      if (data.success && data.holdings && isMounted.current) {
        setHoldings(data.holdings);
        console.log('dyali',data)
      }
    } catch (error) {
      console.error('Error fetching holdings:', error);
    }
  }, []);

  // Initialize dashboard data with proper error handling
  const initializeDashboard = useCallback(async (abortSignal?: AbortSignal) => {
    if (!user?.id) {
      navigate('/login');
      return;
    }

    try {
      setIsLoading(true);
      // Fetch both user data and holdings in parallel
      const [userResponse, holdingsResponse] = await Promise.all([
        fetch(`http://localhost:5000/api/hold`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ userId: user.id }),
          signal: abortSignal
        }),
        fetchHoldings()
      ]);

      if (!userResponse.ok) {
        if (userResponse.status === 401) {
          localStorage.removeItem('token');
          navigate('/login');
          return;
        }
        throw new Error(`API request failed with status ${userResponse.status}`);
      }

      const userData = await userResponse.json();
      if (userData.success && userData.user && isMounted.current) {
        setUser(prev => {
          const newUser = {
            ...userData.user,
            walletBalance: parseFloat(userData.user.walletBalance) || 0
          };
          return JSON.stringify(prev) === JSON.stringify(newUser) ? prev : newUser;
        });

        if (userData.token) {
          localStorage.setItem('token', userData.token);
        }

        if (!localStorage.getItem('welcomeShown')) {
          toast({
            title: "Welcome back!",
            description: `Logged in as ${userData.user.name}`,
          });
          localStorage.setItem('welcomeShown', 'true');
        }
      }
    } catch (error) {
      if (error.name !== 'AbortError' && isMounted.current) {
        console.error('Dashboard initialization error:', error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to load dashboard data",
          variant: "destructive"
        });
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [user?.id, navigate, setUser, fetchHoldings]);

  // Calculate total crypto value
  const calculateTotalCryptoValue = useCallback(async () => {
    if (holdings.length === 0) {
      setTotalCryptoValue(0);
      return;
    }
  
    try {
      // Get unique crypto IDs from holdings
      const cryptoIds = [...new Set(holdings.map(h => h.crypto_id.toLowerCase()))].join(',');
  
      // Fetch current prices from CoinGecko API
      const response = await fetch(
        `http://localhost:5000/api/crypto/markets/${cryptoIds}`
      );
  
      if (!response.ok) {
        throw new Error('Failed to fetch cryptocurrency prices');
      }
  
      const cryptoData = await response.json();
  
      // Create a map for quick lookup
      const priceMap = cryptoData.reduce((acc: Record<string, number>, crypto: any) => {
        acc[crypto.id.toLowerCase()] = crypto.current_price;
        return acc;
      }, {});
  
      // Calculate total value
      const total = holdings.reduce((sum, holding) => {
        const currentPrice = priceMap[holding.crypto_id.toLowerCase()] || 0;
        return sum + (holding.amount - (holding.amount * 0.14));
      }, 0);
  
      setTotalCryptoValue(total);
    } catch (error) {
      console.error('Error calculating crypto value:', error);
      // You might want to set some error state here or show a toast notification
      setTotalCryptoValue(0);
    }
  }, [holdings]);
  
  // Call this function whenever holdings change or periodically
  useEffect(() => {
    calculateTotalCryptoValue();
    
    // Set up interval to refresh prices every 30 seconds
    const interval = setInterval(calculateTotalCryptoValue, 3000000);
    return () => clearInterval(interval);
  }, [calculateTotalCryptoValue]);

  // Initial load and refresh when user data changes
  useEffect(() => {
    isMounted.current = true;
    const controller = new AbortController();
    initializeDashboard(controller.signal);

    return () => {
      isMounted.current = false;
      controller.abort();
    };
  }, [initializeDashboard]);

  // R

  // Optimized transaction handlers
  const handleTransaction = useCallback(async (
    action: () => Promise<boolean>,
    successMessage: string,
    errorMessage: string
  ) => {
    try {
      const success = await action();
      if (success) {
        toast({
          title: successMessage,
          description: "",
        });
        await Promise.all([
          refreshData(),
          fetchHoldings(),
          initializeDashboard()
        ]);
      } else {
        throw new Error(errorMessage);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : errorMessage,
        variant: "destructive"
      });
    }
  }, [refreshData, initializeDashboard, fetchHoldings]);

  const handleAddTransaction = useCallback((transactionData: {
    cryptoId: string;
    type: 'buy' | 'sell';
    wallet: string;
    amount: number;
    price: number;
  }) => {
    return handleTransaction(
      () => addTransaction({
        userId: Number(user?.id),
        cryptoId: transactionData.cryptoId,
        type: transactionData.type,
        wallet: transactionData.wallet,
        amount: transactionData.amount,
        price: transactionData.price
      }),
      "Transaction added",
      "Failed to add transaction"
    );
  }, [addTransaction, handleTransaction, user?.id]);

  const handleAddToWatchlist = useCallback((cryptoId: string) => {
    return handleTransaction(
      () => addToWatchlist(cryptoId),
      "Added to watchlist",
      "Failed to add to watchlist"
    );
  }, [addToWatchlist, handleTransaction]);

  const handleApproveTransaction = useCallback((transactionId: string) => {
    return handleTransaction(
      () => approveTransaction(transactionId),
      "Transaction approved",
      "Failed to approve transaction"
    );
  }, [approveTransaction, handleTransaction]);

  const handleCancelTransaction = useCallback((transactionId: string) => {
    return handleTransaction(
      () => cancelTransaction(transactionId),
      "Transaction cancelled",
      "Failed to cancel transaction"
    );
  }, [cancelTransaction, handleTransaction]);

  if (!user || isLoading) {
    return <div className="container mx-auto px-4 py-12">Loading dashboard...</div>;
  }

  return (
    <div className="container mx-auto px-4 pb-12">
      <div className="pt-8 pb-6">
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {user.name}</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-crypto-darker">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="future">Future</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab
            walletBalance={user.walletBalance}
            totalCryptoValue={totalCryptoValue}
            pendingTransactions={pendingTransactions}
            holdings={holdings}
            cryptocurrencies={cryptocurrencies}
            setActiveTab={setActiveTab}
            onAddTransaction={handleAddTransaction}
            onAddToWatchlist={handleAddToWatchlist}
          />
        </TabsContent>

        <TabsContent value="transactions">
          <TransactionsTab
            userTransactions={transactions}
            pendingTransactions={pendingTransactions}
            completedTransactions={completedTransactions}
            cancelledTransactions={cancelledTransactions}
          />
        </TabsContent>

        <TabsContent value="future">
          <FutureTab
            pendingTransactions={pendingTransactions}
            onApprove={handleApproveTransaction}
            onCancel={handleCancelTransaction}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DashboardPage;