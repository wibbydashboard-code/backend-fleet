import React, { useEffect, useState } from 'react';
import { getPayments, getContractsComplete, createPayment, uploadPaymentPDF, updatePaymentStatus, getProviders, type PaymentRow, type CreatePaymentRequest, type ContractCompleteRow, type ProviderRow } from '@/api';

const fmt = (d?: string | null) => {
  if (!d) return '';
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? '' : dt.toLocaleDateString('es-MX');
};

const StatusBadge: React.FC<{ status?: string | null }> = ({ status }) => {
  const s = (status ?? '').toLowerCase();
  if (s === 'activo' || s === 'pagado')
    return <span className="px-2 inline-flex text-xs font-semibold rounded-full bg-green-100 text-green-800">Pagado</span>;
  if (s === 'vencido')
    return <span className="px-2 inline-flex text-xs font-semibold rounded-full bg-red-100 text-red-800">Vencido</span>;
  if (s === 'pendiente')
    return <span className="px-2 inline-flex text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Pendiente</span>;
  return <span className="px-2 inline-flex text-xs font-semibold rounded-full bg-slate-100 text-slate-800">{status || '—'}</span>;
};

export const PaymentsView: React.FC = () => {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [contracts, setContracts] = useState<ContractCompleteRow[]>([]);
  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    contract_id: ''
  });

  const [newPayment, setNewPayment] = useState<CreatePaymentRequest>({
    contract_id: 0,
    payment_date: '',
    due_date: '',
    amount: 0,
    payment_method: '',
    status: 'Pendiente'
  });
  const [paymentPdfFile, setPaymentPdfFile] = useState<File | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setErr('');
      const [p, c, prov] = await Promise.all([
        getPayments(),
        getContractsComplete(),
        getProviders()
      ]);
      setPayments(p);
      setContracts(c);
      setProviders(prov.filter(pr => pr.status === 'Activo'));
    } catch (e: any) {
      setErr(e?.message || 'Error cargando pagos');
      setPayments([]);
      setContracts([]);
      setProviders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPayment.contract_id) {
      setErr('Seleccione un contrato');
      return;
    }

    try {
      setSubmitting(true);
      setErr('');

      const payment = await createPayment(newPayment);

      if (paymentPdfFile) {
        await uploadPaymentPDF(payment.id, paymentPdfFile);
      }

      setShowCreateModal(false);
      setNewPayment({
        contract_id: 0,
        payment_date: '',
        due_date: '',
        amount: 0,
        payment_method: '',
        status: 'Pendiente'
      });
      setPaymentPdfFile(null);
      await load();
    } catch (e: any) {
      setErr(e?.message || 'Error creando pago');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdatePaymentStatus = async (paymentId: number, newStatus: 'Pagado' | 'Pendiente' | 'Vencido') => {
    try {
      setErr('');
      await updatePaymentStatus(paymentId, newStatus);
      await load();
    } catch (e: any) {
      setErr(e?.message || 'Error actualizando estado del pago');
    }
  };

  const handleViewPDF = (payment: PaymentRow) => {
    if (!payment.payment_pdf_path) {
      setErr('No hay comprobante asociado a este pago');
      return;
    }
    const normalizedPath = payment.payment_pdf_path.replace(/\\/g, '/');
    window.open(`http://localhost:3000/${normalizedPath}`, '_blank');
  };

  const filteredPayments = payments.filter(p => {
    if (filters.status && p.status !== filters.status) return false;
    if (filters.contract_id && p.contract_id !== parseInt(filters.contract_id)) return false;
    return true;
  });

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Pagos</h2>
          <p className="text-sm text-slate-500">Historial completo de pagos del sistema</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Registrar Pago
        </button>
      </div>

      {err && <div className="mb-4 text-sm text-red-600">{err}</div>}

      <div className="mb-6 p-4 bg-slate-50 rounded-lg">
        <h3 className="text-sm font-medium text-slate-700 mb-3">Filtros</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Estatus</label>
            <select
              value={filters.status}
              onChange={e => setFilters({ ...filters, status: e.target.value })}
              className="w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todos</option>
              <option value="Pendiente">Pendiente</option>
              <option value="Pagado">Pagado</option>
              <option value="Vencido">Vencido</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Contrato</label>
            <select
              value={filters.contract_id}
              onChange={e => setFilters({ ...filters, contract_id: e.target.value })}
              className="w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todos</option>
              {contracts.map(c => (
                <option key={c.id} value={c.id}>{c.contract_number}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Fecha Pago</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Vencimiento</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Contrato</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Proveedor</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Empresa</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Unidad</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Monto</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Método</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Estatus</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Comprobante</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {loading ? (
              <tr><td colSpan={11} className="px-6 py-4 text-sm text-slate-500">Cargando…</td></tr>
            ) : filteredPayments.length === 0 ? (
              <tr><td colSpan={11} className="px-6 py-4 text-sm text-slate-500">Sin pagos registrados.</td></tr>
            ) : (
              filteredPayments.map((p) => {
                const contract = contracts.find(c => c.id === p.contract_id);
                return (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{fmt(p.payment_date)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{fmt(p.due_date)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{p.contract_number || contract?.contract_number || '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{contract?.provider_name || '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{p.company_name || contract?.company_name || '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{contract?.unit_economic_number ? `${contract.unit_economic_number} (${contract.unit_license_plate})` : '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">${Number(p.amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{p.payment_method || '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={p.status} /></td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {p.payment_pdf_path ? (
                        <button
                          onClick={() => handleViewPDF(p)}
                          className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Ver
                        </button>
                      ) : (
                        <span className="text-slate-400">Sin comprobante</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      {p.status === 'Pendiente' && (
                        <button
                          onClick={() => handleUpdatePaymentStatus(p.id, 'Pagado')}
                          className="text-green-600 hover:text-green-900"
                        >
                          Marcar Pagado
                        </button>
                      )}
                      {p.status === 'Pendiente' && (
                        <button
                          onClick={() => handleUpdatePaymentStatus(p.id, 'Vencido')}
                          className="text-red-600 hover:text-red-900"
                        >
                          Marcar Vencido
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showCreateModal && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-70 z-[200]"
            onClick={() => setShowCreateModal(false)}
          />
          <div className="fixed inset-0 z-[201] flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto pointer-events-auto">
              <div className="p-6 border-b border-slate-200">
                <h3 className="text-xl font-bold text-slate-800">Registrar Nuevo Pago</h3>
              </div>
              <form onSubmit={handleCreatePayment} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Contrato *</label>
                    <select
                      required
                      value={newPayment.contract_id}
                      onChange={e => setNewPayment({ ...newPayment, contract_id: parseInt(e.target.value) })}
                      className="w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Seleccione contrato</option>
                      {contracts.map(c => (
                        <option key={c.id} value={c.id}>{c.contract_number} - {c.provider_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Monto *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={newPayment.amount}
                      onChange={e => setNewPayment({ ...newPayment, amount: parseFloat(e.target.value) })}
                      className="w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Fecha de Pago</label>
                    <input
                      type="date"
                      value={newPayment.payment_date}
                      onChange={e => setNewPayment({ ...newPayment, payment_date: e.target.value })}
                      className="w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Fecha de Vencimiento</label>
                    <input
                      type="date"
                      value={newPayment.due_date}
                      onChange={e => setNewPayment({ ...newPayment, due_date: e.target.value })}
                      className="w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Método de Pago</label>
                    <select
                      value={newPayment.payment_method}
                      onChange={e => setNewPayment({ ...newPayment, payment_method: e.target.value })}
                      className="w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Seleccione método</option>
                      <option value="Transferencia">Transferencia</option>
                      <option value="Efectivo">Efectivo</option>
                      <option value="Tarjeta">Tarjeta</option>
                      <option value="Cheque">Cheque</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Estatus</label>
                    <select
                      value={newPayment.status}
                      onChange={e => setNewPayment({ ...newPayment, status: e.target.value as 'Pagado' | 'Pendiente' | 'Vencido' })}
                      className="w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="Pendiente">Pendiente</option>
                      <option value="Pagado">Pagado</option>
                      <option value="Vencido">Vencido</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Comprobante (PDF o imagen)</label>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={e => setPaymentPdfFile(e.target.files?.[0] || null)}
                      className="w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                    {paymentPdfFile && <span className="text-sm text-slate-600 mt-1">{paymentPdfFile.name}</span>}
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
                    {submitting ? 'Guardando...' : 'Registrar Pago'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
};