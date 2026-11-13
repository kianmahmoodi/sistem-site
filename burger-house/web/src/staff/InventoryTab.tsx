import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, ArrowDownUp, Plus } from 'lucide-react';
import { api } from '../lib/api';
import { formatDateTime } from '../lib/format';
import type { InventoryItem, InventoryLog } from '../lib/types';
import { useAdminT } from './labels';
import { useRealtime } from './useRealtime';
import { Card, Empty, Modal, Spinner, btn, btnGhost, cx, field } from './ui';

export function InventoryTab() {
  const t = useAdminT();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [adjusting, setAdjusting] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState({ name: '', unit: 'pcs', quantity: '', threshold: '' });
  const [adjustForm, setAdjustForm] = useState({ change: '', note: '' });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api<{ items: InventoryItem[]; logs: InventoryLog[] }>('/api/staff/inventory');
      setItems(data.items);
      setLogs(data.logs);
      setError('');
    } catch {
      setError(t('Could not load data.'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);
  useRealtime(['inventory'], () => void load());

  const create = async () => {
    setBusy(true);
    try {
      await api('/api/staff/inventory', {
        method: 'POST',
        body: {
          name: form.name,
          unit: form.unit,
          quantity: Number(form.quantity) || 0,
          threshold: Number(form.threshold) || 0,
        },
      });
      setCreating(false);
      setForm({ name: '', unit: 'pcs', quantity: '', threshold: '' });
      await load();
    } catch {
      setError(t('Something went wrong.'));
    } finally {
      setBusy(false);
    }
  };

  const adjust = async () => {
    if (!adjusting) return;
    setBusy(true);
    try {
      await api(`/api/staff/inventory/${adjusting.id}/adjust`, {
        method: 'POST',
        body: { change: Number(adjustForm.change), note: adjustForm.note },
      });
      setAdjusting(null);
      setAdjustForm({ change: '', note: '' });
      await load();
    } catch {
      setError(t('Something went wrong.'));
    } finally {
      setBusy(false);
    }
  };

  const lowCount = items.filter((item) => item.quantity <= item.threshold).length;

  if (loading) return <Spinner label={t('Loading…')} />;

  return (
    <div className="space-y-4">
      {error && <p className="rounded-xl bg-rose-500/10 px-4 py-2.5 text-sm text-rose-300">{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="inline-flex items-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3.5 py-2 text-xs font-semibold text-amber-300">
          <AlertTriangle className="size-4" /> {t('Low stock')}: {lowCount}
        </p>
        <button type="button" className={btn} onClick={() => setCreating(true)}>
          <Plus className="size-4" /> {t('Add item')}
        </button>
      </div>

      <Card>
        {items.length === 0 ? (
          <Empty>{t('No records found.')}</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[11px] uppercase tracking-[0.12em] text-[#7c7c87]">
                <tr>
                  <th className="px-3 py-2 text-start font-semibold">{t('Name')}</th>
                  <th className="px-3 py-2 text-start font-semibold">{t('Quantity')}</th>
                  <th className="px-3 py-2 text-start font-semibold">{t('Threshold')}</th>
                  <th className="hidden px-3 py-2 text-start font-semibold sm:table-cell">{t('Last updated')}</th>
                  <th className="px-3 py-2 text-end font-semibold">{t('Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-3 py-3 font-medium text-[#e7e7ec]">
                      {item.name}
                      <span className="ms-2 text-[11px] text-[#6d6d78]">{item.unit}</span>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={cx(
                          'font-bold',
                          item.quantity <= item.threshold ? 'text-rose-300' : 'text-white'
                        )}
                      >
                        {item.quantity}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-[#a4a4ae]">{item.threshold}</td>
                    <td className="hidden px-3 py-3 text-xs text-[#7c7c87] sm:table-cell">
                      {formatDateTime(item.updated_at)}
                    </td>
                    <td className="px-3 py-3 text-end">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-semibold text-[#c9c9d2] transition hover:border-[#e8412f]/50 hover:text-white"
                        onClick={() => {
                          setAdjusting(item);
                          setAdjustForm({ change: '', note: '' });
                        }}
                      >
                        <ArrowDownUp className="size-3.5" /> {t('Adjust')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title={t('Stock history')}>
        {logs.length === 0 ? (
          <Empty>{t('No records found.')}</Empty>
        ) : (
          <ul className="divide-y divide-white/[0.06]">
            {logs.map((log) => (
              <li key={log.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                <div>
                  <p className="font-medium text-[#e7e7ec]">{log.item_name}</p>
                  <p className="text-xs text-[#7c7c87]">
                    {log.note} · {log.user_name || '—'} · {formatDateTime(log.created_at)}
                  </p>
                </div>
                <span
                  className={cx(
                    'rounded-full px-2.5 py-1 text-xs font-bold',
                    log.change >= 0 ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'
                  )}
                >
                  {log.change > 0 ? '+' : ''}
                  {log.change} → {log.quantity_after}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {creating && (
        <Modal title={t('New item')} onClose={() => setCreating(false)}>
          <div className="space-y-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-[#a4a4ae]">{t('Name')}</span>
              <input className={field} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <div className="grid grid-cols-3 gap-3">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-[#a4a4ae]">{t('Unit')}</span>
                <input className={field} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-[#a4a4ae]">{t('Quantity')}</span>
                <input
                  type="number"
                  className={field}
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-[#a4a4ae]">{t('Threshold')}</span>
                <input
                  type="number"
                  className={field}
                  value={form.threshold}
                  onChange={(e) => setForm({ ...form, threshold: e.target.value })}
                />
              </label>
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" className={btnGhost} onClick={() => setCreating(false)}>
              {t('Cancel')}
            </button>
            <button type="button" className={btn} disabled={busy || form.name.trim().length < 2} onClick={() => void create()}>
              {t('Add')}
            </button>
          </div>
        </Modal>
      )}

      {adjusting && (
        <Modal title={`${t('Adjust')} · ${adjusting.name}`} onClose={() => setAdjusting(null)}>
          <p className="text-sm text-[#a4a4ae]">
            {t('Quantity')}: <span className="font-bold text-white">{adjusting.quantity}</span> {adjusting.unit}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-[#a4a4ae]">{t('Quantity')} (+/−)</span>
              <input
                type="number"
                className={field}
                value={adjustForm.change}
                onChange={(e) => setAdjustForm({ ...adjustForm, change: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-[#a4a4ae]">{t('Note')}</span>
              <input
                className={field}
                value={adjustForm.note}
                onChange={(e) => setAdjustForm({ ...adjustForm, note: e.target.value })}
              />
            </label>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" className={btnGhost} onClick={() => setAdjusting(null)}>
              {t('Cancel')}
            </button>
            <button
              type="button"
              className={btn}
              disabled={busy || !Number(adjustForm.change)}
              onClick={() => void adjust()}
            >
              {t('Save')}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
