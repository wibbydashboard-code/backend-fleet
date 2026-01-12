import React, { useEffect, useState, useMemo } from 'react';
import { getProviders, createProvider, updateProvider, updateProviderStatus, type ProviderRow, type CreateProviderRequest, type UpdateProviderRequest } from '@/api';
import { SortHeader } from './SortHeader';
import { ProviderStatementView } from './ProviderStatementView';

const StatusBadge: React.FC<{ status?: string | null }> = ({ status }) => {
  const s = (status ?? '').toLowerCase();
  if (s === 'activo')
    return <span className="px-2 inline-flex text-xs font-semibold rounded-full bg-green-100 text-green-800">Activo</span>;
  if (s === 'inactivo')
    return <span className="px-2 inline-flex text-xs font-semibold rounded-full bg-red-100 text-red-800">Inactivo</span>;
  return <span className="px-2 inline-flex text-xs font-semibold rounded-full bg-slate-100 text-slate-800">{status || '—'}</span>;
};

const TypeBadge: React.FC<{ type?: string | null }> = ({ type }) => {
  const t = (type ?? '').toLowerCase();
  if (t === 'arrendador')
    return <span className="px-2 inline-flex text-xs font-semibold rounded-full bg-blue-100 text-blue-800">Arrendador</span>;
  if (t === 'aseguradora')
    return <span className="px-2 inline-flex text-xs font-semibold rounded-full bg-purple-100 text-purple-800">Aseguradora</span>;
  return <span className="px-2 inline-flex text-xs font-semibold rounded-full bg-slate-100 text-slate-800">{type || '—'}</span>;
};

