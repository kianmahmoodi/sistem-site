import { useEffect, useState } from 'react';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { api } from '../../lib/api';
import type { Settings } from '../../lib/types';
import { useAdminT } from '../../staff/labels';
import { useToast } from '../../store/toast';
import { Card, Spinner, btn, btnGhost, field } from '../../staff/ui';

export function SettingsTab() {
  const t = useAdminT();
  const { push } = useToast();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [twoFactor, setTwoFactor] = useState<{ enabled: boolean } | null>(null);
  const [setupSecret, setSetupSecret] = useState<{ secret: string; otpauth: string } | null>(null);
  const [code, setCode] = useState('');
  const [disableForm, setDisableForm] = useState({ password: '', code: '' });
  const [passForm, setPassForm] = useState({ current: '', next: '' });

  useEffect(() => {
    api<Settings>('/api/admin/settings')
      .then(setSettings)
      .catch(() => setError(t('Could not load data.')));
    api<{ enabled: boolean }>('/api/auth/2fa')
      .then(setTwoFactor)
      .catch(() => setTwoFactor({ enabled: false }));
  }, [t]);

  const save = async () => {
    if (!settings) return;
    setBusy(true);
    setError('');
    try {
      const updated = await api<Settings>('/api/admin/settings', {
        method: 'PUT',
        body: {
          name: settings.name,
          tagline: settings.tagline,
          phone: settings.phone,
          email: settings.email,
          address: settings.address,
          hours: settings.hours,
          timezone: settings.timezone,
          deliveryFee: settings.deliveryFee,
          freeDeliveryOver: settings.freeDeliveryOver,
          taxRate: settings.taxRate,
        },
      });
      setSettings({ ...settings, ...updated });
      push(t('Saved.'), 'success');
    } catch {
      setError(t('Something went wrong.'));
    } finally {
      setBusy(false);
    }
  };

  const startSetup = async () => {
    try {
      const data = await api<{ secret: string; otpauth: string }>('/api/auth/2fa/setup', { method: 'POST' });
      setSetupSecret(data);
    } catch {
      setError(t('Something went wrong.'));
    }
  };

  const enableTwoFactor = async () => {
    try {
      await api('/api/auth/2fa/enable', { method: 'POST', body: { code } });
      setTwoFactor({ enabled: true });
      setSetupSecret(null);
      setCode('');
      push(t('Saved.'), 'success');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('Something went wrong.'));
    }
  };

  const disableTwoFactor = async () => {
    try {
      await api('/api/auth/2fa/disable', { method: 'POST', body: disableForm });
      setTwoFactor({ enabled: false });
      setDisableForm({ password: '', code: '' });
      push(t('Saved.'), 'success');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('Something went wrong.'));
    }
  };

  const changePassword = async () => {
    try {
      await api('/api/auth/password', {
        method: 'POST',
        body: { currentPassword: passForm.current, newPassword: passForm.next },
      });
      setPassForm({ current: '', next: '' });
      push(t('Saved.'), 'success');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('Something went wrong.'));
    }
  };

  if (!settings) return <Spinner label={t('Loading…')} />;

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {error && (
        <p className="rounded-xl bg-rose-500/10 px-4 py-2.5 text-sm text-rose-300 xl:col-span-2">{error}</p>
      )}

      <Card title={t('Restaurant settings')}>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-[#a4a4ae]">{t('Restaurant name')}</span>
            <input className={field} value={settings.name} onChange={(e) => setSettings({ ...settings, name: e.target.value })} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-[#a4a4ae]">{t('Tagline')}</span>
            <input className={field} value={settings.tagline} onChange={(e) => setSettings({ ...settings, tagline: e.target.value })} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-[#a4a4ae]">{t('Phone number')}</span>
            <input className={field} value={settings.phone} onChange={(e) => setSettings({ ...settings, phone: e.target.value })} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-[#a4a4ae]">{t('Email address')}</span>
            <input className={field} value={settings.email} onChange={(e) => setSettings({ ...settings, email: e.target.value })} />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-xs font-semibold text-[#a4a4ae]">{t('Address')}</span>
            <input className={field} value={settings.address} onChange={(e) => setSettings({ ...settings, address: e.target.value })} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-[#a4a4ae]">{t('Opening hours')}</span>
            <input className={field} value={settings.hours} onChange={(e) => setSettings({ ...settings, hours: e.target.value })} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-[#a4a4ae]">{t('Timezone')}</span>
            <input
              className={field}
              value={settings.timezone || ''}
              placeholder="Asia/Tehran"
              onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-[#a4a4ae]">{t('Delivery fee')}</span>
            <input
              type="number"
              step="0.1"
              className={field}
              value={settings.deliveryFee}
              onChange={(e) => setSettings({ ...settings, deliveryFee: Number(e.target.value) })}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-[#a4a4ae]">{t('Free delivery over')}</span>
            <input
              type="number"
              step="0.1"
              className={field}
              value={settings.freeDeliveryOver}
              onChange={(e) => setSettings({ ...settings, freeDeliveryOver: Number(e.target.value) })}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-[#a4a4ae]">{t('Tax rate (decimal)')}</span>
            <input
              type="number"
              step="0.01"
              className={field}
              value={settings.taxRate}
              onChange={(e) => setSettings({ ...settings, taxRate: Number(e.target.value) })}
            />
          </label>
        </div>
        <button type="button" className={`${btn} mt-4`} disabled={busy} onClick={() => void save()}>
          {busy ? t('Saving…') : t('Save')}
        </button>
      </Card>

      <div className="space-y-4">
        <Card title={t('Two-factor authentication')}>
          <div className="flex items-center gap-2">
            <ShieldCheck className={twoFactor?.enabled ? 'size-5 text-emerald-400' : 'size-5 text-[#6d6d78]'} />
            <span className="text-sm font-semibold text-white">
              {twoFactor?.enabled ? t('Enabled') : t('Disabled')}
            </span>
          </div>

          {!twoFactor?.enabled && !setupSecret && (
            <button type="button" className={`${btnGhost} mt-4`} onClick={() => void startSetup()}>
              {t('Enable 2FA')}
            </button>
          )}

          {!twoFactor?.enabled && setupSecret && (
            <div className="mt-4 space-y-3">
              <p className="text-xs text-[#a4a4ae]">{t('Scan this secret in your authenticator app, then confirm the code.')}</p>
              <code className="block break-all rounded-lg bg-black/40 px-3 py-2 text-xs text-[#ffb4a8]">
                {setupSecret.secret}
              </code>
              <div className="flex gap-2">
                <input
                  className={field}
                  inputMode="numeric"
                  maxLength={6}
                  placeholder={t('Verification code')}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
                <button type="button" className={btn} onClick={() => void enableTwoFactor()}>
                  {t('Confirm')}
                </button>
              </div>
            </div>
          )}

          {twoFactor?.enabled && (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <input
                type="password"
                className={field}
                placeholder={t('Password')}
                value={disableForm.password}
                onChange={(e) => setDisableForm({ ...disableForm, password: e.target.value })}
              />
              <input
                className={field}
                inputMode="numeric"
                maxLength={6}
                placeholder={t('Verification code')}
                value={disableForm.code}
                onChange={(e) => setDisableForm({ ...disableForm, code: e.target.value })}
              />
              <button type="button" className={btnGhost} onClick={() => void disableTwoFactor()}>
                {t('Disable 2FA')}
              </button>
            </div>
          )}
        </Card>

        <Card title={t('Change password')}>
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              type="password"
              className={field}
              placeholder={t('Current password')}
              value={passForm.current}
              onChange={(e) => setPassForm({ ...passForm, current: e.target.value })}
            />
            <input
              type="password"
              className={field}
              placeholder={t('New password')}
              value={passForm.next}
              onChange={(e) => setPassForm({ ...passForm, next: e.target.value })}
            />
            <button
              type="button"
              className={btn}
              disabled={passForm.next.length < 6 || !passForm.current}
              onClick={() => void changePassword()}
            >
              <KeyRound className="size-4" /> {t('Change password')}
            </button>
          </div>
        </Card>

      </div>
    </div>
  );
}
