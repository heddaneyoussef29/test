import React, { useState, useEffect } from 'react';
import type { Transaction } from '@/types/crypto';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, X, Loader } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { TransactionIcon } from './transaction/TransactionIcon';
import { PaymentDetails } from './transaction/PaymentDetails';
import { CancellationDialog } from './transaction/CancellationDialog';
import { formatDate, formatAmount } from '@/utils/formatters';
import { userInfo } from 'os';
import { useCrypto } from '@/contexts/CryptoContext';

interface TransactionItemProps {
  transaction: Transaction;
  isAdmin?: boolean;
  onApprove?: (id: string) => Promise<void> | void;
  onCancel?: (id: string) => Promise<void> | void;
  isNewCurrency?: boolean;
}

const TransactionItem: React.FC<TransactionItemProps> = ({ 
  transaction, 
  isAdmin = false,
  
  onApprove,
  onCancel,
  isNewCurrency = false
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);
  const { user, setUser } = useAuth();
  const { fetchusername } = useCrypto();
  const [userName, setUserName] = useState<string>('Loading...');

  // Fetch current price from CoinGecko API
  useEffect(() => {
    const fetchCurrentPrice = async () => {
      if (!transaction.cryptoId) return;

      try {
        setIsLoadingPrice(true);
        setPriceError(null);

        const response = await fetch(
          `http://localhost:5000/api/crypto/markets/${transaction.cryptoId}`,
        );

        if (!response.ok) {
          throw new Error('Failed to fetch current price');
        }

        const data = await response.json();
        if (data.length === 0) {
          throw new Error('Cryptocurrency not found');
        }

        setCurrentPrice(data[0].current_price);
      } catch (err) {
        console.error('Error fetching current price:', err);
        setPriceError('Price unavailable');
      } finally {
        setIsLoadingPrice(false);
      }
    };

    fetchCurrentPrice();

    // Only set up refresh for pending transactions
    if (transaction.status === 'pending') {
      const interval = setInterval(fetchCurrentPrice, 3000000);
      return () => clearInterval(interval);
    }
  }, [transaction.cryptoId, transaction.status]);

  useEffect(() => {
    const fetchUserName = async () => {
      try {
        if (transaction.userId) {
          const name = await fetchusername(transaction.userId);
          setUserName(name);
        }
      } catch (error) {
        console.error('Error fetching user name:', error);
        setUserName('Error loading name');
      }
    };

    fetchUserName();
  }, [transaction.userId, fetchusername]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'cancelled':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const getTransactionTitle = () => {
    switch (transaction.type) {
      case 'buy':
        return `Buy ${transaction.cryptoId || 'Crypto'}`;
      case 'sell':
        return `Sell ${transaction.cryptoId || 'Crypto'}`;
      default:
        return 'Transaction';
    }
  };

  const handleCancel = async () => {
    if (onCancel && cancellationReason.trim()) {
      try {
        await onCancel(transaction.id);
        setIsDialogOpen(false);
        setCancellationReason('');
      } catch (error) {
        console.error('Failed to cancel transaction:', error);
      }
    }
  };
  const fetchname = fetchusername(transaction.userId);
  const handleApprove = async () => {
    if (onApprove) {
      try {
        await onApprove(transaction.id);
      } catch (error) {
        console.error('Failed to approve transaction:', error);
      }
    }
  };

  const renderPriceInfo = () => {
    if (isLoadingPrice) {
      return (
        <span className="text-xs text-muted-foreground flex items-center">
          <Loader className="h-3 w-3 animate-spin mr-1" />
          Loading price...
        </span>
      );
    }

    if (priceError) {
      return (
        <span className="text-xs text-red-500">
          {priceError}
        </span>
      );
    }

    if (currentPrice !== null && transaction.cryptoId) {
      return (
        <span className="text-xs text-muted-foreground block">
           {((transaction.amount/currentPrice).toFixed(6))}/{transaction.cryptoId.toUpperCase()}
        </span>
      );
    }

    return null;
  };

  return (
    <>
      <Card className={cn(
        "crypto-card hover:shadow-sm transition-all mb-4",
        transaction.status === 'pending' && isAdmin && "border-yellow-500/30"
      )}>
        <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center">
              <TransactionIcon 
              type={transaction.type} 
              showNotification={isNewCurrency}
              />
              <div>
              <h3 className="font-medium">
                {userName} <br />
                {getTransactionTitle()}
                {isNewCurrency && (
                <span className="inline-block ml-2 px-1 py-0.5 bg-[#FEF7CD] text-yellow-800 text-xs rounded">New</span>
                )}
              </h3>
              <p className="text-xs text-muted-foreground">
                {transaction.created_at}
              </p>
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2">
              <p className="font-medium">
                {formatAmount(transaction.amount)}
              </p>
              <Badge variant="outline" className={cn(getStatusColor(transaction.status))}>
                {transaction.status}
              </Badge>
              </div>
              {(transaction.type === 'buy' || transaction.type === 'sell') && renderPriceInfo()}
              <p className="text-xs text-muted-foreground">
              wallet : {transaction.wallet}
              
              </p>
            </div>
            </div>
          
          {isAdmin && transaction.status === 'pending' && (
            <div className="mt-3 pt-3 border-t border-gray-800 flex justify-end space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                className="border-red-500/30 text-red-500 hover:bg-red-500/10"
                onClick={() => setIsDialogOpen(true)}
              >
                <X className="h-4 w-4 mr-1" /> Cancel
              </Button>
              <Button 
                size="sm"
                className="bg-crypto-accent hover:bg-crypto-accent/80 text-black"
                onClick={handleApprove}
              >
                <Check className="h-4 w-4 mr-1" /> Approve
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      <CancellationDialog 
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onCancel={handleCancel}
        cancellationReason={cancellationReason}
        onReasonChange={setCancellationReason}
      />
    </>
  );
};

export default TransactionItem;