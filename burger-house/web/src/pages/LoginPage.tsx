import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { KeyRound, LogIn, ShieldCheck, UserPlus } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../store/auth';
import { usePrefs } from '../store/prefs';
import { useToast } from '../store/toast';

export function LoginPage() {
  const { login, register } = useAuth();
  const { push } = useToast();
  const { t } = usePrefs();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', remember: true });
  const [needsCode, setNeedsCode] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [forgotMessage, setForgotMessage] = useState('');

  const submit = async () => {
    setError('');
    if (mode === 'register' && form.name.trim().length < 2) {
      setError(t('Please enter your full name.'));
      return;
    }
    if (mode === 'register' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) {
      setError(t('Please enter a valid email address.'));
      return;
    }
    if (mode === 'login' && form.email.trim().length < 3) {
      setError(t('Please enter your email or username.'));
      return;
    }
    if (form.password.length < 6) {
      setError(t('Password must be at least 6 characters.'));
      return;
    }
    setBusy(true);
    try {
      if (mode === 'login') {
        const result = await login(form.email.trim(), form.password, {
          remember: form.remember,
          code: needsCode ? code : undefined,
        });
        push(`${t('Welcome back')}, ${result.user.name.split(' ')[0]}!`);
        navigate(result.redirect, { replace: true });
      } else {
        const user = await register({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          phone: form.phone.trim() || undefined,
        });
        push(t('Account created — welcome!'));
        navigate(user.role === 'customer' ? '/account' : '/login', { replace: true });
      }
    } catch (err) {
      if (err instanceof Error && err.message === '2FA_REQUIRED') {
        setNeedsCode(true);
        setError(t('Enter the 6-digit code from your authenticator app.'));
      } else {
        setError(err instanceof ApiError ? err.message : t('Something went wrong. Please try again.'));
      }
    } finally {
      setBusy(false);
    }
  };

  const sendReset = async () => {
    if (!form.email.trim()) {
      setError(t('Please enter a valid email address.'));
      return;
    }
    try {
      const data = await api<{ message: string }>('/api/auth/forgot-password', {
        method: 'POST',
        body: { email: form.email.trim() },
      });
      setForgotMessage(data.message);
    } catch {
      setError(t('Something went wrong. Please try again.'));
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
                {mode === 'login' ? t('Welcome back') : t('Create your account')}
              </h1>
              <p className="text-xs text-muted">{t('Track orders and check out faster.')}</p>
            </div>
          </div>

          {mode === 'login' && !forgot && (
            <div className="mt-6 grid grid-cols-2 gap-1 rounded-full bg-mist p-1">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError('');
                }}
                className="rounded-full bg-white py-2 text-sm font-semibold text-ink shadow-sm transition"
              >
                {t('Sign in')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setError('');
                }}
                className="rounded-full py-2 text-sm font-semibold text-muted transition"
              >
                {t('Register')}
              </button>
            </div>
          )}

          {forgot ? (
            <div className="mt-6 space-y-4">
              <p className="text-sm text-muted">
                {t('Enter your account email and the administrators will receive a reset request.')}
              </p>
              <div>
                <label htmlFor="forgot-email" className="mb-1.5 block text-xs font-semibold text-ink-soft">
                  {t('Email')}
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                  className="field"
                  autoComplete="email"
                />
              </div>
              {error && (
                <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600">
                  {error}
                </p>
              )}
              {forgotMessage && (
                <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                  {forgotMessage}
                </p>
              )}
              <button type="button" className="btn-primary w-full" onClick={() => void sendReset()}>
                {t('Send reset request')}
              </button>
              <button
                type="button"
                className="w-full text-xs font-semibold text-muted hover:text-brand"
                onClick={() => {
                  setForgot(false);
                  setForgotMessage('');
                  setError('');
                }}
              >
                {t('Back to sign in')}
              </button>
            </div>
          ) : (
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
                      {t('Full name')}
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
                      {t('Phone (optional)')}
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
                  {t('Email or username')}
                </label>
                <input
                  id="login-email"
                  type="text"
                  inputMode="email"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                  className="field"
                  autoComplete="username"
                />
              </div>

              <div>
                <label htmlFor="login-password" className="mb-1.5 block text-xs font-semibold text-ink-soft">
                  {t('Password')}
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

              {needsCode && (
                <div>
                  <label htmlFor="login-code" className="mb-1.5 block text-xs font-semibold text-ink-soft">
                    {t('Verification code')}
                  </label>
                  <input
                    id="login-code"
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    className="field"
                    inputMode="numeric"
                    maxLength={6}
                    autoComplete="one-time-code"
                  />
                </div>
              )}

              {mode === 'login' && (
                <div className="flex items-center justify-between gap-2 text-xs">
                  <label className="inline-flex items-center gap-2 font-medium text-ink-soft">
                    <input
                      type="checkbox"
                      checked={form.remember}
                      onChange={(event) => setForm({ ...form, remember: event.target.checked })}
                      className="size-4 accent-brand"
                    />
                    {t('Remember me')}
                  </label>
                  <button
                    type="button"
                    className="font-semibold text-brand hover:underline"
                    onClick={() => {
                      setForgot(true);
                      setError('');
                    }}
                  >
                    {t('Forgot password')}
                  </button>
                </div>
              )}

              {error && (
                <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600">
                  {error}
                </p>
              )}

              <button type="submit" className="btn-primary w-full" disabled={busy}>
                {mode === 'login' ? <LogIn className="size-4" /> : <UserPlus className="size-4" />}
                {busy ? t('Please wait…') : mode === 'login' ? t('Sign in') : t('Create account')}
              </button>
            </form>
          )}

          {mode === 'login' && !forgot && (
            <p className="mt-5 flex items-start gap-2 rounded-2xl bg-cream px-4 py-3 text-[11px] leading-relaxed text-ink-soft">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand" />
              {t('Managers and cashiers sign in here with the account created by the administrator.')}
            </p>
          )}
        </div>

        <p className="mt-5 text-center text-xs text-muted">
          <Link to="/" className="font-semibold text-brand hover:underline">
            {t('Back to the menu')}
          </Link>
        </p>
      </div>
    </main>
  );
}
