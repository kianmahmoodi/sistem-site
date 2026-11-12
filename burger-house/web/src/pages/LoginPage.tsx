import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { KeyRound, LogIn, UserPlus } from 'lucide-react';
import { ApiError } from '../lib/api';
import { useAuth } from '../store/auth';
import { useToast } from '../store/toast';

export function LoginPage() {
  const { login, register } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError('');
    if (mode === 'register' && form.name.trim().length < 2) {
      setError('Please enter your full name.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setBusy(true);
    try {
      const user =
        mode === 'login'
          ? await login(form.email.trim(), form.password)
          : await register({
              name: form.name.trim(),
              email: form.email.trim(),
              password: form.password,
              phone: form.phone.trim() || undefined,
            });
      push(mode === 'login' ? `Welcome back, ${user.name.split(' ')[0]}!` : 'Account created — welcome!');
      navigate(user.role === 'admin' ? '/admin' : '/account', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main id="main" className="container-page flex min-h-[70vh] items-center justify-center py-14">
      <div className="w-full max-w-md">
        <div className="rounded-[32px] border border-line bg-white p-7 shadow-soft sm:p-9">
          <div className="flex items-center gap-2.5">
            <span className="grid size-11 place-items-center rounded-full bg-cream text-brand">
              <KeyRound className="size-5" />
            </span>
            <div>
              <h1 className="text-xl font-extrabold leading-tight">
                {mode === 'login' ? 'Welcome back' : 'Create your account'}
              </h1>
              <p className="text-xs text-muted">Track orders and check out faster.</p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-1 rounded-full bg-mist p-1">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError('');
              }}
              className={`rounded-full py-2 text-sm font-semibold transition ${
                mode === 'login' ? 'bg-white text-ink shadow-sm' : 'text-muted'
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError('');
              }}
              className={`rounded-full py-2 text-sm font-semibold transition ${
                mode === 'register' ? 'bg-white text-ink shadow-sm' : 'text-muted'
              }`}
            >
              Register
            </button>
          </div>

          <form
            className="mt-6 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            {mode === 'register' && (
              <>
                <div>
                  <label htmlFor="login-name" className="mb-1.5 block text-xs font-semibold text-ink-soft">
                    Full name
                  </label>
                  <input
                    id="login-name"
                    value={form.name}
                    onChange={(event) => setForm({ ...form, name: event.target.value })}
                    className="field"
                    autoComplete="name"
                  />
                </div>
                <div>
                  <label htmlFor="login-phone" className="mb-1.5 block text-xs font-semibold text-ink-soft">
                    Phone (optional)
                  </label>
                  <input
                    id="login-phone"
                    value={form.phone}
                    onChange={(event) => setForm({ ...form, phone: event.target.value })}
                    className="field"
                    inputMode="tel"
                    autoComplete="tel"
                  />
                </div>
              </>
            )}

            <div>
              <label htmlFor="login-email" className="mb-1.5 block text-xs font-semibold text-ink-soft">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                className="field"
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="login-password" className="mb-1.5 block text-xs font-semibold text-ink-soft">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                className="field"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </div>

            {error && (
              <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600">
                {error}
              </p>
            )}

            <button type="submit" className="btn-primary w-full" disabled={busy}>
              {mode === 'login' ? <LogIn className="size-4" /> : <UserPlus className="size-4" />}
              {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <div className="mt-6 rounded-2xl bg-cream px-4 py-3 text-[11px] leading-relaxed text-ink-soft">
            <p className="font-semibold text-ink">Staff demo access</p>
            <p className="mt-0.5">admin@burgerhouse.com · admin123 — full access to the admin dashboard.</p>
          </div>
        </div>

        <p className="mt-5 text-center text-xs text-muted">
          <Link to="/" className="font-semibold text-brand hover:underline">
            Back to the menu
          </Link>
        </p>
      </div>
    </main>
  );
}
