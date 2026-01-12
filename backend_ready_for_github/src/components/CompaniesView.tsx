
import React, { useEffect, useState } from 'react';
import { getCompanies, createCompany, updateCompany, updateCompanyStatus, deleteCompany, type CompanyRow } from '@/api';

export const CompaniesView: React.FC = () => {
    const [companies, setCompanies] = useState<CompanyRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string>('');
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formData, setFormData] = useState({ name: '' });
    const [submitting, setSubmitting] = useState(false);

    const load = async () => {
        try {
            setLoading(true);
            setErr('');
            const data = await getCompanies();
            setCompanies(data);
        } catch (e: any) {
            setErr(e.message || 'Error cargando empresas');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) return;

        try {
            setSubmitting(true);
            if (editingId) {
                await updateCompany(editingId, formData.name);
            } else {
                await createCompany(formData.name);
            }
            setShowModal(false);
            setFormData({ name: '' });
            setEditingId(null);
            await load();
        } catch (e: any) {
            setErr(e.message || 'Error guardando empresa');
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (c: CompanyRow) => {
        setEditingId(c.id);
        setFormData({ name: c.name });
        setShowModal(true);
    };

    const handleToggleStatus = async (c: CompanyRow) => {
        try {
            const newStatus = c.status === 'Activo' ? 'Inactivo' : 'Activo';
            await updateCompanyStatus(c.id, newStatus);
            await load();
        } catch (e: any) {
            setErr(e.message || 'Error actualizando estatus');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('¿Está seguro de eliminar esta empresa? Esta acción no se puede deshacer.')) return;
        try {
            await deleteCompany(id);
            await load();
        } catch (e: any) {
            if (e.message === 'COMPANY_HAS_UNITS') {
                alert('No se puede eliminar la empresa porque tiene unidades asignadas.');
            } else {
                alert(e.message || 'Error eliminando empresa');
            }
        }
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingId(null);
        setFormData({ name: '' });
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-slate-800">Directorio de Empresas</h2>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Nueva Empresa
                </button>
            </div>

            {err && <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded">{err}</div>}

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Nombre</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Estatus</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {companies.length > 0 ? (
                            companies.map((c) => (
                                <tr key={c.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{c.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <button
                                            onClick={() => handleToggleStatus(c)}
                                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${c.status === 'Activo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                }`}
                                        >
                                            {c.status}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button onClick={() => handleEdit(c)} className="text-blue-600 hover:text-blue-900 mr-4">
                                            Editar
                                        </button>
                                        <button onClick={() => handleDelete(c.id)} className="text-red-600 hover:text-red-900">
                                            Eliminar
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={3} className="px-6 py-4 text-center text-sm text-slate-500">
                                    {loading ? 'Cargando...' : 'No hay empresas registradas.'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={closeModal}>
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-200">
                            <h3 className="text-xl font-bold text-slate-800">
                                {editingId ? 'Editar Empresa' : 'Registrar Empresa'}
                            </h3>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6">
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Comercial *</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Ej. Transportes del Norte"
                                />
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-4 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {submitting ? 'Guardando...' : 'Guardar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
