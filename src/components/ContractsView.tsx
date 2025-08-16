import React, { useEffect, useMemo, useState } from 'react';
import { getContracts, getUnits } from '@/api'; // o '@/lib/api'

type ContractRow = {
  id?: number;
  type: 'contract' | 'policy';
  num: string;          // número de contrato o póliza
  prov: string;         // proveedor / aseguradora
  company?: string | null;
  unit: string;         // económico (si fuera unit_id, ajusta abajo)
  start_date?: string | null;
  end_date?: string | null;
};

type UnitRow = {
  id: number;
  economic_number: string;
  license_plate?: string | null;
  type?: string | null;
  company_name?: string | null;
  status?: string | null;
};

const StatusBadge: React.FC<{ status?: string | null }> = ({ status }) => {
  const s = (status ?? '').toLowerCase();
  if (s === 'activo' || s === 'activa')
    return <span className="px-2 inline-flex text-xs font-semibold rounded-full bg-green-100 text-green-800">Activo</span>;
  if (s === 'por finalizar')
    return <span className="px-2 inline-flex text-xs font-semibold rounded-full bg-amber-100 text-amber-800">Por Finalizar</span>;
  if (s === 'baja' || s === 'taller')
    return <span className="px-2 inline-flex text-xs font-semibold rounded-full bg-red-100 text-red-800">{s === 'taller' ? 'Taller' : 'Baja'}</span>;
  return <span className="px-2 inline-flex text-xs font-semibold rounded-full bg-slate-100 text-slate-800">{status || '—'}</span>;
};

const fmt = (d?: string | null) => {
  if (!d) return '';
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? '' : dt.toLocaleDateString('es-MX');
};

export const ContractsView: React.FC = () => {
  const [rows, setRows] = useState<ContractRow[]>([]);
  const [units, setUnits] = useState<UnitRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr('');
        const [c, u] = await Promise.all([getContracts(), getUnits()]);
        if (!alive) return;
        setRows(c ?? []);
        setUnits(u ?? []);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message || 'Error cargando contratos');
        setRows([]);
        setUnits([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // Mapa económico -> estatus (si tu API devuelve unit_id, cambia por id y ajusta c.unit)
  const statusByEco = useMemo(() => {
    const m = new Map<string, string>();
    for (const u of units) {
      if (u.economic_number) m.set(u.economic_number, u.status ?? '');
    }
    return m;
  }, [units]);

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      {err && <div className="mb-4 text-sm text-red-600">{err}</div>}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">No. Contrato / Póliza</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Proveedor / Aseguradora</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Empresa</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Unidad</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Vigencia</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Estatus</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {loading ? (
              <tr><td colSpan={6} className="px-6 py-4 text-sm text-slate-500">Cargando…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-4 text-sm text-slate-500">Sin resultados.</td></tr>
            ) : (
              rows.map((c, i) => {
                // si c.unit fuese unit_id => usa statusById.get(c.unit_id)
                const status = statusByEco.get(c.unit || '');
                return (
                  <tr key={c.id ?? `${c.type}-${c.num}-${c.unit}-${i}`} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{c.num}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{c.prov}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{c.company || ''}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{c.unit}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {fmt(c.start_date)} {c.end_date ? ' - ' : ''}{fmt(c.end_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={status} /></td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
