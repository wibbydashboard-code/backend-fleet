
import React, { useEffect, useState } from 'react';
import { getContractsComplete, getUnits, createContract, uploadContractPDF, getProviders, getPaymentsByContract, createPayment, uploadPaymentPDF, updatePaymentStatus, getCompanies, type ContractCompleteRow, type CreateContractRequest, type ProviderRow, type PaymentRow, type CreatePaymentRequest, type CompanyRow } from '@/api';

const fmt = (d?: string | null) => {
  if (!d) return '';
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? '' : dt.toLocaleDateString('es-MX');
};

const StatusBadge: React.FC<{ status?: string | null }> = ({ status }) => {
  const s = (status ?? '').toLowerCase();
  if (s === 'activo')
    return <span className="px-2 inline-flex text-xs font-semibold rounded-full bg-green-100 text-green-800">Activo</span>;
  if (s === 'vencido')
    return <span className="px-2 inline-flex text-xs font-semibold rounded-full bg-red-100 text-red-800">Vencido</span>;
  return <span className="px-2 inline-flex text-xs font-semibold rounded-full bg-slate-100 text-slate-800">{status || '—'}</span>;
};

export const ContractsView: React.FC = () => {
  const [contracts, setContracts] = useState<ContractCompleteRow[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newContract, setNewContract] = useState<CreateContractRequest>({
    contract_number: '',
    provider_id: 0,
    unit_id: 0,
    contracting_company_id: 0,
    start_date: '',
    end_date: '',
    term_months: 0,
    monthly_rent: 0
  });
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [showPaymentsModal, setShowPaymentsModal] = useState(false);
  const [selectedContract, setSelectedContract] = useState<ContractCompleteRow | null>(null);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [showCreatePaymentModal, setShowCreatePaymentModal] = useState(false);
  const [creatingPayment, setCreatingPayment] = useState(false);
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
      const [c, u, p, comp] = await Promise.all([getContractsComplete(), getUnits(), getProviders(), getCompanies()]);
      setContracts(c);
      setUnits(u);
      setProviders(p.filter(pr => pr.status === 'Activo'));
      setCompanies(comp.filter(cy => cy.status === 'Activo'));
    } catch (e: any) {
      setErr(e?.message || 'Error cargando datos');
      setContracts([]);
      setUnits([]);
      setProviders([]);
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  };


  const loadPayments = async (contractId: number) => {
    try {
      const data = await getPaymentsByContract(contractId);
      setPayments(data);
    } catch (e: any) {
      setErr(e?.message || 'Error cargando pagos');
      setPayments([]);
    }
  };

  const handleViewPayments = (contract: ContractCompleteRow) => {
    setSelectedContract(contract);
    setShowPaymentsModal(true);
    loadPayments(contract.id);
  };

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedContract) return;

    try {
      setCreatingPayment(true);
      setErr('');

      const payment = await createPayment({
        ...newPayment,
        contract_id: selectedContract.id
      });

      if (paymentPdfFile) {
        await uploadPaymentPDF(payment.id, paymentPdfFile);
      }

      setShowCreatePaymentModal(false);
      setNewPayment({
        contract_id: 0,
        payment_date: '',
        due_date: '',
        amount: 0,
        payment_method: '',
        status: 'Pendiente'
      });
      setPaymentPdfFile(null);
      await loadPayments(selectedContract.id);
    } catch (e: any) {
      setErr(e?.message || 'Error creando pago');
    } finally {
      setCreatingPayment(false);
    }
  };

  const handleUpdatePaymentStatus = async (paymentId: number, newStatus: 'Pagado' | 'Pendiente' | 'Vencido') => {
    try {
      setErr('');
      await updatePaymentStatus(paymentId, newStatus);
      if (selectedContract) {
        await loadPayments(selectedContract.id);
      }
    } catch (e: any) {
      setErr(e?.message || 'Error actualizando estado del pago');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!pdfFile) {
      setErr('El PDF del contrato es obligatorio');
      return;
    }

    try {
      setSubmitting(true);
      setErr('');

      const created = await createContract(newContract);
      await uploadContractPDF(created.id, pdfFile);

      setShowCreateModal(false);
      setNewContract({
        contract_number: '',
        provider_id: 0,
        unit_id: 0,
        contracting_company_id: 0,
        start_date: '',
        end_date: '',
        term_months: 0,
        monthly_rent: 0
      });
      setPdfFile(null);
      await load();
    } catch (e: any) {
      setErr(e?.message || 'Error creando contrato');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadPDF = (contract: ContractCompleteRow) => {
    if (!contract.contract_pdf_path) {
      setErr('No hay PDF asociado a este contrato');
      return;
    }
    const normalizedPath = contract.contract_pdf_path.replace(/\\/g, '/');
    window.open(`http://localhost:3000/${normalizedPath}`, '_blank');
  };

  useEffect(() => {
    if (newContract.start_date && newContract.end_date) {
      const start = new Date(newContract.start_date);
      const end = new Date(newContract.end_date);

      // Validar que sean fechas completas (evitar años como 0002)
      if (start.getFullYear() > 2000 && end.getFullYear() > 2000) {
        const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
        // Solo actualizar si el cálculo es diferente para evitar loops infinitos
        // y asegurar que sea positivo
        const finalMonths = months > 0 ? months : 1;

        // Evitar loop infinito comparando con el valor actual
        setNewContract(prev => {
          if (prev.term_months === finalMonths) return prev;
          return { ...prev, term_months: finalMonths };
        });
      }
    }
  }, [newContract.start_date, newContract.end_date]);

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-slate-800">Gestión de Contratos</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Registrar Contrato
        </button>
      </div>

      {err && <div className="mb-4 text-sm text-red-600">{err}</div>}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">No. Contrato</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Proveedor</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Empresa</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Unidad</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Vigencia</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Estatus</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">PDF</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Pagos</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {loading ? (
              <tr><td colSpan={8} className="px-6 py-4 text-sm text-slate-500">Cargando…</td></tr>
            ) : contracts.length === 0 ? (
              <tr><td colSpan={8} className="px-6 py-4 text-sm text-slate-500">Sin resultados.</td></tr>
            ) : (
              contracts.map((c, i) => (
                <tr key={c.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{c.contract_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{c.provider_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{c.company_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{c.unit_economic_number} ({c.unit_license_plate})</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {fmt(c.start_date)} - {fmt(c.end_date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={c.status} /></td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {c.contract_pdf_path ? (
                      <button
                        onClick={() => handleDownloadPDF(c)}
                        className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Descargar
                      </button>
                    ) : (
                      <span className="text-slate-400">Sin PDF</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => handleViewPayments(c)}
                      className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                      Ver Pagos
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-xl font-bold text-slate-800">Registrar Nuevo Contrato</h3>
            </div>
            <form onSubmit={handleCreateContract} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Número de Contrato *</label>
                  <input
                    type="text"
                    required
                    value={newContract.contract_number}
                    onChange={e => setNewContract({ ...newContract, contract_number: e.target.value })}
                    className="w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Proveedor *</label>
                  <select
                    required
                    value={newContract.provider_id}
                    onChange={e => setNewContract({ ...newContract, provider_id: parseInt(e.target.value) })}
                    className="w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Seleccione proveedor</option>
                    {providers.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Unidad *</label>
                  <select
                    required
                    value={newContract.unit_id}
                    onChange={e => setNewContract({ ...newContract, unit_id: parseInt(e.target.value) })}
                    className="w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Seleccione unidad</option>
                    {units.map(u => (
                      <option key={u.id} value={u.id}>{u.economic_number} - {u.license_plate}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Empresa Contratante *</label>
                  <select
                    required
                    value={newContract.contracting_company_id}
                    onChange={e => setNewContract({ ...newContract, contracting_company_id: parseInt(e.target.value) })}
                    className="w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Seleccione empresa</option>
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Inicio *</label>
                  <input
                    type="date"
                    required
                    value={newContract.start_date}
                    onChange={e => setNewContract({ ...newContract, start_date: e.target.value })}
                    className="w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Fin *</label>
                  <input
                    type="date"
                    required
                    value={newContract.end_date}
                    onChange={e => setNewContract({ ...newContract, end_date: e.target.value })}
                    className="w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Plazo (meses) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newContract.term_months}
                    onChange={e => setNewContract({ ...newContract, term_months: parseInt(e.target.value) })}
                    className="w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Renta Mensual *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={newContract.monthly_rent}
                    onChange={e => setNewContract({ ...newContract, monthly_rent: parseFloat(e.target.value) })}
                    className="w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">PDF del Contrato *</label>
                  <input
                    type="file"
                    required
                    accept=".pdf"
                    onChange={e => setPdfFile(e.target.files?.[0] || null)}
                    className="w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                  {pdfFile && <span className="text-sm text-slate-600 mt-1">{pdfFile.name}</span>}
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
                  {submitting ? 'Guardando...' : 'Registrar Contrato'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPaymentsModal && selectedContract && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[50] flex items-center justify-center p-4" onClick={() => setShowPaymentsModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto pointer-events-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-200 flex justify-between items-center relative z-10">
              <h3 className="text-xl font-bold text-slate-800">Pagos - Contrato {selectedContract.contract_number}</h3>
              <button
                onClick={() => setShowPaymentsModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <div className="flex justify-between items-center mb-4 relative z-10">
                <h4 className="text-lg font-semibold text-slate-700">Historial de Pagos</h4>
                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentsModal(false);
                    setTimeout(() => {
                      setShowCreatePaymentModal(true);
                    }, 0);
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Registrar Pago
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Fecha Pago</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Fecha Vencimiento</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Monto</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Método</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Estatus</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Comprobante</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {payments.length === 0 ? (
                      <tr><td colSpan={7} className="px-6 py-4 text-sm text-slate-500">Sin pagos registrados.</td></tr>
                    ) : (
                      payments.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{fmt(p.payment_date)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{fmt(p.due_date)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">${Number(p.amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{p.payment_method || '—'}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <StatusBadge status={p.status} />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {p.payment_pdf_path ? (
                              <button
                                onClick={() => window.open(`http://localhost:3000/${p.payment_pdf_path!.replace(/\\/g, '/')}`, '_blank')}
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
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCreatePaymentModal && selectedContract && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-70 z-[200]"
            onClick={() => setShowCreatePaymentModal(false)}
          />
          <div className="fixed inset-0 z-[201] flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto pointer-events-auto">
              <div className="p-6 border-b border-slate-200">
                <h3 className="text-xl font-bold text-slate-800">Registrar Nuevo Pago</h3>
              </div>
              <form onSubmit={handleCreatePayment} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Contrato</label>
                    <input
                      type="text"
                      value={selectedContract.contract_number}
                      disabled
                      className="w-full border-slate-300 rounded-md shadow-sm bg-slate-100"
                    />
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
                    onClick={() => setShowCreatePaymentModal(false)}
                    className="px-4 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={creatingPayment}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {creatingPayment ? 'Guardando...' : 'Registrar Pago'}
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
