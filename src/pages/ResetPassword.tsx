import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/api/supabase';

const ResetPassword = () => {
  const { updatePassword, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const handledRecoverySession = useRef(false);
  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);

  useEffect(() => {
    const establishRecoverySession = async () => {
      if (handledRecoverySession.current) return;
      handledRecoverySession.current = true;

      const urlParams = new URLSearchParams(location.search);
      const hashParams = new URLSearchParams(location.hash.substring(1));
      const code = urlParams.get('code');
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');

      try {
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          if (error) throw error;
        } else {
          const { data, error } = await supabase.auth.getSession();
          if (error) throw error;
          if (!data.session) throw new Error('Missing recovery session.');
        }
        setRecoveryError(null);
        setRecoveryReady(true);
      } catch (err) {
        console.error('Recovery session establishment failed', err);
        setRecoveryReady(false);
        setRecoveryError('Could not establish a session from the reset link. Please open the link again.');
      }
    };

    establishRecoverySession();
  }, [location.search, location.hash]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!recoveryReady) {
      toast({
        title: 'Session not ready',
        description: 'Please reopen the reset link from your email to continue.',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Error',
        description: 'Passwords do not match',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: 'Error',
        description: 'Password must be at least 6 characters',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await updatePassword(newPassword);

      if (error) {
        console.error('Password update error:', error);
        toast({
          title: 'Error',
          description: error.message || 'Failed to update password',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Password Updated!',
          description: 'Your password has been successfully updated. Please log in with your new password.',
        });
        setNewPassword('');
        setConfirmPassword('');
        await signOut();
        navigate('/login', { replace: true });
        setTimeout(() => {
          if (window.location.pathname !== '/login') {
            window.location.replace('/login');
          }
        }, 200);
      }
    } catch (err) {
      console.error('Unexpected error during password update:', err);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-accent/30 blur-3xl" />
      </div>
      <div className="min-h-screen flex items-center justify-center p-4">
        <button
          className="absolute top-4 right-4 inline-flex h-9 w-9 items-center justify-center rounded-md border bg-card hover:bg-accent/30"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        <Card className="w-full max-w-xl shadow-xl">
          <CardHeader className="text-center space-y-2">
            <CardTitle className="text-2xl tracking-tight">Reset Your Password</CardTitle>
            <CardDescription>Enter your new password below</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  minLength={6}
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  minLength={6}
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              {recoveryError && (
                <p className="text-sm text-destructive">{recoveryError}</p>
              )}
              <Button
                type="submit"
                className="w-full"
                disabled={loading || !recoveryReady}
              >
                {loading
                  ? 'Updating...'
                  : !recoveryReady
                    ? 'Preparing...'
                    : 'Update password'}
              </Button>
              <Button 
                type="button" 
                variant="link" 
                className="w-full text-sm" 
                onClick={() => navigate('/login')}
              >
                Back to login
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
