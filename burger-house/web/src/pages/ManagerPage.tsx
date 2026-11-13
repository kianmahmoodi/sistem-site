import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ClipboardList, LayoutDashboard, ChartColumn, Users, Warehouse } from 'lucide-react';
import { StaffGate } from '../staff/StaffGate';
import { StaffShell } from '../staff/Shell';
import type { StaffNavItem } from '../staff/Shell';
import { useAdminT } from '../staff/labels';
import { OrdersBoard } from '../staff/OrdersBoard';
import { InventoryTab } from '../staff/InventoryTab';
import { ReportsTab } from '../staff/ReportsTab';
import { ManagerOverview } from './staff/ManagerOverview';
import { EmployeesTab } from './staff/EmployeesTab';

const NAV: StaffNavItem[] = [
  { key: 'overview', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'orders', label: 'Orders', icon: ClipboardList },
  { key: 'inventory', label: 'Inventory', icon: Warehouse },
  { key: 'employees', label: 'Employees', icon: Users },
  { key: 'reports', label: 'Reports', icon: ChartColumn },
];

export function ManagerPage() {
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
    navigate(`/manager/${key}`, { replace: true });
  };

  const label = NAV.find((item) => item.key === active)?.label || 'Dashboard';

  return (
    <StaffGate allow={['manager', 'super_admin']}>
      {(session) => (
        <StaffShell
          user={session.user}
          roleLabel={session.user.role === 'super_admin' ? 'Super Admin' : 'Manager'}
          nav={NAV}
          active={active}
          onSelect={select}
          title={t(label)}
          subtitle={t('Manager panel')}
        >
          {active === 'overview' && <ManagerOverview />}
          {active === 'orders' && <OrdersBoard endpoint="/api/staff/orders" canCancel canAdvance />}
          {active === 'inventory' && <InventoryTab />}
          {active === 'employees' && <EmployeesTab />}
          {active === 'reports' && <ReportsTab />}
        </StaffShell>
      )}
    </StaffGate>
  );
}
