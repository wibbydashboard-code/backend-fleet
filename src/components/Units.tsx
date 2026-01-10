import React, { useEffect, useMemo, useState } from 'react';
import { getUnits, createUnit, updateUnitStatus, getCompanies, downloadUnitsTemplate, uploadUnitsBatch, type UnitRow, type CreateUnitRequest, type CompanyRow, type BatchUploadResult } from '@/api';

interface UnitsProps {
  onOpenModal: (unit: UnitRow) => void;
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
  const [companiesList, setCompaniesList] = useState<CompanyRow[]>([]);
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

  // --- BATCH STATES ---
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchFile, setBatchFile] = useState<File | null>(null);
  const [batchResult, setBatchResult] = useState<BatchUploadResult | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);

  const handleDownloadTemplate = async () => {
    try {
      const blob = await downloadUnitsTemplate();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Plantilla_Carga_Unidades.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleBatchUpload = async () => {
    if (!batchFile) return;
    try {
      setBatchLoading(true);
      setErr(''); // Clear global error
      const res = await uploadUnitsBatch(batchFile);
      setBatchResult(res);
      await load();
    } catch (e: any) {
      setErr(e.message);
      setBatchResult(null);
    } finally {
      setBatchLoading(false);
    }
  };
  // --------------------

  const load = async () => {
    try {
      setLoading(true);
      setErr('');
      const [unitsData, companiesData] = await Promise.all([
        getUnits({ q: q.trim(), status: status.trim(), company: company.trim() }),
        getCompanies()
      ]);
      setRows(unitsData ?? []);
      setCompaniesList(companiesData ?? []);
    } catch (e: any) {
      setErr(e?.message ?? 'Error cargando datos');
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

  const activeCompanies = useMemo(() => companiesList.filter(c => c.status === 'Activo'), [companiesList]);

  // empresas derivadas para filtro (solo nombres únicos de lo que hay en tabla)
  const filterCompanies = useMemo(() => {
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
        <div className="flex gap-2">
          <button
            onClick={() => { setShowBatchModal(true); setBatchResult(null); setBatchFile(null); }}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            Carga Masiva
          </button>
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
          {filterCompanies.map((name) => (
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
                  <button onClick={() => onOpenModal(unit)} className="text-blue-600 hover:text-blue-900">
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
                    {activeCompanies.map(c => (
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

      {showBatchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 relative">
            <button onClick={() => { setShowBatchModal(false); setBatchResult(null); setBatchFile(null); }} className="absolute top-4 right-4 text-slate-500 hover:text-slate-800">
              ✕
            </button>
            <h3 className="text-xl font-bold mb-4">Carga Masiva de Unidades</h3>

            {!batchResult ? (
              <div className="space-y-4">
                <p className="text-sm text-slate-600">Descargue la plantilla, llénela y súbala aquí.</p>

                <button
                  onClick={handleDownloadTemplate}
                  className="text-blue-600 hover:underline text-sm font-medium flex items-center gap-1"
                >
                  📥 Descargar Plantilla Oficial
                </button>

                <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center bg-slate-50">
                  <input
                    type="file"
                    accept=".xlsx"
                    onChange={e => setBatchFile(e.target.files?.[0] || null)}
                    className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    onClick={handleBatchUpload}
                    disabled={!batchFile || batchLoading}
                    className="bg-blue-600 text-white px-6 py-2 rounded-md font-bold disabled:opacity-50"
                  >
                    {batchLoading ? 'Procesando...' : 'Subir y Procesar'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2 text-center mb-4">
                  <div className="bg-slate-100 p-2 rounded">Total <div className="font-bold text-lg">{batchResult.total}</div></div>
                  <div className="bg-green-100 p-2 rounded text-green-800">Insertados <div className="font-bold text-lg">{batchResult.inserted}</div></div>
                  <div className="bg-red-100 p-2 rounded text-red-800">Fallidos <div className="font-bold text-lg">{batchResult.failed}</div></div>
                </div>

                {batchResult.errors.length > 0 && (
                  <div className="border rounded bg-slate-50 p-2 max-h-60 overflow-y-auto text-sm">
                    <table className="w-full text-left">
                      <thead className="text-xs text-slate-500 uppercase bg-slate-100 sticky top-0">
                        <tr><th>Fila</th><th>Eco</th><th>Error</th></tr>
                      </thead>
                      <tbody>
                        {batchResult.errors.map((err, idx) => (
                          <tr key={idx} className="border-b last:border-0">
                            <td className="py-1 px-1 font-mono text-xs">{err.row}</td>
                            <td className="py-1 px-1 font-mono text-xs">{err.economic_number || '-'}</td>
                            <td className="py-1 px-1 text-red-600">{err.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="flex justify-end pt-4">
                  <button
                    onClick={() => { setShowBatchModal(false); setBatchResult(null); setBatchFile(null); load(); }}
                    className="bg-slate-800 text-white px-4 py-2 rounded"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            )}
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
