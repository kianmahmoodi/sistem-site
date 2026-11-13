import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Activity,
  ClipboardList,
  LayoutDashboard,
  LockKeyhole,
  Settings2,
  Star,
  Users,
  UtensilsCrossed,
  Warehouse,
  UserRoundCheck,
  ChartColumn,
} from 'lucide-react';
import { StaffGate } from '../staff/StaffGate';
import { StaffShell } from '../staff/Shell';
import type { StaffNavItem } from '../staff/Shell';
import { useAdminT } from '../staff/labels';
import { SuperOverview } from './staff/SuperOverview';
import { OrdersBoard } from '../staff/OrdersBoard';
import { ProductsTab } from './staff/ProductsTab';
import { InventoryTab } from '../staff/InventoryTab';
import { UsersTab } from './staff/UsersTab';
import { PanelAccessTab } from './staff/PanelAccessTab';
import { ReportsTab } from '../staff/ReportsTab';
import { ActivityTab } from './staff/ActivityTab';
import { SettingsTab } from './staff/SettingsTab';
import { ReviewsTab } from './staff/ReviewsTab';
import { CustomersTab } from './staff/CustomersTab';

const NAV: StaffNavItem[] = [
  { key: 'overview', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'orders', label: 'Orders', icon: ClipboardList },
  { key: 'products', label: 'Products', icon: UtensilsCrossed },
  { key: 'inventory', label: 'Inventory', icon: Warehouse },
  { key: 'customers', label: 'Customer', icon: UserRoundCheck },
  { key: 'reviews', label: 'Reviews', icon: Star },
  { key: 'users', label: 'Users & Roles', icon: Users },
  { key: 'panels', label: 'Panel Access', icon: LockKeyhole },
  { key: 'reports', label: 'Reports', icon: ChartColumn },
  { key: 'activity', label: 'Activity Logs', icon: Activity },
  { key: 'settings', label: 'Settings', icon: Settings2 },
];

export function SuperAdminPage() {
  const t = useAdminT();
  const { section } = useParams();
  const navigate = useNavigate();
  const [active, setActive] = useState(() =>
    NAV.some((item) => item.key === section) ? (section as string) : 'overview'
  );

  useEffect(() => {
    if (section && NAV.some((item) => item.key === section)) setActive(section);
  }, [section]);

  const select = (key: string) => {
    setActive(key);
    navigate(`/admin/${key}`, { replace: true });
  };

  const label = NAV.find((item) => item.key === active)?.label || 'Dashboard';

  return (
    <StaffGate allow={['super_admin']}>
      {(session) => (
        <StaffShell
          user={session.user}
          roleLabel="Super Admin"
          nav={NAV}
          active={active}
          onSelect={select}
          title={t(label)}
          subtitle={t('All panels')}
        >
          {active === 'overview' && <SuperOverview />}
          {active === 'orders' && <OrdersBoard endpoint="/api/staff/orders" canCancel canAdvance />}
          {active === 'products' && <ProductsTab />}
          {active === 'inventory' && <InventoryTab />}
          {active === 'customers' && <CustomersTab />}
          {active === 'reviews' && <ReviewsTab />}
          {active === 'users' && <UsersTab />}
          {active === 'panels' && <PanelAccessTab />}
          {active === 'reports' && <ReportsTab />}
          {active === 'activity' && <ActivityTab />}
          {active === 'settings' && <SettingsTab />}
        </StaffShell>
      )}
    </StaffGate>
  );
}
