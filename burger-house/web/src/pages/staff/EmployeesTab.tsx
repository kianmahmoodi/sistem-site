import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { formatDateTime, money } from '../../lib/format';
import type { User } from '../../lib/types';
import { useAdminT } from '../../staff/labels';
import { useRealtime } from '../../staff/useRealtime';
import { Card, Empty, Pill, Spinner } from '../../staff/ui';

type Employee = User & {
  order_count: number;
  revenue: number;
  last_order_at: string | null;
};

type Shift = {
  id: number;
  user_name: string;
  started_at: string;
  ended_at: string | null;
  note: string;
};

export function EmployeesTab() {
  const t = useAdminT();
  const [employees, setEmployees] = useState<Employee[] | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [error, setError] = useState('');

  const load = () => {
    api<{ employees: Employee[]; shifts: Shift[] }>('/api/staff/employees')
      .then((data) => {
        setEmployees(data.employees);
        setShifts(data.shifts);
        setError('');
      })
      .catch(() => setError(t('Could not load data.')));
  };

  useEffect(load, [t]);
  useRealtime(['users', 'orders'], load);

  if (error) return <p className="rounded-xl bg-rose-500/10 px-4 py-2.5 text-sm text-rose-300">{error}</p>;
  if (!employees) return <Spinner label={t('Loading…')} />;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {employees.length === 0 && <Empty>{t('No records found.')}</Empty>}
        {employees.map((employee) => (
          <div key={employee.id} className="rounded-2xl border border-white/[0.07] bg-[#111114] p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-bold text-white">{employee.name}</p>
                <p className="truncate text-xs text-[#7c7c87]">{employee.email}</p>
              </div>
              <Pill status={employee.status || 'active'} label={t(employee.status === 'active' ? 'Active' : 'Disabled')} />
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-black/25 p-2.5">
                <dt className="text-[10px] uppercase tracking-wide text-[#6d6d78]">{t('Role')}</dt>
                <dd className="mt-0.5 font-semibold text-[#e7e7ec]">{t(employee.role === 'manager' ? 'Manager' : 'Cashier')}</dd>
              </div>
              <div className="rounded-lg bg-black/25 p-2.5">
                <dt className="text-[10px] uppercase tracking-wide text-[#6d6d78]">{t('Total orders')}</dt>
                <dd className="mt-0.5 font-semibold text-[#e7e7ec]">{employee.order_count}</dd>
              </div>
              <div className="rounded-lg bg-black/25 p-2.5">
                <dt className="text-[10px] uppercase tracking-wide text-[#6d6d78]">{t('Revenue (7 days)')}</dt>
                <dd className="mt-0.5 font-semibold text-[#e7e7ec]">{money(employee.revenue)}</dd>
              </div>
              <div className="rounded-lg bg-black/25 p-2.5">
                <dt className="text-[10px] uppercase tracking-wide text-[#6d6d78]">{t('Last login')}</dt>
                <dd className="mt-0.5 font-semibold text-[#e7e7ec]">
                  {employee.last_login_at ? formatDateTime(employee.last_login_at) : '—'}
                </dd>
              </div>
            </dl>
          </div>
        ))}
      </div>

      <Card title={t('Shift history')}>
        {shifts.length === 0 ? (
          <Empty>{t('No records found.')}</Empty>
        ) : (
          <ul className="divide-y divide-white/[0.06]">
            {shifts.map((shift) => (
              <li key={shift.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                <div>
                  <p className="font-medium text-[#e7e7ec]">{shift.user_name}</p>
                  <p className="text-xs text-[#7c7c87]">
                    {t('Started')}: {formatDateTime(shift.started_at)}
                    {shift.ended_at ? ` · ${t('Ended')}: ${formatDateTime(shift.ended_at)}` : ''}
                  </p>
                </div>
                <Pill status={shift.ended_at ? 'completed' : 'active'} label={t(shift.ended_at ? 'Completed' : 'Open')} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
