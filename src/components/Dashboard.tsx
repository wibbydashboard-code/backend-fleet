// src/components/Dashboard.tsx
import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { KpiCard } from './KpiCard';
import { UnitsIcon } from './Icons';
import { getStats, getPaymentsReport, type PaymentRow } from '@/api';

type ExpRow = { unit?: string; contract_number?: string; end_date?: string; days_left?: number };

const getDaysRemainingColor = (days: number) => {
  if (days <= 7) return 'text-red-600';
  if (days <= 15) return 'text-amber-600';
  return 'text-slate-600';
};

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [kpi, setKpi] = useState({ units: 0, active: 0, next30: 0, overdue: 0 });
  const [expirations, setExpirations] = useState<ExpRow[]>([]);
  const [barData, setBarData] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const year = new Date().getFullYear();
        const [statsRes, payments] = await Promise.all([
          getStats(), // { stats, nextExp }
          getPaymentsReport({ from: `${year}-01-01`, to: `${year}-12-31` }) as Promise<PaymentRow[]>,
        ]);

        if (cancelled) return;

        setKpi(statsRes.stats);
        setExpirations(statsRes.nextExp ?? []);

        // Agrupar pagos por empresa
        const byCompany = new Map<string, number>();
        for (const r of payments || []) {
          const key = r.company || '—';
          const amt = Number(r.amount || 0);
          if (!amt) continue;
          byCompany.set(key, (byCompany.get(key) || 0) + amt);
        }
        const arr = Array.from(byCompany, ([name, value]) => ({ name, value }))
          .sort((a, b) => a.name.localeCompare(b.name));
        const total = arr.reduce((s, a) => s + a.value, 0);
        setBarData(total > 0 ? [...arr, { name: 'Total', value: total }] : []);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? 'Error cargando dashboard');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const kpiData = [
    { title: 'Unidades Totales',     value: String(kpi.units),  color: 'blue'  as const, icon: <UnitsIcon /> },
    { title: 'Contratos Activos',    value: String(kpi.active), color: 'green' as const, icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
    )},
    { title: 'Pagos Próximos (30d)', value: String(kpi.next30), color: 'amber' as const, icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
      </svg>
    )},
    { title: 'Pagos Vencidos',       value: String(kpi.overdue), color: 'red'  as const, icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
    )},
  ];

  if (loading) return <div className="p-6">Cargando…</div>;
  if (err)      return <div className="p-6 text-red-600">Error: {err}</div>;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiData.map(k => <KpiCard key={k.title} {...k} />)}
      </div>

      {/* Contenido */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Gráfica de costos por empresa */}
        <div className="lg:col-span-3 bg-white p-6 rounded-lg shadow">
          <h3 className="font-semibold text-slate-800 mb-4">Costos de Arrendamiento por Empresa (Año Actual)</h3>
          {barData.length === 0 ? (
            <div className="text-sm text-slate-500">Sin datos para el año actual.</div>
          ) : (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis
                    tickFormatter={(v) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(Number(v))}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(v) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(v))}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Próximos vencimientos */}
        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow">
          <h3 className="font-semibold text-slate-800 mb-4">Próximos Vencimientos</h3>
          <ul className="space-y-4">
            {expirations.length === 0 ? (
              <li className="text-sm text-slate-500">Sin vencimientos próximos.</li>
            ) : (
              expirations.map((exp, idx) => (
                <li key={idx} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-700">{exp.unit ?? '-'}</p>
                    <p className="text-sm text-slate-500">Contrato: {exp.contract_number ?? '-'}</p>
                    <p className="text-xs text-slate-400">{exp.end_date ?? ''}</p>
                  </div>
                  <span className={`text-sm font-semibold ${getDaysRemainingColor(exp.days_left ?? 0)}`}>
                    Vence en {exp.days_left ?? 0} días
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
