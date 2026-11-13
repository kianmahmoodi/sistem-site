import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, PackageSearch, ShieldCheck, UserRound } from 'lucide-react';
import { api } from '../lib/api';
import { formatDateTime, money } from '../lib/format';
import type { Order } from '../lib/types';
import { redirectForRole, useAuth } from '../store/auth';
import { usePrefs } from '../store/prefs';
import { useToast } from '../store/toast';

const ROLE_NAMES: Record<string, string> = {
  super_admin: 'Super Admin',
  manager: 'Manager',
  cashier: 'Cashier',
  customer: 'Customer',
};

export function AccountPage() {
  const { user, loading, logout } = useAuth();
  const { push } = useToast();
  const { t } = usePrefs();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (!user) return;
    setFetching(true);
    api<{ orders: Order[] }>('/api/orders/mine')
      .then((data) => setOrders(data.orders))
      .catch(() => push(t('Could not load your orders'), 'error'))
      .finally(() => setFetching(false));
  }, [user, push, t]);

  if (loading) {
    return (
      <main id="main" className="container-page py-20">
        <div className="skeleton mx-auto h-40 max-w-2xl rounded-4xl" />
      </main>
    );
  }

  if (!user) {
    return (
      <main id="main" className="container-page flex min-h-[60vh] items-center justify-center py-14">
        <div className="w-full max-w-md rounded-[32px] border border-line bg-white p-9 text-center shadow-card">
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-cream text-brand">
            <UserRound className="size-8" />
          </span>
          <h1 className="mt-4 text-xl font-bold">{t('Sign in to see your orders')}</h1>
          <p className="mt-2 text-sm text-muted">{t('Your order history and delivery details live in your account.')}</p>
          <Link to="/login" className="btn-primary mt-6 w-full">
            {t('Sign in')}
          </Link>
        </div>
      </main>
    );
  }

  const staff = ['super_admin', 'manager', 'cashier'].includes(user.role);

  return (
    <main id="main" className="container-page py-10 sm:py-14">
      <div className="mx-auto max-w-3xl space-y-5">
        <section className="surface-card flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="grid size-14 place-items-center rounded-full bg-brand text-lg font-bold text-white">
              {user.name.slice(0, 1).toUpperCase()}
            </span>
            <div>
              <h1 className="text-xl font-bold leading-tight">{user.name}</h1>
              <p className="text-sm text-muted">{user.email}</p>
              <span className="badge mt-1.5 bg-cream text-brand">{ROLE_NAMES[user.role] || user.role}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {staff && (
              <Link to={redirectForRole(user.role)} className="btn-ghost py-2.5 text-xs">
                <ShieldCheck className="size-4" /> {t('Staff panel')}
              </Link>
            )}
            <button
              type="button"
              className="btn-ghost py-2.5 text-xs"
              onClick={async () => {
                await logout();
                push(t('Signed out'), 'info');
                navigate('/');
              }}
            >
              <LogOut className="size-4" /> {t('Sign out')}
            </button>
          </div>
        </section>

        <section className="surface-card p-6 sm:p-8">
          <h2 className="text-lg font-bold">{t('My orders')}</h2>
          <p className="mt-1 text-sm text-muted">{t('Track every burger you have ordered from us.')}</p>

          {fetching ? (
            <div className="mt-5 space-y-3">
              <div className="skeleton h-16 w-full rounded-2xl" />
              <div className="skeleton h-16 w-full rounded-2xl" />
            </div>
          ) : orders.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-dashed border-line px-6 py-12 text-center">
              <PackageSearch className="mx-auto size-8 text-muted" />
              <p className="mt-3 font-semibold">{t('No orders yet')}</p>
              <p className="mt-1 text-sm text-muted">{t('Your first Burger House order is one click away.')}</p>
              <Link to="/" className="btn-primary mt-5">
                {t('Browse the menu')}
              </Link>
            </div>
          ) : (
            <ul className="mt-5 space-y-3">
              {orders.map((order) => (
                <li key={order.id}>
                  <Link
                    to={`/order/${order.orderNumber}`}
                    className="flex flex-col gap-2 rounded-2xl border border-line p-4 transition hover:border-brand/40 hover:bg-cream/40 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm font-semibold">{order.orderNumber}</p>
                      <p className="text-xs text-muted">
                        {formatDateTime(order.createdAt)} · {order.items.length} {t('Items')}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="badge border border-line bg-mist text-ink-soft">{order.statusLabel}</span>
                      <span className="text-sm font-bold text-brand">{money(order.total)}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
