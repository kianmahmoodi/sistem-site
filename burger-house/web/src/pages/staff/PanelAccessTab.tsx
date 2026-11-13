import { useCallback, useEffect, useState } from 'react';
import { CalendarClock, LockKeyhole, LockKeyholeOpen, Plus, ShieldAlert, Trash2, Zap } from 'lucide-react';
import { api } from '../../lib/api';
import { formatDateTime } from '../../lib/format';
import type { PanelSchedule, PanelState } from '../../lib/types';
import { useAdminT } from '../../staff/labels';
import { usePrefs } from '../../store/prefs';
import { useRealtime } from '../../staff/useRealtime';
import { Card, Pill, Spinner, btn, btnDanger, btnGhost, cx, field } from '../../staff/ui';

const DAY_LABELS = {
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  fa: ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'],
};

type Payload = { schedules: PanelSchedule[]; states: Record<'manager' | 'cashier', PanelState> };

export function PanelAccessTab() {
  const t = useAdminT();
  const { lang } = usePrefs();
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api<Payload>('/api/super/panels')
      .then((result) => {
        setData(result);
        setError('');
      })
      .catch(() => setError(t('Could not load data.')));
  }, [t]);

  useEffect(load, [load]);
  useEffect(() => {
    const timer = window.setInterval(load, 20000);
    return () => window.clearInterval(timer);
  }, [load]);
  useRealtime(['panel'], load);

  const globalAction = async (action: string) => {
    try {
      await api('/api/super/panels/action', { method: 'POST', body: { action } });
      load();
    } catch {
      setError(t('Something went wrong.'));
    }
  };

  if (error) return <p className="rounded-xl bg-rose-500/10 px-4 py-2.5 text-sm text-rose-300">{error}</p>;
  if (!data) return <Spinner label={t('Loading…')} />;

  return (
    <div className="space-y-4">
      <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs text-[#a4a4ae]">
        {t('Manual states override the schedule until they expire.')}
      </p>

      <div className="flex flex-wrap gap-2">
        <button type="button" className={btnGhost} onClick={() => void globalAction('unlock_all')}>
          <LockKeyholeOpen className="size-4" /> {t('Unlock all')}
        </button>
        <button type="button" className={btnGhost} onClick={() => void globalAction('lock_all')}>
          <LockKeyhole className="size-4" /> {t('Lock all')}
        </button>
        <button type="button" className={btnDanger} onClick={() => void globalAction('emergency')}>
          <Zap className="size-4" /> {t('Emergency lock')}
        </button>
        <button type="button" className={btn} onClick={() => void globalAction('auto')}>
          <CalendarClock className="size-4" /> {t('Back to automatic')}
        </button>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {(['manager', 'cashier'] as const).map((panel) => (
          <PanelCard
            key={panel}
            schedule={data.schedules.find((row) => row.panel_name === panel)}
            state={data.states[panel]}
            lang={lang}
            onChanged={load}
            onError={setError}
          />
        ))}
      </div>
    </div>
  );
}

