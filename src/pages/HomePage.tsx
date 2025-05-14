import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart,Line } from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { Wallet, Banknote, LineChart as LineChartIcon, Bitcoin, TrendingUp, Coins, HeartPulse, ArrowUp, ArrowDown } from 'lucide-react';

interface CryptoCurrency {
  id: string;
  name: string;
  symbol: string;
  current_price: number;
  price_change_percentage_1h_in_currency?: number;
  price_change_percentage_24h_in_currency?: number;
  price_change_percentage_7d_in_currency?: number;
  image: string;
  market_cap: number;
  total_volume: number;
  sparkline_in_7d?: {
    price: number[];
  };
}

const services = [
  {
    title: "Buy crypto",
    description: "One click to buy crypto on service",
    icon: Bitcoin,
    highlighted: true,
    key: "buy-crypto"
  },
  {
    title: "Copy trading",
    description: "Automatically copy expert traders",
    icon: HeartPulse,
    key: "copy-trading"
  },
  {
    title: "Deposit",
    description: "Fast deposit methods",
    icon: Banknote,
    key: "deposit"
  },
  {
    title: "Spot",
    description: "Trade crypto directly",
    icon: LineChartIcon,
    key: "spot"
  },
  {
    title: "Futures",
    description: "Advanced trading options",
    icon: TrendingUp,
    key: "futures"
  },
  {
    title: "Campaign",
    description: "Special offers and rewards",
    icon: Coins,
    key: "campaign"
  }
];

