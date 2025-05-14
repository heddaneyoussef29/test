import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Bitcoin, AlertCircle, Loader } from "lucide-react";

interface CryptoHolding {
  crypto_id: string;
  amount: number;
}

interface CryptoHoldingsCardProps {
  holdings: CryptoHolding[];
  onAddTransaction: (transactionData: {
    cryptoId: string;
    type: 'buy' | 'sell' | 'deposit' | 'withdrawal';
    amount: number;
    wallet?: string;
    price: number;
  }) => Promise<void>;
  onAddToWatchlist: (cryptoId: string) => Promise<void>;
}

interface CryptoData {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  image: string;
}

const CryptoHoldingsCard: React.FC<CryptoHoldingsCardProps> = ({
  holdings,
  onAddTransaction,
  onAddToWatchlist
}) => {
  const [cryptoData, setCryptoData] = useState<Record<string, CryptoData>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch crypto data from CoinGecko API
  useEffect(() => {
    const fetchCryptoData = async () => {
      if (!holdings || holdings.length === 0) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Get unique crypto IDs from holdings
        const cryptoIds = [...new Set(holdings.map(h => h.crypto_id.toLowerCase()))].join(',');

        const response = await fetch(
          `http://localhost:5000/api/crypto/markets/${cryptoIds}`,
        );

        if (!response.ok) {
          throw new Error('Failed to fetch cryptocurrency data');
        }

        const data: CryptoData[] = await response.json();
        
        // Convert array to object with crypto ID as key for easier lookup
        const cryptoDataMap = data.reduce((acc, crypto) => {
          acc[crypto.id.toLowerCase()] = crypto;
          return acc;
        }, {} as Record<string, CryptoData>);

        setCryptoData(cryptoDataMap);
      } catch (err) {
        console.error('Error fetching crypto data:', err);
        setError('Failed to load cryptocurrency prices. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCryptoData();

    // Refresh prices every 30 seconds
    const interval = setInterval(fetchCryptoData, 3000000);
    return () => clearInterval(interval);
  }, [holdings]);

  // Calculate enhanced holdings with current prices
  const { enhancedHoldings, totalValue } = React.useMemo(() => {
    if (!holdings || holdings.length === 0 || Object.keys(cryptoData).length === 0) {
      return { enhancedHoldings: [], totalValue: 0 };
    }

    const enhanced = holdings.map(holding => {
      const crypto = cryptoData[holding.crypto_id.toLowerCase()];
      
      const currentPrice = crypto.current_price || 0;
      const haba= holding.amount / currentPrice
      const value = ((haba * currentPrice) - holding.amount * 0.14);
      
      return {
        ...holding,
        symbol: crypto?.symbol || holding.crypto_id,
        name: crypto?.name || holding.crypto_id,
        currentPrice,
        haba : haba,
        value,
        image: crypto?.image || null
      };
    });

    const total = enhanced.reduce((sum, h) => sum + h.value, 0);
    return { enhancedHoldings: enhanced, totalValue: total };
  }, [holdings, cryptoData]);

  if (!holdings || holdings.length === 0) {
    return (
      <Card className="crypto-card">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bitcoin className="mr-2 h-5 w-5 text-crypto-accent" />
            <span>Crypto Holdings</span>
          </CardTitle>
          <CardDescription>Your cryptocurrency portfolio</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 space-y-4">
            <AlertCircle className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground text-center">
              You don't own any cryptocurrencies yet. Start by buying some crypto!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="crypto-card">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bitcoin className="mr-2 h-5 w-5 text-crypto-accent" />
            <span>Crypto Holdings</span>
          </CardTitle>
          <CardDescription>Loading your portfolio...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-6">
            <Loader className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="crypto-card">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bitcoin className="mr-2 h-5 w-5 text-crypto-accent" />
            <span>Crypto Holdings</span>
          </CardTitle>
          <CardDescription>Error loading data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 space-y-4">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <p className="text-red-500 text-center">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="crypto-card">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Bitcoin className="mr-2 h-5 w-5 text-crypto-accent" />
          <span>Crypto Holdings</span>
        </CardTitle>
        <CardDescription>
          Total portfolio value: ${totalValue.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asset</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Amount crypto</TableHead>
              <TableHead className="text-right">Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {enhancedHoldings.map((holding) => (
              <TableRow key={holding.crypto_id}>
                <TableCell>
                  <div className="flex items-center">
                    {holding.image && (
                      <img 
                        src={holding.image} 
                        alt={holding.name} 
                        className="w-6 h-6 mr-2 rounded-full"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )}
                    <span>{holding.name} ({holding.symbol.toUpperCase()})</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  ${holding.currentPrice.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: holding.currentPrice < 1 ? 6 : 2
                  })}
                </TableCell>
                <TableCell className="text-right">
                  { holding.haba.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 6
                  })}
                </TableCell>
                <TableCell className="text-right">
                  ${holding.value.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 4
                  })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default CryptoHoldingsCard;