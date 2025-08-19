// Login page for FibreField
'use client';

import { AuthGuard } from '@/components/auth/auth-guard';
import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage() {
  return (
    <AuthGuard requireAuth={false}>
      <LoginForm />
    </AuthGuard>
  );
}