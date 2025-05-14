import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CryptoCard from '@/components/CryptoCard';
import { useAuth } from '@/contexts/AuthContext';
import { useCrypto } from '@/contexts/CryptoContext';
import { Search } from 'lucide-react';
import type { Cryptocurrency } from '@/types/crypto';
import { toast } from '@/hooks/use-toast';

const useFluctuatingPrices = (cryptocurrencies: Cryptocurrency[]) => {
  const [displayData, setDisplayData] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!cryptocurrencies.length) return;

    const initialData = cryptocurrencies.reduce((acc, crypto) => {
      const now = Date.now();
      acc[crypto.id] = {
        price: crypto.current_price,
        change1h: crypto.price_change_percentage_1h_in_currency ?? (Math.random() * 4 - 2),
        change24h: crypto.price_change_percentage_24h_in_currency ?? (Math.random() * 8 - 4),
        change7d: crypto.price_change_percentage_7d_in_currency ?? (Math.random() * 15 - 7.5),
        lastUpdated: now,
        basePrice: crypto.current_price,
        baseTime: now
      };
      return acc;
    }, {} as Record<string, any>);

    setDisplayData(initialData);

    const interval = setInterval(() => {
      setDisplayData(prev => {
        const newData = {...prev};
        const now = Date.now();
        
        cryptocurrencies.forEach(crypto => {
          if (!newData[crypto.id]) return;
          
          const data = newData[crypto.id];
          const hoursElapsed = (now - data.baseTime) / (1000 * 60 * 60);
          
          const priceFromChange = data.basePrice * (1 + (data.change1h / 100 * hoursElapsed));
          const fluctuationFactor = 1 + (Math.random() * 0.01 - 0.005);
          const newPrice = priceFromChange * fluctuationFactor;

          newData[crypto.id] = {
            ...data,
            price: newPrice,
            lastUpdated: now
          };
        });

        return newData;
      });
    }, 10000);

    return () => clearInterval(interval);
  }, [cryptocurrencies]);

  return displayData;
};

const MarketPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { watchlist } = useCrypto();
  const [searchQuery, setSearchQuery] = useState('');
  const [cryptocurrencies, setCryptocurrencies] = useState<Cryptocurrency[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch cryptocurrencies from API
  useEffect(() => {
    const fetchCryptocurrencies = async () => {
      try {
        setLoading(true);
        // Replace with your actual API endpoint
        const response = await fetch('http://localhost:5000/api/crypto/markets');
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch cryptocurrencies');
        }
        
        setCryptocurrencies(data);
      } catch (err) {
        console.error('Error fetching cryptocurrencies:', err);
        setError(err.message || 'Failed to load cryptocurrencies');
        toast({
          title: "Error",
          description: "Failed to load cryptocurrency data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCryptocurrencies();
    
    // Optional: Set up polling to refresh data periodically
    const interval = setInterval(fetchCryptocurrencies, 3000000); // 5 minutes
    
    return () => clearInterval(interval);
  }, []);

  const displayData = useFluctuatingPrices(cryptocurrencies);

  const handleBuyCrypto = (cryptoId: string) => {
    if (user) {
      navigate(`/buy/${cryptoId}`);
    } else {
      navigate('/login', { state: { redirectAfterLogin: `/buy/${cryptoId}` } });
    }
  };

  const filteredCryptos = useMemo(() => 
    cryptocurrencies.filter(crypto => 
      crypto.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      crypto.symbol.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [cryptocurrencies, searchQuery]
  );

  const sortedByMarketCap = useMemo(() => [...filteredCryptos].sort((a, b) => b.market_cap - a.market_cap), [filteredCryptos]);
  
  const gainers = useMemo(() => 
    [...filteredCryptos]
      .filter(crypto => (displayData[crypto.id]?.change24h ?? 0) > 0)
      .sort((a, b) => (displayData[b.id]?.change24h ?? 0) - (displayData[a.id]?.change24h ?? 0)),
    [filteredCryptos, displayData]
  );
  
  const losers = useMemo(() => 
    [...filteredCryptos]
      .filter(crypto => (displayData[crypto.id]?.change24h ?? 0) < 0)
      .sort((a, b) => (displayData[a.id]?.change24h ?? 0) - (displayData[b.id]?.change24h ?? 0)),
    [filteredCryptos, displayData]
  );
  
  const watchlistCryptos = useMemo(() => 
    filteredCryptos.filter(crypto => watchlist.includes(crypto.id)),
    [filteredCryptos, watchlist]
  );

  const stablecoins = useMemo(() => 
    filteredCryptos.filter(crypto => 
      ['USDT', 'USDC', 'DAI', 'BUSD'].includes(crypto.symbol.toUpperCase())
    ),
    [filteredCryptos]
  );

  const renderCryptoCard = (crypto: Cryptocurrency) => (
    <CryptoCard 
      key={crypto.id} 
      crypto={crypto}
      image={crypto.image}
      displayData={displayData[crypto.id] || {
        price: crypto.current_price,
        change1h: crypto.price_change_percentage_1h_in_currency,
        change24h: crypto.price_change_percentage_24h_in_currency,
        change7d: crypto.price_change_percentage_7d_in_currency
      }}
      onBuy={() => handleBuyCrypto(crypto.id)} 
    />
  );

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h2 className="text-xl font-medium text-red-500">{error}</h2>
        <p className="text-muted-foreground mt-2">Please try again later</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 pb-12">
      <div className="pt-8 pb-6">
        <h1 className="text-3xl font-bold mb-2">Cryptocurrency Market</h1>
        <p className="text-muted-foreground">Buy and track the latest cryptocurrency prices</p>
      </div>
      
      <Card className="crypto-card mb-6">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search cryptocurrencies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-crypto-darker border-gray-700"
            />
          </div>
        </CardContent>
      </Card>
      
      <Card className="crypto-card">
        <CardHeader className="border-b border-gray-800">
          <CardTitle>Cryptocurrency List</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <Tabs defaultValue="all">
            <TabsList className="bg-crypto-darker mb-6">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="gainers">Gainers</TabsTrigger>
              <TabsTrigger value="losers">Losers</TabsTrigger>
              <TabsTrigger value="stablecoins">Stablecoins</TabsTrigger>
              <TabsTrigger value="watchlist" disabled={watchlist.length === 0}>
                Watchlist {watchlist.length > 0 && `(${watchlist.length})`}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="mt-0">
              {loading ? (
                <div className="py-8 text-center">
                  <p className="animate-pulse text-muted-foreground">Loading cryptocurrencies...</p>
                </div>
              ) : (
                <>
                  {sortedByMarketCap.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {sortedByMarketCap.map(renderCryptoCard)}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No cryptocurrencies match your search.</p>
                    </div>
                  )}
                </>
              )}
            </TabsContent>
            
            <TabsContent value="gainers" className="mt-0">
              {loading ? (
                <div className="py-8 text-center">
                  <p className="animate-pulse text-muted-foreground">Loading gainers...</p>
                </div>
              ) : (
                <>
                  {gainers.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {gainers.map(renderCryptoCard)}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No gainers found.</p>
                    </div>
                  )}
                </>
              )}
            </TabsContent>
            
            <TabsContent value="losers" className="mt-0">
              {loading ? (
                <div className="py-8 text-center">
                  <p className="animate-pulse text-muted-foreground">Loading losers...</p>
                </div>
              ) : (
                <>
                  {losers.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {losers.map(renderCryptoCard)}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No losers found.</p>
                    </div>
                  )}
                </>
              )}
            </TabsContent>
            
            <TabsContent value="stablecoins" className="mt-0">
              {loading ? (
                <div className="py-8 text-center">
                  <p className="animate-pulse text-muted-foreground">Loading stablecoins...</p>
                </div>
              ) : (
                <>
                  {stablecoins.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {stablecoins.map(renderCryptoCard)}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No stablecoins found.</p>
                    </div>
                  )}
                </>
              )}
            </TabsContent>
            
            <TabsContent value="watchlist" className="mt-0">
              {loading ? (
                <div className="py-8 text-center">
                  <p className="animate-pulse text-muted-foreground">Loading watchlist...</p>
                </div>
              ) : (
                <>
                  {watchlistCryptos.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {watchlistCryptos.map(renderCryptoCard)}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">
                        {searchQuery ? "No cryptocurrencies in your watchlist match your search." : "No cryptocurrencies in your watchlist."}
                      </p>
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default MarketPage;