
import React from 'react';
import { Unit } from '../types';
import { COMPANIES, CONTRACTS, POLICIES, DOCUMENTS, PAYMENTS } from '../constants';
import { CloseIcon, PdfIcon } from './Icons';

interface UnitDetailModalProps {
    unit: Unit;
    onClose: () => void;
}

export const UnitDetailModal: React.FC<UnitDetailModalProps> = ({ unit, onClose }) => {
    const company = COMPANIES.find(c => c.id === unit.assigned_company_id);
    const contract = CONTRACTS.find(c => c.unit_id === unit.id);
    const policy = POLICIES.find(p => p.unit_id === unit.id);
    const documents = DOCUMENTS.filter(d => d.related_id === unit.id);
    const payments = contract ? PAYMENTS.filter(p => p.contract_id === contract.id) : [];

    const progress = contract ? Math.round((35 / contract.term_months) * 100) : 0; // Example progress

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="sticky top-0 bg-white p-6 border-b border-slate-200 flex justify-between items-center rounded-t-xl">
                    <h2 className="text-xl font-bold text-slate-800">Detalles de la Unidad: {unit.economic_number}</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <CloseIcon />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        {/* Info Column */}
                        <div className="space-y-6">
                            <div>
                                <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Información General</h4>
                                <p><span className="font-medium text-slate-800">Tipo:</span> {unit.type}</p>
                                <p><span className="font-medium text-slate-800">Marca:</span> {unit.brand}</p>
                                <p><span className="font-medium text-slate-800">Placa:</span> {unit.license_plate}</p>
                                <p><span className="font-medium text-slate-800">Empresa Asignada:</span> {company?.name}</p>
                            </div>
                            {contract && (
                                <div>
                                    <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Contrato de Arrendamiento</h4>
                                    <p><span className="font-medium text-slate-800">Proveedor:</span> {contract.provider}</p>
                                    <p><span className="font-medium text-slate-800">No. Contrato:</span> {contract.contract_number}</p>
                                    <p><span className="font-medium text-slate-800">Vigencia:</span> {new Date(contract.start_date).toLocaleDateString()} - {new Date(contract.end_date).toLocaleDateString()}</p>
                                    <p><span className="font-medium text-slate-800">Renta Mensual:</span> {contract.monthly_rent.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })} + IVA</p>
                                    <div className="mt-2">
                                        <div className="flex justify-between mb-1"><span className="text-sm font-medium text-blue-700">Progreso del Contrato</span><span className="text-sm font-medium text-blue-700">Mes 35 de {contract.term_months}</span></div>
                                        <div className="w-full bg-slate-200 rounded-full h-2.5"><div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div></div>
                                    </div>
                                </div>
                            )}
                            {policy && (
                                <div>
                                    <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Póliza de Seguro</h4>
                                    <p><span className="font-medium text-slate-800">Aseguradora:</span> {policy.insurer}</p>
                                    <p><span className="font-medium text-slate-800">No. Póliza:</span> {policy.policy_number}</p>
                                    <p><span className="font-medium text-slate-800">Vigencia:</span> {new Date(policy.start_date).toLocaleDateString()} - {new Date(policy.end_date).toLocaleDateString()}</p>
                                    <p><span className="font-medium text-slate-800">Estado:</span> <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${policy.status === 'Vigente' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{policy.status}</span></p>
                                </div>
                            )}
                        </div>
                        {/* Documents & Payments Column */}
                        <div className="space-y-6">
                            <div>
                                <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">📄 Archivos Adjuntos</h4>
                                <ul className="divide-y divide-slate-200 border rounded-lg">
                                    {documents.map(doc => (
                                        <li key={doc.id} className="p-3 flex justify-between items-center hover:bg-slate-50"><div className="flex items-center"><PdfIcon /><p>{doc.name}</p></div><a href="#" className="text-blue-600 text-sm font-medium hover:underline">Ver</a></li>
                                    ))}
                                </ul>
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Historial de Pagos Recientes (Renta)</h4>
                                <ul className="divide-y divide-slate-200 border rounded-lg">
                                    {payments.map(payment => (
                                         <li key={payment.id} className={`p-3 flex justify-between items-center ${payment.status === 'Pendiente' ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                                            <p>Pago {payment.period}</p>
                                            {payment.status === 'Pagado' ? (
                                                 <div className="flex items-center"><span className="font-medium text-green-600 mr-4">Pagado</span><a href="#" className="text-blue-600 text-sm font-medium hover:underline">Ver Factura</a></div>
                                            ) : (
                                                <span className="font-medium text-amber-600">Pendiente</span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
