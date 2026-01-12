// Reports.tsx
import React, { useEffect, useMemo, useState } from "react";
import { getPaymentsReport, getContracts, getProviders, getContractsComplete, getCompanies, getPayments, getPaymentsByContract, getAuditLogs, type ContractRow, type PaymentRow, type ProviderRow, type ContractCompleteRow, type CompanyRow, type AuditLogRow } from "@/api";

type ReportTab = "costos" | "vencimientos";

const getDaysRemainingColor = (days: number) => {
  if (days <= 7) return "text-red-600";
  if (days <= 15) return "text-amber-600";
  return "text-slate-600";
};
const mxn = (v: number) => (Number(v) || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });

// Helpers fechas (primer/último día del mes desde "YYYY-MM")
const monthToRange = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  const from = new Date(y, (m ?? 1) - 1, 1);
  const to = new Date(y, (m ?? 1), 0); // último día del mes
  from.setHours(0, 0, 0, 0); to.setHours(23, 59, 59, 999);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { from: fmt(from), to: fmt(to) };
};
// mes actual "YYYY-MM"
const currentYM = (() => {
  const d = new Date(); const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${d.getFullYear()}-${mm}`;
})();

const CostsReport: React.FC = () => {
  const [contracts, setContracts] = useState<ContractCompleteRow[]>([]);
  const [reportData, setReportData] = useState<any[]>([]);

  const [from, setFrom] = useState(currentYM);
  const [to, setTo] = useState(currentYM);

  const [companyId, setCompanyId] = useState<string>("");
  const [providerId, setProviderId] = useState<string>("");

  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [companiesList, setCompaniesList] = useState<CompanyRow[]>([]);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // Cargar catalogos iniciales
  useEffect(() => {
    const init = async () => {
      try {
        const [p, c, allC] = await Promise.all([
          getProviders(),
          getCompanies(),
          getContractsComplete()
        ]);
        setProviders(p.filter(x => x.status === 'Activo'));
        setCompaniesList(c.filter(x => x.status === 'Activo'));
        setContracts(allC);
      } catch (e: any) {
        setErr("Error cargando datos iniciales: " + e.message);
      }
    };
    init();
  }, []);

  const handleGenerateReport = () => {
    setLoading(true);
    setErr("");
    setReportData([]);

    try {
      if (!from || !to) throw new Error("Seleccione fechas válidas");

      const dFrom = new Date(from + "-01");
      dFrom.setHours(0, 0, 0, 0);

      const dTo = new Date(to + "-01");
      dTo.setMonth(dTo.getMonth() + 1);
      dTo.setDate(0);
      dTo.setHours(23, 59, 59, 999);

      // Filtrar contratos que coincidan con filtros de UI
      const filtered = contracts.filter(c => {
        if (companyId && String(c.contracting_company_id) !== companyId) return false;
        if (providerId && String(c.provider_id) !== providerId) return false;
        return true;
      });

      const results: any[] = [];

      filtered.forEach(c => {
        // Parsear fechas contrato (asegurar compatibilidad de strings y formatos)
        const cStart = new Date(c.start_date);
        cStart.setHours(0, 0, 0, 0);

        const cEnd = new Date(c.end_date);
        cEnd.setHours(23, 59, 59, 999);

        // Intersección de periodos
        const effectiveStart = cStart > dFrom ? cStart : dFrom;
        const effectiveEnd = cEnd < dTo ? cEnd : dTo;

        // Si inicio efectivo es después de fin efectivo, no hay intersección
        if (effectiveStart > effectiveEnd) return;

        // Calcular meses FULL (aprox)
        const startY = effectiveStart.getFullYear();
        const startM = effectiveStart.getMonth();
        const endY = effectiveEnd.getFullYear();
        const endM = effectiveEnd.getMonth();

        // +1 porque si es el mismo mes (ej Enero a Enero) es 1 mes de cobro
        const monthsCount = ((endY - startY) * 12) + (endM - startM) + 1;

        if (monthsCount > 0) {
          const rentCost = Number(c.monthly_rent) * monthsCount;

          results.push({
            unit: `${c.unit_economic_number} - ${c.unit_license_plate}`,
            company: c.company_name,
            rent: rentCost,
            insurance: 0,
            total: rentCost
          });
        }
      });

      setReportData(results);

    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  const groupedData = useMemo(() => {
    const map = new Map<string, any>();

    reportData.forEach(r => {
      const key = r.unit;
      if (!map.has(key)) {
        map.set(key, { ...r });
      } else {
        const item = map.get(key);
        item.rent += r.rent;
        item.total += r.total;
      }
    });

    return Array.from(map.values()).sort((a, b) => a.unit.localeCompare(b.unit));
  }, [reportData]);

  const grandTotal = useMemo(() => groupedData.reduce((acc, curr) => acc + curr.total, 0), [groupedData]);

  const exportCSV = () => {
    const header = ["Unidad", "Empresa", "Costo Renta", "Costo Seguro", "Costo Total"];
    const lines = groupedData.map(g => [g.unit, g.company, g.rent, g.insurance, g.total]);
    const total = ["TOTALES", "", groupedData.reduce((s, x) => s + x.rent, 0), 0, grandTotal];

    const csvContent = [header, ...lines, total]
      .map(row => row.map(val => `"${val}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `reporte_costos_${from}_${to}.csv`);
    document.body.appendChild(link);
    link.click();
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <p className="text-sm text-slate-500 mb-6">Este reporte calcula los costos proyectados basándose en los contratos activos en el periodo seleccionado.</p>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6 p-4 bg-slate-50 rounded-lg border">
        <div className="md:col-span-1">
          <label className="block text-sm font-medium text-slate-700">Empresa</label>
          <select className="mt-1 block w-full pl-3 pr-10 py-2 border-slate-300 rounded-md"
            value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
            <option value="">Todas</option>
            {companiesList.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="md:col-span-1">
          <label className="block text-sm font-medium text-slate-700">Proveedor</label>
          <select className="mt-1 block w-full pl-3 pr-10 py-2 border-slate-300 rounded-md"
            value={providerId} onChange={(e) => setProviderId(e.target.value)}>
            <option value="">Todos</option>
            {providers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Desde</label>
          <input type="month" min="2000-01" className="mt-1 block w-full pl-3 pr-10 py-2 border-slate-300 rounded-md"
            value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Hasta</label>
          <input type="month" min="2000-01" className="mt-1 block w-full pl-3 pr-10 py-2 border-slate-300 rounded-md"
            value={to} onChange={(e) => setTo(e.target.value)} />
        </div>

        <div className="self-end">
          <button className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-lg disabled:opacity-60"
            onClick={handleGenerateReport} disabled={loading}>
            {loading ? "Calculando..." : "Generar"}
          </button>
        </div>

        <div className="self-end">
          <button className="w-full bg-slate-700 hover:bg-slate-800 text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50"
            onClick={exportCSV} disabled={groupedData.length === 0}>
            Exportar CSV
          </button>
        </div>
      </div>

      {err && <div className="mb-4 text-sm text-red-600">{err}</div>}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Unidad</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Empresa</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Costo Renta (Proyectado)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Costo Seguro</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Total</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {groupedData.map((g, idx) => (
              <tr key={idx} className={idx % 2 ? "bg-slate-50" : "bg-white"}>
                <td className="px-6 py-4 text-sm font-medium text-slate-900">{g.unit}</td>
                <td className="px-6 py-4 text-sm text-slate-500">{g.company || "—"}</td>
                <td className="px-6 py-4 text-sm text-slate-500">{mxn(g.rent)}</td>
                <td className="px-6 py-4 text-sm text-slate-500">{mxn(g.insurance)}</td>
                <td className="px-6 py-4 text-sm font-bold text-slate-900">{mxn(g.total)}</td>
              </tr>
            ))}
            {groupedData.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-4 text-sm text-slate-500 text-center">
                {loading ? "Calculando..." : "Haga clic en 'Generar' para visualizar costos."}
              </td></tr>
            )}
          </tbody>
          <tfoot className="bg-slate-100 border-t border-slate-200">
            <tr>
              <td className="px-6 py-3 text-right font-bold text-slate-700" colSpan={4}>GRAN TOTAL</td>
              <td className="px-6 py-3 font-bold text-blue-800 text-lg">{mxn(grandTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

/* ===================== VENCIMIENTOS ===================== */
const ExpirationsReport: React.FC = () => {
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [windowDays, setWindowDays] = useState<number>(30);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true); setErr("");
        const c = await getContracts();
        setContracts(c ?? []);
      } catch (e: any) {
        setErr(e?.message ?? "Error cargando vencimientos");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const today = new Date(); today.setHours(0, 0, 0, 0);

  const items = useMemo(() => {
    return contracts
      .map(c => {
        const end = c.end_date ? new Date(c.end_date) : undefined;
        end?.setHours(0, 0, 0, 0);
        const days = end ? Math.ceil((+end - +today) / 86400000) : NaN;
        return {
          unit: `Unidad ${c.unit_id}`,
          concept: "Fin de Contrato",
          ref: c.contract_number,
          endDate: end ? end.toLocaleDateString("es-MX") : "",
          daysRemaining: days,
        };
      })
      .filter(i => !Number.isNaN(i.daysRemaining))
      .filter(i => i.daysRemaining >= 0 && i.daysRemaining <= windowDays)
      .sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [contracts, windowDays, today]);

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <p className="text-sm text-slate-500 mb-6">
        Filtre para ver los próximos vencimientos de contratos y pólizas.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mb-6 p-4 bg-slate-50 rounded-lg border">
        <div>
          <label className="block text-sm font-medium text-slate-700">Ventana de días</label>
          <select className="mt-1 block w-full pl-3 pr-10 py-2 border-slate-300 rounded-md"
            value={windowDays} onChange={(e) => setWindowDays(Number(e.target.value))}>
            <option value={30}>Próximos 30 días</option>
            <option value={60}>Próximos 60 días</option>
            <option value={90}>Próximos 90 días</option>
          </select>
        </div>
      </div>

      {err && <div className="mb-4 text-sm text-red-600">{err}</div>}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Unidad</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Concepto</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Referencia</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Fecha de Vencimiento</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Días Restantes</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {loading ? (
              <tr><td colSpan={5} className="px-6 py-4 text-sm text-slate-500">Cargando…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-4 text-sm text-slate-500">Sin resultados.</td></tr>
            ) : items.map((exp, idx) => (
              <tr key={exp.ref + idx} className={idx % 2 ? "bg-slate-50" : "bg-white"}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{exp.unit}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{exp.concept}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{exp.ref}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{exp.endDate}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`font-semibold ${getDaysRemainingColor(exp.daysRemaining)}`}>{exp.daysRemaining}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ===================== PAGOS REALIZADOS ===================== */
const RealPaymentsReport: React.FC = () => {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState(currentYM);
  const [to, setTo] = useState(currentYM);
  const [err, setErr] = useState("");

  const handleSearch = async () => {
    setLoading(true);
    setErr("");
    try {
      // Traemos todos los pagos y filtramos en cliente por fecha y estatus
      // (Idealmente el backend soportaría filtros de rango, pero esto funciona para volúmenes moderados)
      const allPayments = await getPayments({ status: 'Pagado' });

      const filtered = allPayments.filter(p => {
        if (!p.payment_date) return false;
        const d = p.payment_date.substring(0, 7); // YYYY-MM
        return d >= from && d <= to;
      });

      setPayments(filtered);
    } catch (error: any) {
      setErr(error.message || "Error cargando pagos");
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = useMemo(() => payments.reduce((sum, p) => sum + Number(p.amount), 0), [payments]);

  const exportCSV = () => {
    if (!payments.length) return;
    const header = ["Fecha Pago", "Contrato", "Monto", "Metodo", "Referencia"];
    const lines = payments.map(p => [
      p.payment_date,
      `Contrato #${p.contract_id}`, // Si tuvieramos el numero de contrato seria mejor, pero el ID sirve de referencia tecnica o hay que hacer join
      p.amount,
      p.payment_method,
      "" // Referencia (no disponible en tipo)
    ]);
    const total = ["TOTAL", "", totalAmount, "", ""];

    const csvContent = [header, ...lines, total]
      .map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `reporte_pagos__realizados_${from}_${to}.csv`);
    document.body.appendChild(link);
    link.click();
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <p className="text-sm text-slate-500 mb-6">Muestra los pagos que han sido marcados como 'Pagado' en el sistema, afectando el flujo de efectivo real.</p>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-slate-50 rounded-lg border">
        <div>
          <label className="block text-sm font-medium text-slate-700">Desde</label>
          <input type="month" min="2000-01" className="mt-1 block w-full pl-3 pr-10 py-2 border-slate-300 rounded-md"
            value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Hasta</label>
          <input type="month" min="2000-01" className="mt-1 block w-full pl-3 pr-10 py-2 border-slate-300 rounded-md"
            value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="self-end">
          <button className="w-full bg-green-600 text-white font-bold py-2 px-4 rounded-lg" onClick={handleSearch} disabled={loading}>
            {loading ? "Buscando..." : "Buscar Pagos"}
          </button>
        </div>
        <div className="self-end">
          <button className="w-full bg-slate-700 text-white font-bold py-2 px-4 rounded-lg" onClick={exportCSV} disabled={payments.length === 0}>
            Exportar CSV
          </button>
        </div>
      </div>

      {err && <div className="text-red-600 mb-4">{err}</div>}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Fecha Pago</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Método</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Monto</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Estatus</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {payments.map(p => (
              <tr key={p.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{p.payment_date}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{p.payment_method}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-800">{mxn(Number(p.amount))}</td>
                <td className="px-6 py-4 whitespace-nowrap"><span className="px-2 inline-flex text-xs font-semibold rounded-full bg-green-100 text-green-800">Pagado</span></td>
              </tr>
            ))}
            {payments.length === 0 && <tr><td colSpan={4} className="px-6 py-4 text-center text-slate-500">No se encontraron pagos realizados en este periodo.</td></tr>}
          </tbody>
          <tfoot className="bg-slate-100">
            <tr>
              <td className="px-6 py-3 text-right font-bold text-slate-700" colSpan={2}>TOTAL PAGADO</td>
              <td className="px-6 py-3 font-bold text-green-800 text-lg">{mxn(totalAmount)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

// URL Base para archivos estáticos (quitando /api si viene de la lógica base)
const FILE_BASE_URL = (import.meta as any).env.PROD
  ? 'https://backend-fleet.onrender.com'
  : 'http://localhost:3000';

const handleDownloadPDF = async (pdfPath: string) => {
  try {
    // Normalizar path (cambiar backslash a slash y asegurar que no empiece con doble slash si ya tiene)
    const cleanPath = pdfPath.replace(/\\/g, '/');
    const url = `${FILE_BASE_URL}/${cleanPath.startsWith('/') ? cleanPath.substring(1) : cleanPath}`;

    // Descargar como blob para forzar descarga real y evitar abrir en pestaña si es posible
    const response = await fetch(url);
    if (!response.ok) throw new Error("No se pudo descargar el archivo");

    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = blobUrl;
    // Extraer nombre de archivo del path
    const filename = cleanPath.split('/').pop() || 'comprobante.pdf';
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(blobUrl);

  } catch (err) {
    console.error("Error descargando PDF:", err);
    alert("Error al intentar descargar el archivo. Verifique que el archivo exista en el servidor.");
  }
};

/* ===================== TABLA DE AMORTIZACIÓN ===================== */
const AmortizationTableReport: React.FC = () => {
  const [contracts, setContracts] = useState<ContractCompleteRow[]>([]);
  const [selectedContractId, setSelectedContractId] = useState<string>("");
  const [amortizationSchedule, setAmortizationSchedule] = useState<any[]>([]);
  const [realPayments, setRealPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getContractsComplete().then(setContracts).catch(console.error);
  }, []);

  const handleGenerateValues = async () => {
    if (!selectedContractId) return;
    setLoading(true);
    setAmortizationSchedule([]);

    try {
      const contract = contracts.find(c => String(c.id) === selectedContractId);
      if (!contract) return;

      // 1. Obtener pagos reales de este contrato
      const payments = await getPaymentsByContract(contract.id);
      setRealPayments(payments);

      const start = new Date(contract.start_date);
      const end = new Date(contract.end_date);
      const rent = Number(contract.monthly_rent);
      const schedule = [];

      let currentDate = new Date(start);
      // Ajuste de Zona Horaria para evitar desfases de día al visualizar
      currentDate.setMinutes(currentDate.getMinutes() + currentDate.getTimezoneOffset());

      let paymentCount = 1;

      while (currentDate <= end) {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        // Formato para mostrar
        const dateStr = currentDate.toISOString().slice(0, 10);

        // Buscar si existe un pago registrado para este MES y AÑO
        // Tolerancia: Buscamos un pago cuya fecha de VENCIMIENTO o PAGO caiga en este mes
        const matchedPayment = payments.find((p: PaymentRow) => {
          const pDate = p.payment_date ? new Date(p.payment_date) : (p.due_date ? new Date(p.due_date) : null);
          if (!pDate) return false;
          // Ajuste simple de zona horaria local
          pDate.setMinutes(pDate.getMinutes() + pDate.getTimezoneOffset());

          return pDate.getFullYear() === year && pDate.getMonth() === month && p.status === 'Pagado';
        });

        schedule.push({
          num: paymentCount++,
          date: dateStr,
          amount: rent,
          accumulated: paymentCount * rent, // Esto se recalculará en render
          status: matchedPayment ? 'Pagado' : (currentDate < new Date() ? 'Vencido/No Registrado' : 'Por Vencer'),
          realPaymentDate: matchedPayment?.payment_date || null,
          pdfPath: matchedPayment?.payment_pdf_path || null,
          rowColor: matchedPayment ? 'bg-green-50' : ''
        });

        // Avanzar 1 mes
        currentDate.setMonth(currentDate.getMonth() + 1);
      }

      setAmortizationSchedule(schedule);

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    if (!amortizationSchedule.length) return;
    const header = ["No. Pago", "Fecha Programada", "Monto Renta", "Estatus", "Fecha Real Pago", "Comprobante"];
    const lines = amortizationSchedule.map(a => [
      a.num, a.date, a.amount, a.status, a.realPaymentDate || "", a.pdfPath ? "SI" : "NO"
    ]);

    const csvContent = [header, ...lines]
      .map(row => row.map(val => `"${val}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `tabla_amortizacion_contrato_${selectedContractId}.csv`);
    document.body.appendChild(link);
    link.click();
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <p className="text-sm text-slate-500 mb-6">Genere el calendario detallado de pagos. Si ya existen pagos registrados para el mes correspondiente, se mostrarán aquí con su estatus y comprobante.</p>

      <div className="flex gap-4 mb-6 items-end">
        <div className="flex-1 max-w-xl">
          <label className="block text-sm font-medium text-slate-700 mb-1">Seleccione Contrato</label>
          <select
            className="w-full border-slate-300 rounded-md"
            value={selectedContractId}
            onChange={e => { setSelectedContractId(e.target.value); setAmortizationSchedule([]); }}
          >
            <option value="">-- Seleccione un contrato --</option>
            {contracts.map(c => (
              <option key={c.id} value={c.id}>
                {c.contract_number} - {c.company_name} ({c.unit_economic_number})
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={handleGenerateValues}
          disabled={!selectedContractId || loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-md disabled:opacity-50 font-bold"
        >
          {loading ? "Generando..." : "Generar Tabla"}
        </button>
        <button
          onClick={exportCSV}
          disabled={!amortizationSchedule.length}
          className="bg-slate-700 text-white px-4 py-2 rounded-md disabled:opacity-50 font-bold"
        >
          Exportar CSV
        </button>
      </div>

      {amortizationSchedule.length > 0 && (
        <div className="overflow-x-auto border rounded-lg">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">No.</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Fecha Programada</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Monto Renta</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Fecha Real Pago</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Estatus</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Comprobante</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {amortizationSchedule.map((row, idx) => (
                <tr key={idx} className={row.rowColor || (idx % 2 ? 'bg-slate-50' : 'bg-white')}>
                  <td className="px-6 py-3 text-sm text-slate-500">{row.num}</td>
                  <td className="px-6 py-3 text-sm font-medium text-slate-900">{row.date}</td>
                  <td className="px-6 py-3 text-sm text-slate-500">{mxn(row.amount)}</td>
                  <td className="px-6 py-3 text-sm text-slate-500">{row.realPaymentDate || '-'}</td>
                  <td className="px-6 py-3 whitespace-nowrap">
                    {row.status === 'Pagado' ? (
                      <span className="px-2 inline-flex text-xs font-semibold rounded-full bg-green-100 text-green-800">Pagado</span>
                    ) : (
                      <span className="px-2 inline-flex text-xs font-semibold rounded-full bg-slate-100 text-slate-600">{row.status}</span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-sm">
                    {row.pdfPath ? (
                      <button
                        onClick={() => handleDownloadPDF(row.pdfPath!)}
                        className="text-blue-600 hover:text-blue-900 flex items-center gap-1 font-semibold hover:underline"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Descargar
                      </button>
                    ) : (
                      <span className="text-slate-300 text-xs">N/A</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

/* ===================== TRAZABILIDAD (AUDIT LOGS) ===================== */
const AuditLogsReport: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const loadLogs = async () => {
    setLoading(true);
    setErr("");
    try {
      const data = await getAuditLogs({ limit: 100 });
      setLogs(data);
    } catch (error: any) {
      setErr(error.message || "Error cargando bitácora");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const formatMetadata = (meta: any) => {
    if (!meta) return "—";
    try {
      const parsed = typeof meta === 'string' ? JSON.parse(meta) : meta;
      return JSON.stringify(parsed, null, 2);
    } catch (e) {
      return String(meta);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex justify-between items-center mb-6">
        <p className="text-sm text-slate-500">Historial detallado de todas las operaciones críticas realizadas en el sistema.</p>
        <button
          onClick={loadLogs}
          disabled={loading}
          className="text-blue-600 hover:text-blue-800 text-sm font-semibold flex items-center gap-1"
        >
          <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Actualizar
        </button>
      </div>

      {err && <div className="text-red-600 mb-4">{err}</div>}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Fecha</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Usuario</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Acción</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Entidad</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Detalles</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {logs.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-4 text-center text-slate-500">{loading ? "Cargando..." : "No hay registros en la bitácora."}</td></tr>
            ) : logs.map(log => (
              <tr key={log.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                  {new Date(log.created_at).toLocaleString('es-MX')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-700 font-medium">
                  {log.user_id || 'Sistema'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 py-1 text-[10px] font-bold uppercase rounded bg-slate-100 text-slate-600 border border-slate-200">
                    {log.action}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                  {log.entity}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-400">
                  {log.entity_id || 'N/A'}
                </td>
                <td className="px-6 py-4 text-xs text-slate-500 max-w-xs truncate">
                  <pre className="text-[10px] bg-slate-50 p-1 rounded overflow-hidden">
                    {formatMetadata(log.metadata)}
                  </pre>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ===================== CONTENEDOR TABS ===================== */
export const Reports: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("costos_proyeccion");

  return (
    <div>
      <div className="border-b border-slate-200 mb-6 overflow-x-auto">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab("costos_proyeccion")}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === "costos_proyeccion" ? "border-blue-500 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              }`}
          >
            Proyección de Costos
          </button>
          <button
            onClick={() => setActiveTab("pagos_reales")}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === "pagos_reales" ? "border-green-500 text-green-600" : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              }`}
          >
            Pagos Realizados
          </button>
          <button
            onClick={() => setActiveTab("amortizacion")}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === "amortizacion" ? "border-purple-500 text-purple-600" : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              }`}
          >
            Tabla de Amortización
          </button>
          <button
            onClick={() => setActiveTab("vencimientos")}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === "vencimientos" ? "border-amber-500 text-amber-600" : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              }`}
          >
            Vencimientos
          </button>
          <button
            onClick={() => setActiveTab("trazabilidad")}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === "trazabilidad" ? "border-slate-500 text-slate-600" : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              }`}
          >
            Bitácora (Logs)
          </button>
        </nav>
      </div>

      {activeTab === "costos_proyeccion" && <CostsReport />}
      {activeTab === "pagos_reales" && <RealPaymentsReport />}
      {activeTab === "amortizacion" && <AmortizationTableReport />}
      {activeTab === "vencimientos" && <ExpirationsReport />}
      {activeTab === "trazabilidad" && <AuditLogsReport />}
    </div>
  );
};
