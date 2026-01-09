import React, { useEffect, useMemo, useState } from 'react';
import { getUnits, createUnit, updateUnitStatus, type UnitRow, type CreateUnitRequest } from '@/api';
import { COMPANIES } from '../constants';

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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [confirmBaja, setConfirmBaja] = useState<{ id: number; economicNumber: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [newUnit, setNewUnit] = useState<CreateUnitRequest>({
    economic_number: '',
    license_plate: '',
    serial_number: '',
    type: '',
    brand: '',
    model: '',
    year: new Date().getFullYear(),
    assigned_company_id: 0
  });

  const load = async () => {
    try {
      setLoading(true);
      setErr('');
      const data: UnitRow[] = await getUnits({
        q: q.trim(),
        status: status.trim(),
        company: company.trim(),
      });
      setRows(data ?? []);
    } catch (e: any) {
      setErr(e?.message ?? 'Error cargando unidades');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setErr('');
      await createUnit(newUnit);
      setShowCreateModal(false);
      setNewUnit({
        economic_number: '',
        license_plate: '',
        serial_number: '',
        type: '',
        brand: '',
        model: '',
        year: new Date().getFullYear(),
        assigned_company_id: 0
      });
      await load();
    } catch (e: any) {
      setErr(e?.message ?? 'Error creando unidad');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBaja = async () => {
    if (!confirmBaja) return;
    try {
      setSubmitting(true);
      setErr('');
      await updateUnitStatus(confirmBaja.id, 'Baja');
      setConfirmBaja(null);
      await load();
    } catch (e: any) {
      if (e.message === 'UNIT_HAS_ACTIVE_CONTRACTS') {
        setErr('No se puede dar de baja: la unidad tiene contratos activos');
      } else {
        setErr(e?.message ?? 'Error cambiando estatus');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleReactivar = async (unitId: number) => {
    try {
      setSubmitting(true);
      setErr('');
      await updateUnitStatus(unitId, 'Activo');
      await load();
    } catch (e: any) {
      setErr(e?.message ?? 'Error reactivando unidad');
    } finally {
      setSubmitting(false);
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
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-slate-800">Gestión de Unidades</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Registrar Unidad
        </button>
      </div>

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
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <button onClick={() => onOpenModal(unit.id)} className="text-blue-600 hover:text-blue-900">
                    Ver Detalles
                  </button>
                  {unit.status === 'Activo' && (
                    <button
                      onClick={() => setConfirmBaja({ id: unit.id, economicNumber: unit.economic_number })}
                      className="text-red-600 hover:text-red-900"
                    >
                      Dar de Baja
                    </button>
                  )}
                  {unit.status === 'Baja' && (
                    <button
                      onClick={() => handleReactivar(unit.id)}
                      className="text-green-600 hover:text-green-900"
                    >
                      Reactivar
                    </button>
                  )}
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

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-xl font-bold text-slate-800">Registrar Nueva Unidad</h3>
            </div>
            <form onSubmit={handleCreateUnit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Número Económico *</label>
                  <input
                    type="text"
                    required
                    value={newUnit.economic_number}
                    onChange={e => setNewUnit({ ...newUnit, economic_number: e.target.value })}
                    className="w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Placa *</label>
                  <input
                    type="text"
                    required
                    value={newUnit.license_plate}
                    onChange={e => setNewUnit({ ...newUnit, license_plate: e.target.value })}
                    className="w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Número de Serie *</label>
                  <input
                    type="text"
                    required
                    value={newUnit.serial_number}
                    onChange={e => setNewUnit({ ...newUnit, serial_number: e.target.value })}
                    className="w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Marca *</label>
                  <input
                    type="text"
                    required
                    value={newUnit.brand}
                    onChange={e => setNewUnit({ ...newUnit, brand: e.target.value })}
                    className="w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Modelo *</label>
                  <input
                    type="text"
                    required
                    value={newUnit.model}
                    onChange={e => setNewUnit({ ...newUnit, model: e.target.value })}
                    className="w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Año *</label>
                  <input
                    type="number"
                    required
                    min="2000"
                    max={new Date().getFullYear() + 1}
                    value={newUnit.year}
                    onChange={e => setNewUnit({ ...newUnit, year: parseInt(e.target.value) })}
                    className="w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tipo *</label>
                  <input
                    type="text"
                    required
                    value={newUnit.type}
                    onChange={e => setNewUnit({ ...newUnit, type: e.target.value })}
                    className="w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Empresa Asignada *</label>
                  <select
                    required
                    value={newUnit.assigned_company_id}
                    onChange={e => setNewUnit({ ...newUnit, assigned_company_id: parseInt(e.target.value) })}
                    className="w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Seleccione empresa</option>
                    {COMPANIES.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? 'Guardando...' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmBaja && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setConfirmBaja(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Confirmar Baja</h3>
              <p className="text-slate-600 mb-6">
                ¿Está seguro que desea dar de baja la unidad <strong>{confirmBaja.economicNumber}</strong>?
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setConfirmBaja(null)}
                  className="px-4 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleBaja}
                  disabled={submitting}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {submitting ? 'Procesando...' : 'Confirmar Baja'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
