import { useCallback, useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { api } from '../../lib/api';
import { formatDateTime, money } from '../../lib/format';
import { useAdminT } from '../../staff/labels';
import { useRealtime } from '../../staff/useRealtime';
import { Card, Empty, Spinner, field } from '../../staff/ui';

type Customer = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  created_at: string;
  order_count: number;
  spent: number;
};

export function CustomersTab() {
  const t = useAdminT();
  const [items, setItems] = useState<Customer[] | null>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api<{ items: Customer[] }>('/api/admin/customers')
      .then((data) => setItems(data.items))
      .catch(() => setError(t('Could not load data.')));
  }, [t]);

  useEffect(load, [load]);
  useRealtime(['orders', 'users'], load);

  if (error) return <p className="rounded-xl bg-rose-500/10 px-4 py-2.5 text-sm text-rose-300">{error}</p>;
  if (!items) return <Spinner label={t('Loading…')} />;

  const term = search.trim().toLowerCase();
  const filtered = term
    ? items.filter((item) => `${item.name} ${item.email} ${item.phone || ''}`.toLowerCase().includes(term))
    : items;

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-[#6d6d78]" />
        <input
          className={`${field} ps-9`}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t('Search')}
          aria-label={t('Search')}
        />
      </div>

      <Card>
        {filtered.length === 0 ? (
          <Empty>{t('No records found.')}</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[11px] uppercase tracking-[0.12em] text-[#7c7c87]">
                <tr>
                  <th className="px-3 py-2 text-start font-semibold">{t('Customer')}</th>
                  <th className="px-3 py-2 text-start font-semibold">{t('Phone number')}</th>
                  <th className="px-3 py-2 text-start font-semibold">{t('Total orders')}</th>
                  <th className="px-3 py-2 text-start font-semibold">{t('Total')}</th>
                  <th className="hidden px-3 py-2 text-start font-semibold sm:table-cell">{t('Created')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {filtered.map((customer) => (
                  <tr key={customer.id}>
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-[#e7e7ec]">{customer.name}</p>
                      <p className="text-[11px] text-[#6d6d78]">{customer.email}</p>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-[#a4a4ae]">{customer.phone || '—'}</td>
                    <td className="px-3 py-2.5 text-xs text-[#a4a4ae]">{customer.order_count}</td>
                    <td className="px-3 py-2.5 font-semibold text-white">{money(customer.spent)}</td>
                    <td className="hidden px-3 py-2.5 text-xs text-[#7c7c87] sm:table-cell">
                      {formatDateTime(customer.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
