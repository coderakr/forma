import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { authClient } from '../lib/api';
import { PageMeta } from '../components/common';
import { Button } from '../components/ui/button';
const schema = z.object({
  name: z.string().max(80).optional(),
  email: z.email('Enter a valid email address'),
  password: z.string().min(10, 'Use at least 10 characters').max(128),
});
export default function AuthPage({ signUp = false }: { signUp?: boolean }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [error, setError] = useState('');
  const qc = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });
  const submit = handleSubmit(async (values) => {
    setError('');
    if (signUp && !values.name?.trim()) {
      setError('Please enter your name.');
      return;
    }
    try {
      const result = signUp
        ? await authClient.signUp.email({ ...values, name: values.name!.trim() })
        : await authClient.signIn.email(values);
      if (result.error) {
        setError(result.error.message ?? 'Unable to sign in');
        return;
      }
      qc.clear();
      const next = params.get('next');
      navigate(next?.startsWith('/') && !next.startsWith('//') ? next : '/account', {
        replace: true,
      });
    } catch {
      setError('We could not connect. Please try again.');
    }
  });
  return (
    <div className="auth-layout container section">
      <PageMeta title={signUp ? 'Create an account' : 'Welcome back'} />
      <div className="auth-aside">
        <span className="eyebrow">A LITTLE MORE AT HOME</span>
        <h1>
          Good things
          <br />
          start here.
        </h1>
        <p>
          Your favorite pieces. Your own little corner.
          <br />
          Make yourself at home.
        </p>
        <div className="auth-mark">f.</div>
      </div>
      <div className="auth-form">
        <span className="eyebrow">YOUR FORMA</span>
        <h2>{signUp ? 'Make yourself at home.' : 'Welcome back.'}</h2>
        <p className="muted">
          {signUp
            ? 'Create an account for a more considered everyday.'
            : 'Sign in to pick up where you left off.'}
        </p>
        <form onSubmit={submit} noValidate>
          {signUp && (
            <label>
              Your name
              <input autoComplete="name" {...register('name')} required />
              {errors.name && <small className="field-error">{errors.name.message}</small>}
            </label>
          )}
          <label>
            Email address
            <input
              type="email"
              autoComplete="email"
              {...register('email')}
              aria-invalid={Boolean(errors.email)}
            />
            {errors.email && <small className="field-error">{errors.email.message}</small>}
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete={signUp ? 'new-password' : 'current-password'}
              {...register('password')}
              aria-invalid={Boolean(errors.password)}
            />
            {errors.password && <small className="field-error">{errors.password.message}</small>}
          </label>
          {error && (
            <p className="field-error" role="alert">
              {error}
            </p>
          )}
          <Button disabled={isSubmitting} type="submit">
            {isSubmitting ? 'One moment…' : signUp ? 'Create account' : 'Sign in'}
            <ArrowRight size={18} />
          </Button>
        </form>
        <p className="auth-switch">
          {signUp ? 'Already part of the family? ' : 'New around here? '}
          <Link
            to={`${signUp ? '/sign-in' : '/sign-up'}${params.get('next') ? `?next=${encodeURIComponent(params.get('next')!)}` : ''}`}
          >
            {signUp ? 'Sign in' : 'Create an account'}
          </Link>
        </p>
      </div>
    </div>
  );
}
