import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export function useAuthLogic() {
  const { signIn, signUp, user, resetPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const isSignupPage = location.pathname === '/signup';

  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({ email: '', password: '', fullName: '' });

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleLogin = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      const { error } = await signIn(loginForm.email, loginForm.password);
      if (error) {
        toast({ title: 'Login Failed', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Welcome back!', description: 'You have successfully logged in.' });
        navigate('/dashboard');
      }
      setLoading(false);
    },
    [signIn, loginForm, toast, navigate]
  );

  const handleSignup = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      const { error } = await signUp(signupForm.email, signupForm.password, signupForm.fullName);
      if (error) {
        toast({ title: 'Signup Failed', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Account Created!', description: 'Please check your email to verify your account.' });
      }
      setLoading(false);
    },
    [signUp, signupForm, toast]
  );

  const handleForgotPassword = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      const { error } = await resetPassword(resetEmail);
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Password Reset Email Sent!', description: 'Please check your email for the reset link.' });
        setShowForgotPassword(false);
        setResetEmail('');
      }
      setLoading(false);
    },
    [resetPassword, resetEmail, toast]
  );

  return {
    isSignupPage,
    loading,
    showForgotPassword,
    setShowForgotPassword,
    resetEmail,
    setResetEmail,
    loginForm,
    setLoginForm,
    signupForm,
    setSignupForm,
    handleLogin,
    handleSignup,
    handleForgotPassword,
  };
}
