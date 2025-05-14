import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { useCrypto } from '@/contexts/CryptoContext';
import { Bitcoin, AlertCircle, Loader2 } from "lucide-react";

interface Holding {
  crypto_id: string;
  amount: number;
}

const HoldingsPage: React.FC = () => {
  const { user } = useAuth();
  const { cryptocurrencies } = useCrypto();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHoldings = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token || !user?.id) return;

        const response = await fetch(`http://localhost:5000/api/holdings`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch holdings');
        }

        const data = await response.json();
        if (data.success && data.holdings) {
          setHoldings(data.holdings);
        }
      } catch (error) {
        console.error('Error fetching holdings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHoldings();
  }, [user?.id]);

  // Calculate total value and enhance holdings data
  const { enhancedHoldings, totalValue } = useMemo(() => {
    if (holdings.length === 0 || cryptocurrencies.length === 0) {
      return { enhancedHoldings: [], totalValue: 0 };
    }

    const enhanced = holdings.map(holding => {
      const crypto = cryptocurrencies.find(c => 
        c.id.toLowerCase() === holding.crypto_id.toLowerCase()
      );
      
      const currentPrice = crypto?.current_price || 0;
      const value = holding.amount * 0.14;
      
      return {
        ...holding,
        symbol: crypto?.symbol || holding.crypto_id,
        name: crypto?.name || holding.crypto_id,
        currentPrice,
        value,
        image: crypto?.image_url || null
      };
    });

    const total = enhanced.reduce((sum, h) => sum + h.value, 0);
    return { enhancedHoldings: enhanced, totalValue: total };
  }, [holdings, cryptocurrencies]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (holdings.length === 0) {
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
              <TableHead className="text-right">Amount</TableHead>
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
                  {holding.amount.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 8
                  })}
                </TableCell>
                <TableCell className="text-right">
                  ${holding.value.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
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

export default HoldingsPage;