'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError('Invalid email or password.');
      setLoading(false);
    } else {
      router.push('/');
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background texture */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-background" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, var(--color-muted) 1px, transparent 0)`,
            backgroundSize: '32px 32px',
          }}
        />
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-accent/[0.04] blur-[100px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] rounded-full bg-accent/[0.03] blur-[100px]" />
      </div>

      {/* Logo */}
      <div className="mb-10 text-center">
        <div className="inline-flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-accent/20">
            R
          </div>
          <span className="text-xl font-bold tracking-tight text-foreground">
            RIPLeet
          </span>
        </div>
        <p className="text-sm text-muted max-w-xs">
          Welcome back. Pick up where you left off.
        </p>
      </div>

      {/* Form Card */}
      <div className="w-full max-w-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5 ml-0.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/40 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted mb-1.5 ml-0.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/40 transition-all"
            />
          </div>

          {error && (
            <div className="text-xs text-hard bg-hard/10 border border-hard/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent hover:bg-accent-hover text-white font-medium text-sm py-2.5 rounded-xl transition-all shadow-md shadow-accent/20 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-xs text-muted mt-6">
          No account yet?{' '}
          <Link
            href="/register"
            className="text-accent hover:text-accent-hover font-medium transition-colors"
          >
            Create one →
          </Link>
        </p>
      </div>

      {/* Footer */}
      <p className="mt-16 text-[11px] text-muted/50 text-center">
        659 companies · 3,399 questions · updated from open-source data
      </p>
    </div>
  );
}
