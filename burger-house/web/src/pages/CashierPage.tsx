import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ClipboardList, Clock3, ShoppingCart } from 'lucide-react';
import { StaffGate } from '../staff/StaffGate';
import { StaffShell } from '../staff/Shell';
import type { StaffNavItem } from '../staff/Shell';
import { useAdminT } from '../staff/labels';
import { OrdersBoard } from '../staff/OrdersBoard';
import { PosTab } from './staff/PosTab';
import { ShiftTab } from './staff/ShiftTab';

const NAV: StaffNavItem[] = [
  { key: 'pos', label: 'POS', icon: ShoppingCart },
  { key: 'orders', label: 'Orders', icon: ClipboardList },
  { key: 'shift', label: 'Shift', icon: Clock3 },
];

export function CashierPage() {
  const t = useAdminT();
  const { section } = useParams();
  const navigate = useNavigate();
  const [active, setActive] = useState(() =>
    NAV.some((item) => item.key === section) ? (section as string) : 'pos'
  );

  useEffect(() => {
    if (section && NAV.some((item) => item.key === section)) setActive(section);
  }, [section]);

  const select = (key: string) => {
    setActive(key);
    navigate(`/cashier/${key}`, { replace: true });
  };

  const label = NAV.find((item) => item.key === active)?.label || 'POS';

  return (
    <StaffGate allow={['cashier', 'manager', 'super_admin']}>
      {(session) => (
        <StaffShell
          user={session.user}
          roleLabel={session.user.role === 'cashier' ? 'Cashier' : session.user.role === 'manager' ? 'Manager' : 'Super Admin'}
          nav={NAV}
          active={active}
          onSelect={select}
          title={t(label)}
          subtitle={t('Cashier panel')}
        >
          {active === 'pos' && <PosTab />}
          {active === 'orders' && <OrdersBoard endpoint="/api/pos/orders" query="scope=today" canAdvance />}
          {active === 'shift' && <ShiftTab />}
        </StaffShell>
      )}
    </StaffGate>
  );
}