function PanelCard({
  schedule,
  state,
  lang,
  onChanged,
  onError,
}: {
  schedule?: PanelSchedule;
  state: PanelState;
  lang: 'en' | 'fa' | 'de' | 'fr' | 'it';
  onChanged: () => void;
  onError: (message: string) => void;
}) {
  const t = useAdminT();
  const [form, setForm] = useState(() => ({
    isEnabled: schedule?.is_enabled ?? true,
    scheduleEnabled: schedule?.schedule_enabled ?? false,
    timezone: schedule?.timezone || state.timezone,
    windows: (schedule?.windows?.length ? schedule.windows : [{ days: [0, 1, 2, 3, 4, 5, 6], start: '08:00', end: '23:00' }]).map(
      (window) => ({ ...window, days: [...window.days] })
    ),
  }));
  const [minutes, setMinutes] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!schedule) return;
    setForm({
      isEnabled: schedule.is_enabled,
      scheduleEnabled: schedule.schedule_enabled,
      timezone: schedule.timezone || state.timezone,
      windows: (schedule.windows?.length ? schedule.windows : [{ days: [0, 1, 2, 3, 4, 5, 6], start: '08:00', end: '23:00' }]).map(
        (window) => ({ ...window, days: [...window.days] })
      ),
    });
  }, [schedule, state.timezone]);

  const panelLabel = t(state.panel === 'manager' ? 'Manager panel' : 'Cashier panel');

  const setMode = async (mode: string) => {
    setBusy(true);
    try {
      await api(`/api/super/panels/${state.panel}/mode`, {
        method: 'POST',
        body: { mode, minutes: Number(minutes) || undefined, reason },
      });
      setReason('');
      onChanged();
    } catch {
      onError(t('Something went wrong.'));
    } finally {
      setBusy(false);
    }
  };

  const saveSchedule = async () => {
    setBusy(true);
    try {
      await api(`/api/super/panels/${state.panel}/schedule`, {
        method: 'PUT',
        body: {
          isEnabled: form.isEnabled,
          scheduleEnabled: form.scheduleEnabled,
          timezone: form.timezone,
          windows: form.windows,
        },
      });
      onChanged();
    } catch {
      onError(t('Something went wrong.'));
    } finally {
      setBusy(false);
    }
  };

  const days = DAY_LABELS[lang === 'fa' ? 'fa' : 'en'];

  return (
    <Card
      title={panelLabel}
      action={
        <div className="flex items-center gap-2">
          <Pill status={state.locked ? 'cancelled' : 'active'} label={state.locked ? t('Closed now') : t('Open now')} />
          <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] uppercase tracking-wide text-[#7c7c87]">
            {state.mode}
          </span>
        </div>
      }
    >
      <dl className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl bg-black/20 p-3">
          <dt className="text-[10px] uppercase tracking-wide text-[#6d6d78]">{t('Panel status')}</dt>
          <dd className="mt-1 font-semibold text-[#e7e7ec]">
            {state.locked ? state.reason || t('Closed now') : t('Open now')}
          </dd>
        </div>
        <div className="rounded-xl bg-black/20 p-3">
          <dt className="text-[10px] uppercase tracking-wide text-[#6d6d78]">
            {state.locked ? t('Opens at') : t('Panel hours')}
          </dt>
          <dd className="mt-1 font-semibold text-[#e7e7ec]">
            {state.locked
              ? state.opensAt
                ? new Date(state.opensAt).toLocaleString(lang === 'fa' ? 'fa-IR' : 'en-US', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                    timeZone: state.timezone,
                  })
                : '—'
              : state.hours || '—'}
          </dd>
        </div>
      </dl>

      <div className="mt-4 space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7c7c87]">{t('Manual override')}</p>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" className={btnGhost} disabled={busy} onClick={() => void setMode('auto')}>
            {t('Automatic')}
          </button>
          <button type="button" className={btnGhost} disabled={busy} onClick={() => void setMode('unlocked')}>
            {t('Unlock panel')}
          </button>
          <button type="button" className={btnGhost} disabled={busy} onClick={() => void setMode('locked')}>
            {t('Lock panel')}
          </button>
          <button type="button" className={btnDanger} disabled={busy} onClick={() => void setMode('emergency')}>
            {t('Emergency lock')}
          </button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            className={field}
            type="number"
            min="0"
            placeholder={t('Duration (minutes, optional)')}
            value={minutes}
            onChange={(event) => setMinutes(event.target.value)}
          />
          <input
            className={field}
            placeholder={t('Reason')}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </div>
      </div>

      <div className="mt-5 space-y-3 border-t border-white/[0.07] pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7c7c87]">
            <CalendarClock className="size-4" /> {t('Schedule')}
          </p>
          <label className="inline-flex items-center gap-2 text-xs text-[#c9c9d2]">
            <input
              type="checkbox"
              checked={form.scheduleEnabled}
              onChange={(event) => setForm({ ...form, scheduleEnabled: event.target.checked })}
              className="size-4 accent-[#e8412f]"
            />
            {t('Schedule enabled')}
          </label>
        </div>

        {form.windows.map((window, index) => (
          <div key={index} className="rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="time"
                className={`${field} w-auto`}
                value={window.start}
                onChange={(event) => {
                  const windows = [...form.windows];
                  windows[index] = { ...window, start: event.target.value };
                  setForm({ ...form, windows });
                }}
                aria-label={t('Unlock time')}
              />
              <span className="text-xs text-[#6d6d78]">→</span>
              <input
                type="time"
                className={`${field} w-auto`}
                value={window.end}
                onChange={(event) => {
                  const windows = [...form.windows];
                  windows[index] = { ...window, end: event.target.value };
                  setForm({ ...form, windows });
                }}
                aria-label={t('Lock time')}
              />
              <button
                type="button"
                aria-label={t('Delete')}
                className="ms-auto grid size-8 place-items-center rounded-lg border border-rose-500/30 text-rose-300"
                onClick={() => setForm({ ...form, windows: form.windows.filter((_, i) => i !== index) })}
              >
                <Trash2 className="size-4" />
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {days.map((day, dayIndex) => {
                const selected = window.days.includes(dayIndex);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => {
                      const windows = [...form.windows];
                      windows[index] = {
                        ...window,
                        days: selected ? window.days.filter((value) => value !== dayIndex) : [...window.days, dayIndex],
                      };
                      setForm({ ...form, windows });
                    }}
                    className={cx(
                      'rounded-lg px-2 py-1 text-[11px] font-semibold transition',
                      selected ? 'bg-[#e8412f] text-white' : 'bg-white/[0.06] text-[#8b8b96] hover:text-white'
                    )}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#ff8a77] hover:text-white"
          onClick={() =>
            setForm({
              ...form,
              windows: [...form.windows, { days: [0, 1, 2, 3, 4, 5, 6], start: '12:00', end: '16:00' }],
            })
          }
        >
          <Plus className="size-3.5" /> {t('Add window')}
        </button>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-[#a4a4ae]">{t('Timezone')}</span>
          <input
            className={field}
            value={form.timezone}
            onChange={(event) => setForm({ ...form, timezone: event.target.value })}
            placeholder="Asia/Tehran"
          />
        </label>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="inline-flex items-center gap-2 text-xs text-[#c9c9d2]">
            <input
              type="checkbox"
              checked={form.isEnabled}
              onChange={(event) => setForm({ ...form, isEnabled: event.target.checked })}
              className="size-4 accent-[#e8412f]"
            />
            {t('Active')}
          </label>
          <button type="button" className={btn} disabled={busy} onClick={() => void saveSchedule()}>
            {t('Save schedule')}
          </button>
        </div>
        <p className="text-[10px] text-[#5f5f69]">
          {t('Last updated')}: {state.updatedAt ? formatDateTime(state.updatedAt) : '—'}
        </p>
      </div>

      {state.mode === 'emergency' && (
        <p className="mt-3 inline-flex items-center gap-2 rounded-lg bg-rose-500/10 px-3 py-2 text-[11px] font-semibold text-rose-300">
          <ShieldAlert className="size-3.5" /> {t('Emergency lock')}
        </p>
      )}
    </Card>
  );
}
