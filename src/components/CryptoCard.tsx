import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCrypto } from '@/contexts/CryptoContext';
import type { Cryptocurrency } from '@/types/crypto';

interface DisplayData {
  price: number;
  change1h: number;
  change24h: number;
  change7d: number;
  image_url: string;
  image: string; // Added image_url to DisplayData
}

interface CryptoCardProps {
  crypto: Cryptocurrency;
  image: string;
  displayData?: DisplayData; // Make displayData optional
  onBuy?: () => void;
}

// Default display data when not provided
const DEFAULT_DISPLAY_DATA: DisplayData = {
  price: 0,
  change1h: 0,
  change24h: 0,
  change7d: 0,
  image_url : '',
  image: ''

};

const getCryptoImageUrl = (crypto: Cryptocurrency): string => {
  if (crypto.image_url) return crypto.image_url;
  
  const coinIdMap: Record<string, string> = {
    'bitcoin': '5968260',
    'ethereum': '1027',
    'tether': '825',
    'binancecoin': '1839',
    'cardano': '14446140',
  };
  
  const coinId = coinIdMap[crypto.id.toLowerCase()] || crypto.id;
  return `https://cdn-icons-png.flaticon.com/128/5968/${coinId}.png`;
};

const CryptoCard: React.FC<CryptoCardProps> = ({ 
  crypto, 
  displayData = DEFAULT_DISPLAY_DATA, // Provide default value
  onBuy 
}) => {
  const { watchlist, addToWatchlist, removeFromWatchlist } = useCrypto();
  const isInWatchlist = watchlist.some(item => item.crypto_id === crypto.id);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: price < 1 ? 4 : 2,
      maximumFractionDigits: price < 1 ? 4 : 2
    }).format(price);
  };

  const formatPercentage = (percentage: number) => {
    const value = Number.isFinite(percentage) ? percentage : 0;
    return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const formatVolume = (volume: number | undefined) => {
    if (!volume) return '$0.00';
    if (volume >= 1e9) return `$${(volume / 1e9).toFixed(2)}B`;
    if (volume >= 1e6) return `$${(volume / 1e6).toFixed(2)}M`;
    return `$${volume.toFixed(2)}`;
  };

  const handleWatchlistToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (isInWatchlist) {
        await removeFromWatchlist(crypto.id);
      } else {
        await addToWatchlist(crypto.id);
      }
    } catch (error) {
      console.error('Error toggling watchlist:', error);
    }
  };

  const isStablecoin = crypto.symbol === 'USDT' || crypto.symbol === 'USDC';
  const getPriceChangeClass = (percentage: number) => {
    if (isStablecoin && Math.abs(percentage) < 0.1) return "text-gray-400";
    return percentage > 0 ? "text-crypto-green" : "text-crypto-red";
  };

  const imageUrl = getCryptoImageUrl(crypto);

  return (
    <div className="group">
      <Card className="crypto-card overflow-hidden hover:shadow-md hover:shadow-crypto-accent/5 transition-all duration-300">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
              <img 
                src={crypto.image} 
                alt={crypto.name} 
                className="h-10 w-10 object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/crypto-placeholder.png';
                }}
              />
            </div>
            <div>
              <h3 className="font-medium">{crypto.name}</h3>
              <p className="text-sm text-muted-foreground">{crypto.symbol}</p>
            </div>
          </div>
          
          <Button 
            variant="ghost"
            size="icon"
            className={cn(
              "opacity-0 group-hover:opacity-100 transition-opacity",
              isInWatchlist && "text-red-500 opacity-100"
            )}
            onClick={handleWatchlistToggle}
            aria-label={isInWatchlist ? "Remove from watchlist" : "Add to watchlist"}
          >
            <Heart 
              size={18} 
              className={cn(
                "transition-colors",
                isInWatchlist ? "fill-red-500 text-red-500" : "text-gray-400"
              )} 
            />
          </Button>
        </div>
        
        <div className="px-4 pb-2">
          <div className="text-xl font-semibold">
            {formatPrice(displayData.price)}
          </div>
          <div className="grid grid-cols-3 gap-2 my-3">
            <div>
              <p className="text-xs text-muted-foreground">1h</p>
              <p className={cn(
                "text-sm font-medium",
                getPriceChangeClass(displayData.change1h)
              )}>
                {formatPercentage(displayData.change1h)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">24h</p>
              <p className={cn(
                "text-sm font-medium",
                getPriceChangeClass(displayData.change24h)
              )}>
                {formatPercentage(displayData.change24h)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">7d</p>
              <p className={cn(
                "text-sm font-medium",
                getPriceChangeClass(displayData.change7d)
              )}>
                {formatPercentage(displayData.change7d)}
              </p>
            </div>
          </div>
          <div className="flex justify-between items-center mb-3">
            <div>
              <p className="text-xs text-muted-foreground">Volume (24h)</p>
              <p className="text-sm">
                {formatVolume(crypto.total_volume)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Market Cap</p>
              <p className="text-sm">
                {formatVolume(crypto.market_cap)}
              </p>
            </div>
          </div>
          
          <Button 
            className="w-full bg-crypto-accent hover:bg-crypto-accent/80 text-black" 
            onClick={onBuy}
          >
            Buy
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default CryptoCard;