const CryptoCard: React.FC<{
  crypto: CryptoCurrency;
  onBuy: (id: string) => void;
}> = ({ crypto, onBuy }) => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: price < 1 ? 4 : 2,
      maximumFractionDigits: price < 1 ? 6 : 2,
    }).format(price);
  };

  const formatPercentage = (value?: number) => {
    if (value === undefined || value === null) return 'N/A';
    return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const getChangeColor = (value?: number) => {
    if (!value) return 'text-gray-500';
    return value >= 0 ? 'text-green-500' : 'text-red-500';
  };

  const getChangeIcon = (value?: number) => {
    if (!value) return null;
    return value >= 0 ? (
      <ArrowUp className="w-4 h-4 inline" />
    ) : (
      <ArrowDown className="w-4 h-4 inline" />
    );
  };

  return (
    <div className="border border-gray-700 rounded-lg p-4 hover:bg-gray-800/50 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center">
          <img src={crypto.image} alt={crypto.name} className="w-8 h-8 mr-3" />
          <div>
            <h3 className="font-medium">{crypto.name}</h3>
            <span className="text-sm text-gray-400">{crypto.symbol.toUpperCase()}</span>
          </div>
        </div>
        <button 
          onClick={() => onBuy(crypto.id)}
          className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition"
        >
          Buy
        </button>
      </div>
      
      <div className="mb-3">
        <div className="text-xl font-bold">{formatPrice(crypto.current_price)}</div>
      </div>
      
      <div className="grid grid-cols-3 gap-2 text-sm mb-3">
        <div>
          <div className="text-gray-400">1h</div>
          <div className={getChangeColor(crypto.price_change_percentage_1h_in_currency)}>
            {getChangeIcon(crypto.price_change_percentage_1h_in_currency)}
            {formatPercentage(crypto.price_change_percentage_1h_in_currency)}
          </div>
        </div>
        <div>
          <div className="text-gray-400">24h</div>
          <div className={getChangeColor(crypto.price_change_percentage_24h_in_currency)}>
            {getChangeIcon(crypto.price_change_percentage_24h_in_currency)}
            {formatPercentage(crypto.price_change_percentage_24h_in_currency)}
          </div>
        </div>
        <div>
          <div className="text-gray-400">7d</div>
          <div className={getChangeColor(crypto.price_change_percentage_7d_in_currency)}>
            {getChangeIcon(crypto.price_change_percentage_7d_in_currency)}
            {formatPercentage(crypto.price_change_percentage_7d_in_currency)}
          </div>
        </div>
      </div>
      
      {crypto.sparkline_in_7d?.price && (
        <div className="h-16 w-full mt-2">
          <LineChart
            width={300}
            height={60}
            data={crypto.sparkline_in_7d.price.map((value, index) => ({
              value,
              index
            }))}
          >
            <Line
              type="monotone"
              dataKey="value"
              stroke={crypto.price_change_percentage_24h_in_currency && crypto.price_change_percentage_24h_in_currency >= 0 ? '#10B981' : '#EF4444'}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </div>
      )}
    </div>
  );
};

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [cryptocurrencies, setCryptocurrencies] = useState<CryptoCurrency[]>([]);
  const [loading, setLoading] = useState(true);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchCryptoData = async (pageNum: number = 1) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(
        `http://localhost:5000/api/crypto/markets`
      );
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.length === 0) {
        setHasMore(false);
        return;
      }

      if (pageNum === 1) {
        setCryptocurrencies(data);
      } else {
        setCryptocurrencies(prev => [...prev, ...data]);
      }
      
      // Initialize watchlist with top 3 coins if empty
      if (watchlist.length === 0 && data.length >= 3) {
        setWatchlist([data[0].id, data[1].id, data[2].id]);
      }
    } catch (err) {
      console.error('Error fetching crypto data:', err);
      setError('Failed to load cryptocurrency data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCryptoData();

    // Refresh data every 5 minutes
    const intervalId = setInterval(() => fetchCryptoData(1), 300000);
    return () => clearInterval(intervalId);
  }, []);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchCryptoData(nextPage);
  };

  const handleBuyCrypto = (cryptoId: string) => {
    if (user) {
      navigate(`/buy/${cryptoId}`);
    } else {
      navigate('/login', { state: { redirectAfterLogin: `/buy/${cryptoId}` } });
    }
  };

  const handleServiceClick = (serviceKey: string) => {
    switch (serviceKey) {
      case 'buy-crypto':
        navigate('/market');
        break;
      case 'deposit':
        if (user) {
          navigate('/dashboard/deposit');
        } else {
          navigate('/login', { state: { redirectAfterLogin: '/dashboard/deposit' } });
        }
        break;
      default:
        navigate('/market');
    }
  };

  return (
    <div className="container mx-auto px-4 pb-12">
      <section className="py-12">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-bold mb-6">
            Buy and Sell Cryptocurrency with <span className="gradient-text">Bank Cards</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            Fast, secure, and easy. The simplest way to buy crypto with your card or bank account.
          </p>
        </div>
        
        {user && (
          <Card className="crypto-card mb-8">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground">Your Wallet Balance</p>
                  <h3 className="text-2xl sm:text-3xl font-bold">
                    ${user.walletBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h3>
                </div>
                <div className="h-12 w-12 bg-blue-600/10 rounded-full flex items-center justify-center">
                  <Wallet className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <h2 className="text-xl font-bold mb-4 uppercase text-gray-300">Services</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-12">
          {services.map((service) => (
            <div
              key={service.key}
              onClick={() => handleServiceClick(service.key)}
              className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                service.highlighted
                  ? 'border-blue-600 bg-blue-600/10 hover:bg-blue-600/20'
                  : 'border-gray-700 hover:bg-gray-800/50'
              }`}
            >
              <div className="flex items-center mb-3">
                <div className={`p-2 rounded-full mr-3 ${
                  service.highlighted ? 'bg-blue-600/20 text-blue-600' : 'bg-gray-700 text-gray-300'
                }`}>
                  <service.icon className="h-5 w-5" />
                </div>
                <h3 className="font-medium">{service.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground">{service.description}</p>
            </div>
          ))}
        </div>
        
        <Card className="crypto-card overflow-hidden mb-6">
          <CardHeader className="border-b border-gray-800 bg-gray-900 px-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold">
                Cryptocurrency Market
              </CardTitle>
              <div className="text-sm text-muted-foreground">
                {cryptocurrencies.length} coins loaded
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {error ? (
              <div className="py-8 text-center text-red-500">
                <p>{error}</p>
                <button 
                  onClick={() => {
                    setPage(1);
                    fetchCryptoData(1);
                  }}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                >
                  Retry
                </button>
              </div>
            ) : (
              <Tabs defaultValue="all" className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-gray-900 mb-4">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="gainers">Gainers</TabsTrigger>
                  <TabsTrigger value="watchlist" disabled={watchlist.length === 0}>
                    Watchlist {watchlist.length > 0 && `(${watchlist.length})`}
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="all" className="mt-0">
                  {loading && page === 1 ? (
                    <div className="py-8 text-center">
                      <p className="animate-pulse text-muted-foreground">Loading cryptocurrencies...</p>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4">
                        {cryptocurrencies.map((crypto) => (
                          <CryptoCard 
                            key={crypto.id} 
                            crypto={crypto} 
                            onBuy={() => handleBuyCrypto(crypto.id)} 
                          />
                        ))}
                      </div>
                      {hasMore && (
                        <div className="mt-6 text-center">
                          <button
                            onClick={loadMore}
                            disabled={loading}
                            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:opacity-50"
                          >
                            {loading ? 'Loading...' : 'Load More'}
                          </button>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4">
                      {cryptocurrencies
                        .filter(crypto => crypto.price_change_percentage_24h_in_currency && crypto.price_change_percentage_24h_in_currency > 0)
                        .sort((a, b) => (b.price_change_percentage_24h_in_currency || 0) - (a.price_change_percentage_24h_in_currency || 0))
                        .map((crypto) => (
                          <CryptoCard 
                            key={crypto.id} 
                            crypto={crypto} 
                            onBuy={() => handleBuyCrypto(crypto.id)} 
                          />
                        ))}
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="watchlist" className="mt-0">
                  {loading ? (
                    <div className="py-8 text-center">
                      <p className="animate-pulse text-muted-foreground">Loading watchlist...</p>
                    </div>
                  ) : (
                    <>
                      {watchlist.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4">
                          {cryptocurrencies
                            .filter(crypto => watchlist.includes(crypto.id))
                            .map((crypto) => (
                              <CryptoCard 
                                key={crypto.id} 
                                crypto={crypto} 
                                onBuy={() => handleBuyCrypto(crypto.id)} 
                              />
                            ))}
                        </div>
                      ) : (
                        <div className="py-8 text-center">
                          <p className="text-muted-foreground">No cryptocurrencies in your watchlist.</p>
                        </div>
                      )}
                    </>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default HomePage;