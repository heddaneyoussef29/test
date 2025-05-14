import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCrypto } from '@/contexts/CryptoContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowDownLeft } from 'lucide-react';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { toast } from '@/hooks/use-toast';
import axios from 'axios';

const formSchema = z.object({
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  walletAddress: z.string().min(1, "Wallet address is required"),
  cryptoId: z.string().min(1, "Cryptocurrency must be selected"),
});

const WithdrawPage = () => {
  const { user } = useAuth();
  const { cryptocurrencies, addTransaction, refreshData } = useCrypto();
  const navigate = useNavigate();
  const [balance, setBalance] = React.useState<number>(0);
  const [loadingBalance, setLoadingBalance] = React.useState<boolean>(true);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: 0,
      walletAddress: '',
      cryptoId: cryptocurrencies[0]?.id || '', // Default to first crypto if available
    },
  });

  // Fetch balance when component mounts or cryptoId changes
  React.useEffect(() => {
    const fetchBalance = async () => {
      if (!user?.id) return;
      
      try {
        setLoadingBalance(true);
        const cryptoId = form.watch('cryptoId');
        const response = await axios.get(`http://localhost:5000/api/amount/${user.id}/${cryptoId}`);
        
        // Handle the API response format
        if (response.data.success && response.data.data?.length > 0) {
          const amount = parseFloat(response.data.data[0].amount)- parseFloat(response.data.data[0].amount)*0.14;
          setBalance(amount || 0);
        } else {
          setBalance(0);
        }
      } catch (error) {
        console.error('Error fetching balance:', error);
        toast({
          title: "Balance Error",
          description: "Could not fetch your balance for this cryptocurrency",
          variant: "destructive",
        });
        setBalance(0);
      } finally {
        setLoadingBalance(false);
      }
    };

    fetchBalance();

    // Watch for cryptoId changes
    const subscription = form.watch((value, { name }) => {
      if (name === 'cryptoId') {
        fetchBalance();
      }
    });

    return () => subscription.unsubscribe();
  }, [user?.id, form]);

  // Redirect if not logged in
  React.useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to withdraw funds",
        variant: "destructive",
      });
      return;
    }

    if (balance < values.amount) {
      toast({
        title: "Insufficient Balance",
        description: `You don't have enough funds to withdraw this amount. Available: $${balance.toFixed(2)}`,
        variant: "destructive",
      });
      return;
    }

    try {
      const selectedCrypto = cryptocurrencies.find(c => c.id === values.cryptoId);
      if (!selectedCrypto) {
        throw new Error('Selected cryptocurrency not found');
      }

      const success = await addTransaction({
        userId: Number(user.id),
        cryptoId: values.cryptoId,
        type: 'withdrawal',
        wallet: values.walletAddress,
        amount: values.amount,
        price: selectedCrypto.current_price,
      });

      if (success) {
        toast({
          title: "Withdrawal Request Submitted",
          description: "Your withdrawal request is now pending approval",
        });
        await refreshData();
        navigate('/transaction/pending', { 
          state: { 
            cryptoId: values.cryptoId, 
            amount: values.amount, 
            cryptoAmount: values.amount / selectedCrypto.current_price 
          } 
        });
      }
    } catch (error) {
      toast({
        title: "Withdrawal Failed",
        description: error instanceof Error ? error.message : "Could not process withdrawal",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Withdraw Funds</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="crypto-card">
          <CardHeader>
            <CardTitle className="flex items-center">
              <ArrowDownLeft className="mr-2 h-5 w-5" />
              Withdraw Funds
            </CardTitle>
            <CardDescription>Withdraw funds to your external wallet</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="cryptoId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cryptocurrency</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 bg-crypto-darker"
                        >
                          {cryptocurrencies.map((crypto) => (
                            <option key={crypto.id} value={crypto.id}>
                              {crypto.name} ({crypto.symbol})
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="0.00" 
                          type="number" 
                          {...field} 
                          className="bg-crypto-darker"
                        />
                      </FormControl>
                      <FormDescription>
                        {loadingBalance ? (
                          "Loading balance..."
                        ) : (
                          `Available Balance: $${balance.toFixed(2)}`
                        )}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="walletAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Wallet Address</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Your external wallet address" 
                          {...field} 
                          className="bg-crypto-darker"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button 
                  type="submit" 
                  className="w-full bg-crypto-accent hover:bg-crypto-accent/80 text-black"
                  disabled={!user || form.formState.isSubmitting || loadingBalance}
                >
                  {form.formState.isSubmitting ? "Processing..." : "Submit Withdrawal Request"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
        
        {/* Information card remains the same */}
      </div>
    </div>
  );
};

export default WithdrawPage;