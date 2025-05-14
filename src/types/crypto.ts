export interface Cryptocurrency {
  id: string;
  name: string;
  symbol: string;
  image: string;
  current_price: number;  // Changed from 'price'
  price_change_percentage_1h_in_currency?: number;  // Changed from 'priceChange1h'
  price_change_percentage_24h_in_currency?: number; // Changed from 'priceChange24h'
  price_change_percentage_7d_in_currency?: number;  // Changed from 'priceChange7d'
  total_volume?: number;  // Changed from 'volume24h'
  market_cap?: number;    // Changed from 'marketCap'
  image_url: string;     // Changed from 'image'
  rank?: number;
}

export interface Transaction {
    id: string;
    userId: number;
    cryptoId: string;
    wallet: string;
    type: 'buy' | 'sell' | 'withdrawal' | 'deposit';
    amount: number;
    price: number;
    status: 'pending' | 'completed' | 'cancelled';
    created_at: string;
    
  };

export interface WatchlistItem {
  id: string;
  user_id: string;
  crypto_id: string;
  name?: string;
  symbol?: string;
  current_price?: number;
  image_url?: string;
}
export interface CryptoContextType {
  cryptocurrencies: Cryptocurrency[];
  transactions: Transaction[]; // Removed any optional/null types
  pendingTransactions: Transaction[];
  watchlist: WatchlistItem[];
  loading: boolean;
  error: string | null;
  addToWatchlist: (cryptoId: string) => Promise<boolean>;
  removeFromWatchlist: (cryptoId: string) => Promise<boolean>;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'status' | 'created_at'>) => Promise<boolean>;
  approveTransaction: (transactionId: string) => Promise<boolean>;
  cancelTransaction: (transactionId: string) => Promise<boolean>;
  fetchusername: (id: number) => Promise<string>;
  getUserTransactions: (userId: number) => Promise<Transaction[]>;
  getallTransactions: () => Promise<Transaction[]>;
  loadSavedTransactions: () => Promise<void>;
  refreshData: () => void;
}
