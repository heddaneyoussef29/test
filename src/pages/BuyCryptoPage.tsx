import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useCrypto } from '@/contexts/CryptoContext';
import { 
  CreditCard, 
  ArrowLeft, 
  Info, 
  Loader,
  CheckCircle,
  ShieldCheck,
  Lock,
  BadgeCheck,
  AlertCircle
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

const countries = [
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "JP", name: "Japan" },
  { code: "CN", name: "China" },
  { code: "IN", name: "India" },
  { code: "BR", name: "Brazil" },
];

const paymentMethods = [
  { id: 'visa', name: 'Visa', icon: 'https://www.svgrepo.com/show/328144/visa.svg' },
  { id: 'mastercard', name: 'Mastercard', icon: 'https://www.svgrepo.com/show/508701/mastercard-full.svg' },
  { id: 'amex', name: 'American Express', icon: 'https://www.svgrepo.com/show/266068/american-express.svg' },
  { id: 'discover', name: 'Discover', icon: 'https://www.svgrepo.com/show/508416/discover.svg' },
];

const BuyCryptoPage: React.FC = () => {
  const { cryptoId } = useParams<{ cryptoId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addTransaction } = useCrypto();
  const { toast } = useToast();
  
  const [amount, setAmount] = useState<string>('100');
  const [cryptoAmount, setCryptoAmount] = useState<number>(0);
  const [name, setName] = useState<string>(user?.name || '');
  const [cardNumber, setCardNumber] = useState<string>('');
  const [expiryDate, setExpiryDate] = useState<string>('');
  const [cvc, setCvc] = useState<string>('');
  const [country, setCountry] = useState<string>('US');
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [processingStep, setProcessingStep] = useState<number>(0);
  const [processingProgress, setProcessingProgress] = useState<number>(0);
  const [verifications, setVerifications] = useState({
    identity: false,
    payment: false,
    wallet: false
  });
  const [selectedCrypto, setSelectedCrypto] = useState<any>(null);
  const [isFetching, setIsFetching] = useState<boolean>(true);

  // Fetch real-time crypto data from CoinGecko API
  useEffect(() => {
    const fetchCryptoData = async () => {
      try {
        const response = await fetch(
          `http://localhost:5000/api/crypto/markets/${cryptoId}`,
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch cryptocurrency data');
        }
        
        const data = await response.json();
        
        if (data.length === 0) {
          throw new Error('Cryptocurrency not found');
        }
        
        setSelectedCrypto({
          id: data[0].id,
          symbol: data[0].symbol,
          name: data[0].name,
          current_price: data[0].current_price,
          image: data[0].image
        });
      } catch (error) {
        console.error('Error fetching crypto data:', error);
        toast({
          title: "Cryptocurrency Not Found",
          description: "The cryptocurrency you're looking for doesn't exist",
          variant: "destructive",
        });
        navigate('/market');
      } finally {
        setIsFetching(false);
      }
    };

    fetchCryptoData();

    // Refresh price every 30 seconds
    const interval = setInterval(fetchCryptoData, 3000000);
    return () => clearInterval(interval);
  }, [cryptoId, navigate, toast]);

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0; i < match.length; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    return parts.length > 0 ? parts.join(' ') : value;
  };

  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length > 2) {
      return `${v.substring(0, 2)}/${v.substring(2, 4)}`;
    }
    return v;
  };

  useEffect(() => {
    if (selectedCrypto && amount) {
      const numAmount = parseFloat(amount);
      const commissionRate = 0.14;
      const amountAfterCommission = numAmount * (1 - commissionRate);
      setCryptoAmount(amountAfterCommission / selectedCrypto.current_price);
    } else {
      setCryptoAmount(0);
    }
  }, [amount, selectedCrypto]);

  useEffect(() => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to purchase crypto",
      });
      navigate('/login', { state: { redirectAfterLogin: `/buy/${cryptoId}` } });
    }
  }, [user, navigate, cryptoId, toast]);

  useEffect(() => {
    if (name && phoneNumber && country) {
      setTimeout(() => {
        setVerifications(v => ({...v, identity: true}));
      }, 1000);
    }
    if (cardNumber && expiryDate && cvc) {
      setTimeout(() => {
        setVerifications(v => ({...v, payment: true}));
      }, 1500);
    }
    if (walletAddress) {
      setTimeout(() => {
        setVerifications(v => ({...v, wallet: walletAddress.length > 10}));
      }, 800);
    }
  }, [name, phoneNumber, country, cardNumber, expiryDate, cvc, walletAddress]);

  const processTransaction = () => {
    return new Promise<void>((resolve) => {
      const totalSteps = 5;
      let currentStep = 0;
      
      const simulateProgress = () => {
        if (currentStep >= totalSteps) {
          resolve();
          return;
        }
        
        setProcessingStep(currentStep);
        
        const updateInterval = setInterval(() => {
          setProcessingProgress((prev) => {
            const newProgress = prev + 5;
            if (newProgress >= 100) {
              clearInterval(updateInterval);
              currentStep++;
              setTimeout(simulateProgress, 200);
              return 0;
            }
            return newProgress;
          });
        }, 50);
      };
      
      simulateProgress();
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    if (!name || !cardNumber || !expiryDate || !cvc || !country || !amount || !walletAddress || !phoneNumber) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }
    
    if (cardNumber.replace(/\s/g, '').length < 16) {
      toast({
        title: "Invalid Card Number",
        description: "Please enter a valid card number",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }
    
    if (walletAddress.length < 10) {
      toast({
        title: "Invalid Wallet Address",
        description: "Please enter a valid wallet address",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }
    
    try {
      await processTransaction();
      
      addTransaction({
        userId: Number(user.id),
        cryptoId: selectedCrypto.id,
        type: 'buy',
        wallet: walletAddress,
        amount: parseFloat(amount),
        price: selectedCrypto.current_price
      });
      toast({
        title: "Purchase Request Submitted",
        description: "Your transaction is being processed. You will be notified once it's approved.",
      });
      
      navigate('/transaction/pending', { state: { cryptoId, amount, cryptoAmount } });
    } catch (error) {
      console.error('Error processing transaction:', error);
      toast({
        title: "Transaction Failed",
        description: "There was an error processing your transaction. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const VerificationStatus = ({ verified, text }: { verified: boolean, text: string }) => (
    <div className="flex items-center space-x-2 text-sm">
      {verified ? (
        <CheckCircle className="h-4 w-4 text-green-500" />
      ) : (
        <AlertCircle className="h-4 w-4 text-yellow-500" />
      )}
      <span className={verified ? "text-green-500" : "text-yellow-500"}>{text}</span>
    </div>
  );

  const PaymentMethodIcons = () => (
    <div className="flex space-x-2 mt-2">
      {paymentMethods.map(method => (
        <img 
          key={method.id}
          src={method.icon}
          alt={method.name}
          className="h-6 w-auto opacity-70 hover:opacity-100 transition-opacity"
          title={method.name}
        />
      ))}
    </div>
  );

  const renderProcessingUI = () => {
    const stepLabels = [
      "Validating payment information...",
      "Processing payment...",
      "Confirming transaction...",
      "Allocating funds...",
      "Finalizing purchase..."
    ];
    
    return (
      <div className="space-y-6 py-4">
        <div className="flex items-center justify-center mb-8">
          <div className="animate-spin mr-2">
            <Loader className="h-8 w-8 text-crypto-accent" />
          </div>
          <h3 className="text-xl font-medium">{stepLabels[processingStep]}</h3>
        </div>
        
        <Progress value={processingProgress} className="w-full h-2" />
        
        <p className="text-center text-sm text-muted-foreground">
          Please don't close or refresh this page while your transaction is being processed.
        </p>
      </div>
    );
  };

  const renderForm = () => (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2 space-y-2">
          <div className="flex justify-between items-center">
            <Label htmlFor="amount">Amount (USD)</Label>
            <div className="flex items-center text-sm text-green-500">
              <ShieldCheck className="h-4 w-4 mr-1" />
              <span>Secure Transaction</span>
            </div>
          </div>
          <Input
            id="amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="10"
            step="1"
            className="bg-crypto-darker border-gray-700"
            required
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Commission (14%): ${(parseFloat(amount || '0') * 0.14).toFixed(2)}</span>
            <span>You receive: {cryptoAmount.toFixed(8)} {selectedCrypto.symbol}</span>
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="name">Full Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-crypto-darker border-gray-700"
            required
          />
          {name && <VerificationStatus verified={verifications.identity} text="Identity verification" />}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="walletAddress">Wallet Address</Label>
          <div className="relative">
            <Input
              id="walletAddress"
              placeholder="0x..."
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              className="bg-crypto-darker border-gray-700 pr-8"
              required
            />
            {walletAddress && (
              <div className="absolute right-2 top-2">
                {verifications.wallet ? (
                  <BadgeCheck className="h-5 w-5 text-green-500" />
                ) : (
                  <Loader className="h-5 w-5 text-yellow-500 animate-spin" />
                )}
              </div>
            )}
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="country">Country</Label>
          <Select value={country} onValueChange={setCountry}>
            <SelectTrigger className="bg-crypto-darker border-gray-700">
              <SelectValue placeholder="Select country" />
            </SelectTrigger>
            <SelectContent>
              {countries.map((country) => (
                <SelectItem key={country.code} value={country.code}>
                  {country.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="phoneNumber">Phone Number</Label>
          <Input
            id="phoneNumber"
            placeholder="+1234567890"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="bg-crypto-darker border-gray-700"
            required
          />
        </div>
        
        <div className="md:col-span-2">
          <div className="flex items-center space-x-2 mb-4">
            <div className="h-10 w-10 flex items-center justify-center rounded-full bg-crypto-accent/10">
              <CreditCard className="h-5 w-5 text-crypto-accent" />
            </div>
            <div>
              <h3 className="font-medium">Payment Method</h3>
              <p className="text-sm text-muted-foreground">Enter your card details</p>
              <PaymentMethodIcons />
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="cardNumber">Card Number</Label>
                {verifications.payment && (
                  <div className="flex items-center text-sm text-green-500">
                    <Lock className="h-4 w-4 mr-1" />
                    <span>Secured</span>
                  </div>
                )}
              </div>
              <div className="relative">
                <Input
                  id="cardNumber"
                  placeholder="1234 5678 9012 3456"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  maxLength={19}
                  className="bg-crypto-darker border-gray-700"
                  required
                />
                {cardNumber.length > 0 && (
                  <div className="absolute right-2 top-2">
                    {verifications.payment ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <Loader className="h-5 w-5 text-yellow-500 animate-spin" />
                    )}
                  </div>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expiryDate">Expiry Date</Label>
                <Input
                  id="expiryDate"
                  placeholder="MM/YY"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(formatExpiryDate(e.target.value))}
                  maxLength={5}
                  className="bg-crypto-darker border-gray-700"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cvc">CVC</Label>
                <Input
                  id="cvc"
                  placeholder="***"
                  value={cvc}
                  onChange={(e) => setCvc(e.target.value)}
                  type="password"
                  maxLength={4}
                  className="bg-crypto-darker border-gray-700"
                  required
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <Button
        type="submit"
        className="w-full bg-crypto-accent hover:bg-crypto-accent/80 text-black"
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <Lock className="h-4 w-4 mr-2" />
        )}
        Buy {selectedCrypto.symbol} Securely
      </Button>
    </form>
  );

  if (isFetching || !selectedCrypto) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <div className="flex justify-center items-center h-64">
          <Loader className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: price < 1 ? 4 : 2,
      maximumFractionDigits: price < 1 ? 4 : 2
    }).format(price);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Button 
        variant="ghost" 
        onClick={() => navigate(-1)} 
        className="mb-6"
        disabled={isLoading}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card className="crypto-card">
            <CardHeader>
              <CardTitle>Buy {selectedCrypto.name}</CardTitle>
              <CardDescription>
                Complete the form to purchase {selectedCrypto.symbol} with your bank card
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              {isLoading ? renderProcessingUI() : renderForm()}
            </CardContent>
          </Card>
        </div>
        
        <div>
          <Card className="crypto-card sticky top-6">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Price</span>
                <span>{formatPrice(selectedCrypto.current_price)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span>{formatPrice(parseFloat(amount || '0'))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Commission (14%)</span>
                <span>{formatPrice(parseFloat(amount || '0') * 0.14)}</span>
              </div>
              <div className="border-t border-gray-800 pt-4 flex justify-between font-medium">
                <span>You Receive</span>
                <div className="text-right">
                  <div>{(parseFloat(amount || '0')/selectedCrypto.current_price).toFixed(6)} {selectedCrypto.symbol}</div>
                  <div className="text-xs text-muted-foreground">
                    ≈ {formatPrice(parseFloat(amount || '0') * 0.86)}
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <div className="bg-crypto-accent/10 rounded-md p-3 text-sm flex w-full">
                <Info className="h-5 w-5 text-crypto-accent mr-2 shrink-0" />
                <p className="text-muted-foreground">
                  Your transaction will be reviewed by our team before the {selectedCrypto.symbol} is sent to your wallet.
                </p>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default BuyCryptoPage;