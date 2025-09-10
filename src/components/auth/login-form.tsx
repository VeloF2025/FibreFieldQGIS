// Login form component for FibreField authentication
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Lock, Mail, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-context';
import { log } from '@/lib/logger';

interface LoginFormProps {
  onSuccess?: () => void;
  redirectPath?: string;
}

export function LoginForm({ onSuccess, redirectPath = '/dashboard' }: LoginFormProps) {
  const router = useRouter();
  const { signIn, resetPassword, error, loading, clearError } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  const validateForm = () => {
    const errors: { [key: string]: string } = {};
    
    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email is invalid';
    }
    
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      clearError();
      await signIn(formData.email, formData.password);
      
      // Success - redirect or call success callback
      if (onSuccess) {
        onSuccess();
      } else {
        router.push(redirectPath);
      }
    } catch (err) {
      // Error is handled by the auth context
      log.error('Login failed:', {}, "Loginform", err);
    }
  };

  const handleResetPassword = async () => {
    if (!formData.email) {
      setFormErrors({ email: 'Please enter your email address first' });
      return;
    }

    try {
      setIsResettingPassword(true);
      clearError();
      await resetPassword(formData.email);
      setResetEmailSent(true);
    } catch (err) {
      log.error('Password reset failed:', {}, "Loginform", err);
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleInputChange = (field: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [field]: e.target.value });
    
    // Clear field error on change
    if (formErrors[field]) {
      setFormErrors({ ...formErrors, [field]: '' });
    }
    
    // Clear global error
    if (error) {
      clearError();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">
            Welcome to FibreField
          </CardTitle>
          <CardDescription>
            Sign in to your field technician account
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {resetEmailSent ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                <Mail className="h-8 w-8 text-green-600" />
              </div>
              
              <div>
                <h3 className="font-medium text-gray-900">Check your email</h3>
                <p className="text-sm text-gray-600 mt-1">
                  We&apos;ve sent a password reset link to {formData.email}
                </p>
              </div>
              
              <Button 
                variant="outline" 
                onClick={() => setResetEmailSent(false)}
                className="w-full"
              >
                Back to Sign In
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Global Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
              
              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    value={formData.email}
                    onChange={handleInputChange('email')}
                    className={`pl-9 ${formErrors.email ? 'border-red-500' : ''}`}
                    disabled={loading}
                  />
                </div>
                {formErrors.email && (
                  <p className="text-sm text-red-600">{formErrors.email}</p>
                )}
              </div>
              
              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleInputChange('password')}
                    className={`pl-9 pr-9 ${formErrors.password ? 'border-red-500' : ''}`}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {formErrors.password && (
                  <p className="text-sm text-red-600">{formErrors.password}</p>
                )}
              </div>
              
              {/* Sign In Button */}
              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
              
              {/* Forgot Password */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResetPassword}
                  disabled={isResettingPassword || loading}
                  className="text-sm text-blue-600 hover:text-blue-500 disabled:text-gray-400"
                >
                  {isResettingPassword ? (
                    <>
                      <Loader2 className="inline mr-1 h-3 w-3 animate-spin" />
                      Sending reset email...
                    </>
                  ) : (
                    'Forgot your password?'
                  )}
                </button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}