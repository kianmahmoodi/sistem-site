import { useCallback, useEffect, useState } from 'react';
import { History, Pencil, Plus, Search, ShieldCheck, Trash2 } from 'lucide-react';
import { api } from '../../lib/api';
import { formatDateTime } from '../../lib/format';
import type { ActivityLog, User } from '../../lib/types';
import { useAdminT } from '../../staff/labels';
import { useRealtime } from '../../staff/useRealtime';
import { Card, Empty, Modal, Pill, Spinner, btn, btnDanger, btnGhost, cx, field } from '../../staff/ui';

const ROLE_LABEL: Record<string, string> = {
  super_admin: 'Super Admin',
  manager: 'Manager',
  cashier: 'Cashier',
  customer: 'Customer',
};

type FormState = {
  name: string;
  email: string;
  username: string;
  phone: string;
  password: string;
  role: string;
  status: string;
};

const EMPTY_FORM: FormState = {
  name: '',
  email: '',
  username: '',
  phone: '',
  password: '',
  role: 'cashier',
  status: 'active',
};

export function UsersTab() {
  const t = useAdminT();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState('all');
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<User | null>(null);
  const [history, setHistory] = useState<{ user: User; logs: ActivityLog[] } | null>(null);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (role !== 'all') params.set('role', role);
      if (status !== 'all') params.set('status', status);
      if (term) params.set('q', term);
      const data = await api<{ items: User[] }>(`/api/super/users?${params.toString()}`);
      setUsers(data.items);
      setError('');
    } catch {
      setError(t('Could not load data.'));
    } finally {
      setLoading(false);
    }
  }, [role, status, term, t]);

  useEffect(() => {
    void load();
  }, [load]);
  useRealtime(['users'], () => void load());

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setCreating(true);
  };

  const openEdit = (user: User) => {
    setForm({
      name: user.name,
      email: user.email,
      username: user.username || '',
      phone: user.phone || '',
      password: '',
      role: user.role,
      status: user.status || 'active',
    });
    setEditing(user);
  };

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      if (creating) {
        await api('/api/super/users', {
          method: 'POST',
          body: { ...form, password: form.password },
        });
        setCreating(false);
      } else if (editing) {
        const body: Record<string, unknown> = {
          name: form.name,
          email: form.email,
          username: form.username,
          phone: form.phone,
          role: form.role,
          status: form.status,
        };
        if (form.password) body.password = form.password;
        await api(`/api/super/users/${editing.id}`, { method: 'PATCH', body });
        setEditing(null);
      }
      await load();
    } catch (error) {
      const message = error instanceof Error ? error.message : t('Something went wrong.');
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  const quickStatus = async (user: User, next: string) => {
    try {
      await api(`/api/super/users/${user.id}`, { method: 'PATCH', body: { status: next } });
      await load();
    } catch {
      setError(t('Something went wrong.'));
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await api(`/api/super/users/${deleting.id}`, { method: 'DELETE' });
      setDeleting(null);
      await load();
    } catch {
      setError(t('Something went wrong.'));
    } finally {
      setBusy(false);
    }
  };

  const openHistory = async (user: User) => {
    try {
      const data = await api<{ items: ActivityLog[] }>(`/api/super/users/${user.id}/activity`);
      setHistory({ user, logs: data.items });
    } catch {
      setError(t('Could not load data.'));
    }
  };

  const formFields = (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold text-[#a4a4ae]">{t('Name')}</span>
        <input className={field} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold text-[#a4a4ae]">{t('Email')}</span>
        <input type="email" className={field} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold text-[#a4a4ae]">{t('Username')}</span>
        <input className={field} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold text-[#a4a4ae]">{t('Phone number')}</span>
        <input className={field} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold text-[#a4a4ae]">{t('Password')}</span>
        <input
          type="password"
          className={field}
          value={form.password}
          placeholder={creating ? '' : t('Leave blank to keep the current password.')}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold text-[#a4a4ae]">{t('Role')}</span>
        <select className={field} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
          {creating ? (
            <>
              <option value="manager">{t('Manager')}</option>
              <option value="cashier">{t('Cashier')}</option>
            </>
          ) : (
            <>
              <option value="super_admin" disabled>
                {t('Super Admin')}
              </option>
              <option value="manager">{t('Manager')}</option>
              <option value="cashier">{t('Cashier')}</option>
              <option value="customer">{t('Customer')}</option>
            </>
          )}
        </select>
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold text-[#a4a4ae]">{t('Account status')}</span>
        <select className={field} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
          <option value="active">{t('Active')}</option>
          <option value="disabled">{t('Disabled')}</option>
          <option value="locked">{t('Locked')}</option>
        </select>
      </label>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-[#6d6d78]" />
            <input
              className={`${field} ps-9`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && setTerm(search.trim())}
              placeholder={t('Search')}
              aria-label={t('Search')}
            />
          </div>
          <select className={`${field} w-auto`} value={role} onChange={(e) => setRole(e.target.value)} aria-label={t('Filter by role')}>
            <option value="all">{t('Any role')}</option>
            <option value="super_admin">{t('Super Admin')}</option>
            <option value="manager">{t('Manager')}</option>
            <option value="cashier">{t('Cashier')}</option>
          </select>
          <select className={`${field} w-auto`} value={status} onChange={(e) => setStatus(e.target.value)} aria-label={t('Filter by status')}>
            <option value="all">{t('Any status')}</option>
            <option value="active">{t('Active')}</option>
            <option value="disabled">{t('Disabled')}</option>
            <option value="locked">{t('Locked')}</option>
          </select>
        </div>
        <button type="button" className={btn} onClick={openCreate}>
          <Plus className="size-4" /> {t('New account')}
        </button>
      </div>

      <p className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs text-[#a4a4ae]">
        <ShieldCheck className="size-4 text-[#e8412f]" /> {t('Only the super administrator can create or change staff accounts.')}
      </p>

      {error && <p className="rounded-xl bg-rose-500/10 px-4 py-2.5 text-sm text-rose-300">{error}</p>}

      {loading ? (
        <Spinner label={t('Loading…')} />
      ) : (
        <Card>
          {users.length === 0 ? (
            <Empty>{t('No records found.')}</Empty>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-[11px] uppercase tracking-[0.12em] text-[#7c7c87]">
                  <tr>
                    <th className="px-3 py-2 text-start font-semibold">{t('Name')}</th>
                    <th className="px-3 py-2 text-start font-semibold">{t('Email')}</th>
                    <th className="hidden px-3 py-2 text-start font-semibold md:table-cell">{t('Phone number')}</th>
                    <th className="px-3 py-2 text-start font-semibold">{t('Role')}</th>
                    <th className="px-3 py-2 text-start font-semibold">{t('Status')}</th>
                    <th className="hidden px-3 py-2 text-start font-semibold lg:table-cell">{t('Last login')}</th>
                    <th className="px-3 py-2 text-end font-semibold">{t('Actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-3 py-3">
                        <p className="font-semibold text-[#e7e7ec]">{user.name}</p>
                        {user.username && <p className="text-[11px] text-[#6d6d78]">@{user.username}</p>}
                      </td>
                      <td className="px-3 py-3 text-xs text-[#a4a4ae]">{user.email}</td>
                      <td className="hidden px-3 py-3 text-xs text-[#a4a4ae] md:table-cell">{user.phone || '—'}</td>
                      <td className="px-3 py-3">
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-semibold text-[#c9c9d2]">
                          {t(ROLE_LABEL[user.role] || user.role)}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <Pill status={user.status || 'active'} label={t(user.status === 'disabled' ? 'Disabled' : user.status === 'locked' ? 'Locked' : 'Active')} />
                      </td>
                      <td className="hidden px-3 py-3 text-xs text-[#7c7c87] lg:table-cell">
                        {user.last_login_at ? formatDateTime(user.last_login_at) : '—'}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => void openHistory(user)}
                            aria-label={t('Activity history')}
                            className="grid size-8 place-items-center rounded-lg border border-white/10 text-[#a4a4ae] transition hover:border-white/30 hover:text-white"
                          >
                            <History className="size-4" />
                          </button>
                          {user.role !== 'super_admin' && (
                            <>
                              <button
                                type="button"
                                onClick={() => openEdit(user)}
                                aria-label={t('Edit')}
                                className="grid size-8 place-items-center rounded-lg border border-white/10 text-[#a4a4ae] transition hover:border-white/30 hover:text-white"
                              >
                                <Pencil className="size-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => void quickStatus(user, user.status === 'active' ? 'disabled' : 'active')}
                                className={cx(
                                  'rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition',
                                  user.status === 'active'
                                    ? 'border-rose-500/30 text-rose-300 hover:bg-rose-500/10'
                                    : 'border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10'
                                )}
                              >
                                {user.status === 'active' ? t('Disabled') : t('Active')}
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleting(user)}
                                aria-label={t('Delete')}
                                className="grid size-8 place-items-center rounded-lg border border-rose-500/30 text-rose-300 transition hover:bg-rose-500/15"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {(creating || editing) && (
        <Modal
          title={creating ? t('New account') : t('Edit account')}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          wide
        >
          {formFields}
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              className={btnGhost}
              onClick={() => {
                setCreating(false);
                setEditing(null);
              }}
            >
              {t('Cancel')}
            </button>
            <button
              type="button"
              className={btn}
              disabled={busy || form.name.trim().length < 2 || !form.email.includes('@') || (creating && form.password.length < 6)}
              onClick={() => void submit()}
            >
              {creating ? t('Create') : t('Save')}
            </button>
          </div>
        </Modal>
      )}

      {deleting && (
        <Modal title={t('Delete this account?')} onClose={() => setDeleting(null)}>
          <p className="text-sm text-[#a4a4ae]">
            {deleting.name} · {deleting.email}
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" className={btnGhost} onClick={() => setDeleting(null)}>
              {t('Cancel')}
            </button>
            <button type="button" className={btnDanger} disabled={busy} onClick={() => void remove()}>
              {t('Delete')}
            </button>
          </div>
        </Modal>
      )}

      {history && (
        <Modal title={`${t('Activity history')} · ${history.user.name}`} onClose={() => setHistory(null)} wide>
          {history.logs.length === 0 ? (
            <Empty>{t('No activity yet.')}</Empty>
          ) : (
            <ul className="divide-y divide-white/[0.06]">
              {history.logs.map((log) => (
                <li key={log.id} className="py-2.5 text-sm">
                  <p className="text-[#e7e7ec]">{log.detail}</p>
                  <p className="text-[11px] text-[#6d6d78]">
                    {log.action} · {formatDateTime(log.created_at)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Modal>
      )}
    </div>
  );
}
