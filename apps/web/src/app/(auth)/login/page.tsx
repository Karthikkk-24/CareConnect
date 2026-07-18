import { Suspense } from 'react';
import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage() {
  return (
    <Suspense fallback={<p className="text-clay-text-muted">Loading...</p>}>
      <LoginForm />
    </Suspense>
  );
}