export const ProvidersView: React.FC = () => {
  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProvider, setEditingProvider] = useState<ProviderRow | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [providerData, setProviderData] = useState<CreateProviderRequest | UpdateProviderRequest>({
    name: '',
    type: 'arrendador',
    rfc: '',
    contact_name: '',
    contact_email: '',
    contact_phone: ''
  });
  const [selectedProviderId, setSelectedProviderId] = useState<number | null>(null);

  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const load = async () => {
    try {
      setLoading(true);
      setErr('');
      const data = await getProviders();
      setProviders(data);
    } catch (e: any) {
      setErr(e?.message || 'Error cargando proveedores');
      setProviders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreateProvider = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSubmitting(true);
      setErr('');

      await createProvider(providerData as CreateProviderRequest);

      setShowModal(false);
      setProviderData({
        name: '',
        type: 'arrendador',
        rfc: '',
        contact_name: '',
        contact_email: '',
        contact_phone: ''
      });
      setEditingProvider(null);
      await load();
    } catch (e: any) {
      setErr(e?.message || 'Error creando proveedor');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditProvider = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingProvider) return;

    try {
      setSubmitting(true);
      setErr('');

      await updateProvider(editingProvider.id, providerData as UpdateProviderRequest);

      setShowModal(false);
      setProviderData({
        name: '',
        type: 'arrendador',
        rfc: '',
        contact_name: '',
        contact_email: '',
        contact_phone: ''
      });
      setEditingProvider(null);
      await load();
    } catch (e: any) {
      setErr(e?.message || 'Error actualizando proveedor');
    } finally {
      setSubmitting(false);
    }
  };

  const openCreateModal = () => {
    setEditingProvider(null);
    setProviderData({
      name: '',
      type: 'arrendador',
      rfc: '',
      contact_name: '',
      contact_email: '',
      contact_phone: ''
    });
    setShowModal(true);
  };

  const openEditModal = (provider: ProviderRow) => {
    setEditingProvider(provider);
    setProviderData({
      name: provider.name,
      type: provider.type,
      rfc: provider.rfc || '',
      contact_name: provider.contact_name || '',
      contact_email: provider.contact_email || '',
      contact_phone: provider.contact_phone || ''
    });
    setShowModal(true);
  };

  const handleToggleStatus = async (provider: ProviderRow) => {
    const newStatus = provider.status === 'Activo' ? 'Inactivo' : 'Activo';
    try {
      setErr('');
      await updateProviderStatus(provider.id, newStatus);
      await load();
    } catch (e: any) {
      setErr(e?.message || 'Error actualizando estado del proveedor');
    }
  };

  const sortedProviders = useMemo(() => {
    if (!sortConfig) return providers;
    return [...providers].sort((a: any, b: any) => {
      const aValue = a[sortConfig.key] || '';
      const bValue = b[sortConfig.key] || '';
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();
      if (aStr < bStr) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aStr > bStr) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [providers, sortConfig]);

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      {selectedProviderId ? (
        <ProviderStatementView
          providerId={selectedProviderId}
          onBack={() => setSelectedProviderId(null)}
        />
      ) : (
        <>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-slate-800">Gestión de Proveedores</h2>
            <button
              onClick={openCreateModal}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Registrar Proveedor
            </button>
          </div>

          {err && <div className="mb-4 text-sm text-red-600">{err}</div>}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <SortHeader label="Nombre" sortKey="name" currentSort={sortConfig} onSort={handleSort} />
                  <SortHeader label="Tipo" sortKey="type" currentSort={sortConfig} onSort={handleSort} />
                  <SortHeader label="RFC" sortKey="rfc" currentSort={sortConfig} onSort={handleSort} />
                  <SortHeader label="Contacto" sortKey="contact_name" currentSort={sortConfig} onSort={handleSort} />
                  <SortHeader label="Email" sortKey="contact_email" currentSort={sortConfig} onSort={handleSort} />
                  <SortHeader label="Estatus" sortKey="status" currentSort={sortConfig} onSort={handleSort} />
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {loading ? (
                  <tr><td colSpan={8} className="px-6 py-4 text-sm text-slate-500 text-center">Cargando proveedores...</td></tr>
                ) : sortedProviders.length === 0 ? (
                  <tr><td colSpan={8} className="px-6 py-4 text-sm text-slate-500 text-center">Sin resultados.</td></tr>
                ) : (
                  sortedProviders.map((p, i) => (
                    <tr key={p.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{p.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap"><TypeBadge type={p.type} /></td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{p.rfc || '—'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{p.contact_name || '—'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{p.contact_email || '—'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{p.contact_phone || '—'}</td>
                      <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={p.status} /></td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                        <button
                          onClick={() => openEditModal(p)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleToggleStatus(p)}
                          className={`${p.status === 'Activo' ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}`}
                        >
                          {p.status === 'Activo' ? 'Desactivar' : 'Activar'}
                        </button>
                        <button
                          onClick={() => setSelectedProviderId(p.id)}
                          className="text-purple-600 hover:text-purple-900"
                        >
                          Estado de Cuenta
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {showModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-200">
                  <h3 className="text-xl font-bold text-slate-800">
                    {editingProvider ? 'Editar Proveedor' : 'Registrar Nuevo Proveedor'}
                  </h3>
                </div>
                <form onSubmit={editingProvider ? handleEditProvider : handleCreateProvider} className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del Proveedor *</label>
                      <input
                        type="text"
                        required
                        value={providerData.name}
                        onChange={e => setProviderData({ ...providerData, name: e.target.value })}
                        className="w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Tipo *</label>
                      <select
                        required
                        value={editingProvider ? editingProvider.type : (providerData as CreateProviderRequest).type}
                        onChange={e => setProviderData({ ...providerData, type: e.target.value as 'arrendador' | 'aseguradora' })}
                        className="w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        disabled={!!editingProvider}
                      >
                        <option value="arrendador">Arrendador</option>
                        <option value="aseguradora">Aseguradora</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">RFC</label>
                      <input
                        type="text"
                        value={providerData.rfc}
                        onChange={e => setProviderData({ ...providerData, rfc: e.target.value })}
                        className="w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Nombre de Contacto</label>
                      <input
                        type="text"
                        value={providerData.contact_name}
                        onChange={e => setProviderData({ ...providerData, contact_name: e.target.value })}
                        className="w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Email de Contacto</label>
                      <input
                        type="email"
                        value={providerData.contact_email}
                        onChange={e => setProviderData({ ...providerData, contact_email: e.target.value })}
                        className="w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono de Contacto</label>
                      <input
                        type="text"
                        value={providerData.contact_phone}
                        onChange={e => setProviderData({ ...providerData, contact_phone: e.target.value })}
                        className="w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 mt-6">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-4 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      {submitting ? 'Guardando...' : (editingProvider ? 'Guardar Cambios' : 'Registrar Proveedor')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};