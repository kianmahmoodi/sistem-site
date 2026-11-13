import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Sandwich,
  Settings2,
  ShieldAlert,
  Star,
  Users,
  UtensilsCrossed,
} from 'lucide-react';
import { CustomersTab } from '../admin/CustomersTab';
import { OrdersTab } from '../admin/OrdersTab';
import { OverviewTab } from '../admin/OverviewTab';
import { ProductsTab } from '../admin/ProductsTab';
import { ReviewsTab } from '../admin/ReviewsTab';
import { SettingsTab } from '../admin/SettingsTab';
import { useAuth } from '../store/auth';
import { useToast } from '../store/toast';

const tabs = [
  { key: 'overview', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'products', label: 'Products', icon: UtensilsCrossed },
  { key: 'orders', label: 'Orders', icon: ClipboardList },
  { key: 'reviews', label: 'Reviews', icon: Star },
  { key: 'customers', label: 'Customers', icon: Users },
  { key: 'settings', label: 'Settings', icon: Settings2 },
];

export function AdminPage() {
  const { user, loading, logout } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const { section } = useParams();
  const [tab, setTab] = useState(section && tabs.some((item) => item.key === section) ? section : 'overview');

  useEffect(() => {
    if (section && tabs.some((item) => item.key === section)) setTab(section);
  }, [section]);

  if (loading) {
    return (
      <main id="main" className="container-page py-16">
        <div className="skeleton mx-auto h-64 max-w-4xl rounded-4xl" />
      </main>
    );
  }

  if (!user) {
    return (
      <main id="main" className="container-page flex min-h-[70vh] items-center justify-center py-14">
        <div className="w-full max-w-md rounded-[32px] border border-line bg-white p-9 text-center shadow-card">
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-cream text-brand">
            <ShieldAlert className="size-8" />
          </span>
          <h1 className="mt-4 text-xl font-bold">Staff sign-in required</h1>
          <p className="mt-2 text-sm text-muted">
            The admin dashboard is restricted to Burger House team accounts.
          </p>
          <Link to="/login" className="btn-primary mt-6 w-full">
            Go to sign in
          </Link>
          <Link to="/" className="mt-3 block text-xs font-semibold text-muted hover:text-brand">
            Back to the website
          </Link>
        </div>
      </main>
    );
  }

  if (user.role !== 'admin') {
    return (
      <main id="main" className="container-page flex min-h-[70vh] items-center justify-center py-14">
        <div className="w-full max-w-md rounded-[32px] border border-line bg-white p-9 text-center shadow-card">
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-rose-50 text-rose-500">
            <ShieldAlert className="size-8" />
          </span>
          <h1 className="mt-4 text-xl font-bold">Access denied</h1>
          <p className="mt-2 text-sm text-muted">
            You are signed in as a customer. Ask a manager to upgrade your account to administrator.
          </p>
          <Link to="/account" className="btn-primary mt-6 w-full">
            Go to my account
          </Link>
        </div>
      </main>
    );
  }

  const select = (key: string) => {
    setTab(key);
    navigate(`/admin/${key}`, { replace: true });
  };

  return (
    <main id="main" className="min-h-screen bg-mist/60">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-full bg-brand text-white">
              <Sandwich className="size-5" strokeWidth={1.9} />
            </span>
            <div>
              <p className="text-sm font-bold leading-tight">Burger House</p>
              <p className="text-[11px] text-muted">Admin dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/" className="btn-ghost py-2 text-xs">
              View store
            </Link>
            <span className="hidden rounded-full bg-cream px-3 py-2 text-xs font-semibold text-brand sm:inline">
              {user.name}
            </span>
            <button
              type="button"
              onClick={async () => {
                await logout();
                push('Signed out', 'info');
                navigate('/');
              }}
              aria-label="Sign out"
              className="grid size-9 place-items-center rounded-full border border-line text-ink-soft transition hover:border-rose-200 hover:text-rose-600"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1320px] px-4 py-6 sm:px-6">
        <div className="grid gap-5 lg:grid-cols-[220px_1fr] lg:items-start">
          <nav aria-label="Admin sections" className="lg:sticky lg:top-6">
            <ul className="flex gap-1.5 overflow-x-auto no-scrollbar rounded-2xl bg-white p-1.5 shadow-card lg:flex-col lg:overflow-visible">
              {tabs.map((item) => (
                <li key={item.key}>
                  <button
                    type="button"
                    onClick={() => select(item.key)}
                    aria-current={tab === item.key ? 'page' : undefined}
                    className={`flex w-full shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                      tab === item.key ? 'bg-brand text-white shadow-sm' : 'text-ink-soft hover:bg-cream'
                    }`}
                  >
                    <item.icon className="size-4" />
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            {tab === 'overview' && <OverviewTab />}
            {tab === 'products' && <ProductsTab />}
            {tab === 'orders' && <OrdersTab />}
            {tab === 'reviews' && <ReviewsTab />}
            {tab === 'customers' && <CustomersTab />}
            {tab === 'settings' && <SettingsTab />}
          </div>
        </div>
      </div>
    </main>
  );
}
