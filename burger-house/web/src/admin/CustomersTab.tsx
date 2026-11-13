import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { formatDate, initials, money } from '../lib/format';
import { useToast } from '../store/toast';
import { EmptyState, Panel } from './ui';

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
  const { push } = useToast();
  const [items, setItems] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ items: Customer[] }>('/api/admin/customers')
      .then((data) => setItems(data.items))
      .catch(() => push('Could not load customers', 'error'))
      .finally(() => setLoading(false));
  }, [push]);

  return (
    <Panel title="Customers" description={`${items.length} accounts`}>
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="skeleton h-14 rounded-2xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState message="No customers yet." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-muted">
                <th className="pb-2 font-semibold">Customer</th>
                <th className="pb-2 font-semibold">Contact</th>
                <th className="pb-2 font-semibold">Joined</th>
                <th className="pb-2 font-semibold">Orders</th>
                <th className="pb-2 font-semibold">Lifetime value</th>
                <th className="pb-2 font-semibold">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {items.map((customer) => (
                <tr key={customer.id}>
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      <span className="grid size-9 place-items-center rounded-full bg-cream text-xs font-bold text-brand">
                        {initials(customer.name)}
                      </span>
                      <span className="font-semibold">{customer.name}</span>
                    </div>
                  </td>
                  <td className="py-3 text-xs text-muted">
                    <p>{customer.email}</p>
                    <p>{customer.phone || '—'}</p>
                  </td>
                  <td className="py-3 text-xs text-muted">{formatDate(customer.created_at)}</td>
                  <td className="py-3 text-xs font-medium">{customer.order_count}</td>
                  <td className="py-3 font-semibold">{money(customer.spent)}</td>
                  <td className="py-3">
                    <span
                      className={`badge ${
                        customer.role === 'admin' ? 'bg-ink text-white' : 'bg-mist text-ink-soft'
                      }`}
                    >
                      {customer.role}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
