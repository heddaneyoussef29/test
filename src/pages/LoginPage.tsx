import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { Bitcoin, ShieldCheck } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loading, error: authError, savedCredentials, setSavedCredentials } = useAuth();

  const redirectPath = location.state?.redirectAfterLogin || '/dashboard';
  
  // Use saved credentials if available
  useEffect(() => {
    if (savedCredentials) {
      setEmail(savedCredentials.email);
      setPassword(savedCredentials.password);
      setRememberMe(true);
    }
  }, [savedCredentials]);

  // Handle auth errors
  useEffect(() => {
    if (authError) {
      setError(authError);
    }
  }, [authError]);
  
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    
    try {
      const success = await login(email, password);
      if (success) {
        // Save credentials if remember me is checked
        if (rememberMe) {
          setSavedCredentials({ email, password });
        } else {
          setSavedCredentials(null);
        }
        
        // Redirect based on role
        if (email === 'admin@example.com') {
          navigate('/admin');
        } else {
          navigate(redirectPath);
        }
      }
    } catch (error) {
      setError('Invalid email or password');
      console.error('Login error:', error);
    }
  };

  const handleAdminLogin = async () => {
    setError('');
    try {
      const success = await login('admin@example.com', 'admin123');
      if (success) {
        navigate('/admin');
      }
    } catch (error) {
      setError('Admin login failed');
      console.error('Admin login error:', error);
    }
  };

  return (
    <div className="container max-w-md mx-auto px-4 py-12">
      <Card className="crypto-card border-gray-800">
        <CardHeader className="space-y-1 flex items-center">
          <div className="mx-auto mb-4">
            <Bitcoin size={40} className="text-crypto-accent" />
          </div>
          <CardTitle className="text-2xl text-center">Sign in to your account</CardTitle>
          <CardDescription className="text-center">
            Enter your email and password to access your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 text-sm text-red-500 bg-red-500/10 rounded-md">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-crypto-darker border-gray-700"
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="password">Password</Label>
                <Link to="/forgot-password" className="text-xs text-crypto-accent hover:underline">
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-crypto-darker border-gray-700"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="remember-me" 
                checked={rememberMe} 
                onCheckedChange={() => setRememberMe(!rememberMe)}
              />
              <Label htmlFor="remember-me" className="text-sm cursor-pointer">Remember me</Label>
            </div>
            <Button 
              type="submit" 
              className="w-full bg-crypto-accent hover:bg-crypto-accent/80 text-black"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            Don't have an account?{' '}
            <Link to="/register" className="text-crypto-accent hover:underline">
              Register
            </Link>
          </div>
        </CardContent>
        <CardFooter className="flex-col space-y-2">
          <Button 
            variant="outline" 
            className="w-full border-gray-700 hover:border-crypto-accent/50 hover:bg-crypto-accent/10"
            onClick={handleAdminLogin}
            disabled={loading}
          >
            <ShieldCheck size={16} className="mr-2" />
            Admin Login (Demo)
          </Button>
          <div className="text-xs text-gray-500 text-center">
            Demo admin credentials: admin@example.com / admin123
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default LoginPage;