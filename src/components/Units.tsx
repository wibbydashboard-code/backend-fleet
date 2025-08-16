import React, { useEffect, useMemo, useState } from 'react';
import { getUnits } from '@/api'; // o '@/lib/api' si mantienes el puente

type UnitRow = {
  id: number;
  economic_number: string;
  license_plate?: string | null;
  type?: string | null;
  company_name?: string | null;
  status?: string | null;
};

interface UnitsProps {
  onOpenModal: (unitId: number) => void;
}

const statusBadge = (status?: string | null) => {
  const s = (status ?? '').trim().toLowerCase();
  if (s === 'activo' || s === 'activa')
    return <span className="px-2 inline-flex text-xs font-semibold rounded-full bg-green-100 text-green-800">Activo</span>;
  if (s === 'por finalizar')
    return <span className="px-2 inline-flex text-xs font-semibold rounded-full bg-amber-100 text-amber-800">Por Finalizar</span>;
  if (s === 'baja' || s === 'taller')
    return <span className="px-2 inline-flex text-xs font-semibold rounded-full bg-red-100 text-red-800">{s === 'taller' ? 'Taller' : 'Baja'}</span>;
  return <span className="text-slate-500 text-xs">—</span>;
};

export const Units: React.FC<UnitsProps> = ({ onOpenModal }) => {
  const [rows, setRows] = useState<UnitRow[]>([]);
  const [q, setQ] = useState('');
  const [company, setCompany] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>('');

  const load = async () => {
    try {
      setLoading(true);
      setErr('');
      // Ajusta las keys a lo que espere tu endpoint (company_id vs company_name)
      const data: UnitRow[] = await getUnits({
        q: q.trim(),
        status: status.trim(),
        company: company.trim(), // o company_id si lo manejas
      });
      setRows(data ?? []);
    } catch (e: any) {
      setErr(e?.message ?? 'Error cargando unidades');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  // carga inicial y debounce de búsqueda
  useEffect(() => {
    const t = setTimeout(() => { load(); }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status, company]);

  // empresas derivadas (normalizadas)
  const companies = useMemo(() => {
    const set = new Set<string>();
    rows.forEach(r => {
      const name = (r.company_name ?? '').trim();
      if (name) set.add(name);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por económico, placa, serie..."
          className="md:col-span-2 block w-full pl-4 pr-10 py-2 border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        />

        <select
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          className="block w-full pl-3 pr-10 py-2 border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Filtrar por Empresa</option>
          {companies.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="block w-full pl-3 pr-10 py-2 border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Filtrar por Estatus</option>
          <option value="Activo">Activo</option>
          <option value="Activa">Activa</option>
          <option value="Por Finalizar">Por Finalizar</option>
          <option value="Baja">Baja</option>
          <option value="Taller">Taller</option>
        </select>

        <button
          onClick={load}
          disabled={loading}
          className="md:col-span-1 bg-blue-600 text-white rounded-md px-4 py-2 disabled:opacity-60"
        >
          {loading ? 'Buscando…' : 'Buscar'}
        </button>
      </div>

      {err && <div className="mb-4 text-sm text-red-600">{err}</div>}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Económico</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Placa</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Tipo de Unidad</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Empresa Asignada</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Estatus Contrato</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {rows.length > 0 ? rows.map((unit, index) => (
              <tr key={unit.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{unit.economic_number}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{unit.license_plate || ''}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{unit.type || ''}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{unit.company_name || ''}</td>
                <td className="px-6 py-4 whitespace-nowrap">{statusBadge(unit.status)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button onClick={() => onOpenModal(unit.id)} className="text-blue-600 hover:text-blue-900">
                    Ver Detalles
                  </button>
                </td>
              </tr>
            )) : (
              <tr><td className="px-6 py-4 text-sm text-slate-500" colSpan={6}>
                {loading ? 'Cargando…' : 'Sin resultados.'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
