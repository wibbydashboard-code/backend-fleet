import React, { useEffect, useState } from 'react';

const fmt = (d?: string | null) => {
  if (!d) return '';
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? '' : dt.toLocaleDateString('es-MX');
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const s = status.toLowerCase();
  if (s === 'pagado')
    return <span className="px-2 inline-flex text-xs font-semibold rounded-full bg-green-100 text-green-800">Pagado</span>;
  if (s === 'vencido')
    return <span className="px-2 inline-flex text-xs font-semibold rounded-full bg-red-100 text-red-800">Vencido</span>;
  if (s === 'pendiente')
    return <span className="px-2 inline-flex text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Pendiente</span>;
  return <span className="px-2 inline-flex text-xs font-semibold rounded-full bg-slate-100 text-slate-800">{status}</span>;
};

interface Provider {
  id: number;
  name: string;
  type: string;
  status: string;
}

interface Summary {
  total_paid: number;
  total_pending: number;
  total_overdue: number;
}

interface Payment {
  id: number;
  contract_id: number;
  contract_name: string;
  payment_date: string;
  due_date: string;
  amount: number;
  status: string;
  payment_method: string;
  pdf_path: string | null;
}

interface Statement {
  provider: Provider;
  summary: Summary;
  payments: Payment[];
}

interface ProviderStatementViewProps {
  providerId: number;
  onBack: () => void;
}

export const ProviderStatementView: React.FC<ProviderStatementViewProps> = ({ providerId, onBack }) => {
  const [statement, setStatement] = useState<Statement | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      setErr('');
      const res = await fetch(`http://localhost:3000/api/providers/${providerId}/statement`);
      if (!res.ok) {
        if (res.status === 404) {
          setErr('Proveedor no encontrado');
        } else {
          throw new Error('Error fetching statement');
        }
        return;
      }
      const json = await res.json();
      setStatement(json.data);
    } catch (e: any) {
      setErr(e?.message || 'Error cargando estado de cuenta');
      setStatement(null);
    } finally {
      setLoading(false);
    }
  };

  const handleViewPDF = (payment: Payment) => {
    if (!payment.pdf_path) return;
    const normalizedPath = payment.pdf_path.replace(/\\/g, '/');
    window.open(`http://localhost:3000/${normalizedPath}`, '_blank');
  };

  useEffect(() => {
    load();
  }, [providerId]);

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="text-center py-8 text-slate-500">Cargando estado de cuenta…</div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <button onClick={onBack} className="text-blue-600 hover:text-blue-900 mb-4">← Regresar</button>
        <div className="text-center py-8 text-red-600">{err}</div>
      </div>
    );
  }

  if (!statement) {
    return null;
  }

  const { provider, summary, payments } = statement;

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <button onClick={onBack} className="text-blue-600 hover:text-blue-900 mb-6">← Regresar a Proveedores</button>

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">{provider.name}</h2>
        <p className="text-sm text-slate-500">Estado de Cuenta - {provider.type}</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm font-medium text-green-800">Total Pagado</p>
          <p className="text-2xl font-bold text-green-900">
            ${Number(summary.total_paid).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm font-medium text-yellow-800">Total Pendiente</p>
          <p className="text-2xl font-bold text-yellow-900">
            ${Number(summary.total_pending).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm font-medium text-red-800">Total Vencido</p>
          <p className="text-2xl font-bold text-red-900">
            ${Number(summary.total_overdue).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Contrato</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Fecha Pago</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Vencimiento</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Monto</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Estatus</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Método</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Comprobante</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {payments.length === 0 ? (
              <tr><td colSpan={7} className="px-6 py-4 text-sm text-slate-500">Sin movimientos.</td></tr>
            ) : (
              payments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{p.contract_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{fmt(p.payment_date)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{fmt(p.due_date)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                    ${Number(p.amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={p.status} /></td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{p.payment_method || '—'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {p.pdf_path ? (
                      <button
                        onClick={() => handleViewPDF(p)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Ver
                      </button>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};