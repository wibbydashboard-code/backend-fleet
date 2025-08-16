// Reports.tsx
import React, { useEffect, useMemo, useState } from "react";
import { getPaymentsReport, getContracts, type ContractRow, type PaymentRow } from "@/lib/api";

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
  const to   = new Date(y, (m ?? 1), 0); // último día del mes
  from.setHours(0,0,0,0); to.setHours(23,59,59,999);
  const fmt = (d: Date) => d.toISOString().slice(0,10);
  return { from: fmt(from), to: fmt(to) };
};
// mes actual "YYYY-MM"
const currentYM = (() => {
  const d = new Date(); const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${d.getFullYear()}-${mm}`;
})();

/* ===================== COSTOS ===================== */
const CostsReport: React.FC = () => {
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [from, setFrom] = useState(currentYM);
  const [to, setTo] = useState(currentYM);
  const [company, setCompany] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const run = async () => {
    try {
      setLoading(true); setErr("");
      const r1 = monthToRange(from);
      const r2 = monthToRange(to);
      const data = await getPaymentsReport({
        from: r1.from,
        to:   r2.to,
        ...(company ? { company } : {}),
      });
      setRows(data);
    } catch (e: any) {
      setErr(e?.message ?? "Error generando reporte");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { run().catch(console.error); }, []);

  const companies = useMemo(
    () => Array.from(new Set(rows.map(r => r.company).filter(Boolean))) as string[],
    [rows]
  );

  const group = useMemo(() => {
    const acc: Record<string, { unit: string; company?: string | null; rent: number; insurance: number; total: number; }> = {};
    rows
      .filter(r => !company || r.company === company)
      .forEach(r => {
        const key = r.unit || "—";
        if (!acc[key]) acc[key] = { unit: key, company: r.company, rent: 0, insurance: 0, total: 0 };
        if (r.type === "rent")       acc[key].rent      += Number(r.amount || 0);
        if (r.type === "insurance")  acc[key].insurance += Number(r.amount || 0);
        acc[key].total = acc[key].rent + acc[key].insurance;
      });
    return Object.values(acc).sort((a,b)=>a.unit.localeCompare(b.unit));
  }, [rows, company]);

  const grandTotal = useMemo(() => group.reduce((s, r) => s + r.total, 0), [group]);

  // Exportar CSV
  const exportCSV = () => {
    const header = ["Unidad","Empresa","Costo Renta","Costo Seguro","Costo Total"];
    const lines = group.map(g => [g.unit, g.company ?? "", g.rent, g.insurance, g.total]);
    const total = ["TOTAL", company ? company.toUpperCase() : "", "", "", grandTotal];
    const csv = [header, ...lines, total]
      .map(cols => cols.map(v => `"${String(v).replace(/"/g,'""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `reporte_costos_${from}_a_${to}.csv`;
    a.click();
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <p className="text-sm text-slate-500 mb-6">Combine filtros para crear un reporte de costos y expórtelo.</p>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6 p-4 bg-slate-50 rounded-lg border">
        <div className="md:col-span-1">
          <label className="block text-sm font-medium text-slate-700">Empresa</label>
          <select className="mt-1 block w-full pl-3 pr-10 py-2 border-slate-300 rounded-md"
                  value={company} onChange={(e) => setCompany(e.target.value)}>
            <option value="">Todas</option>
            {companies.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Desde</label>
          <input type="month" className="mt-1 block w-full pl-3 pr-10 py-2 border-slate-300 rounded-md"
                 value={from} onChange={(e)=>setFrom(e.target.value)} />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Hasta</label>
          <input type="month" className="mt-1 block w-full pl-3 pr-10 py-2 border-slate-300 rounded-md"
                 value={to} onChange={(e)=>setTo(e.target.value)} />
        </div>

        <div className="self-end">
          <button className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-lg disabled:opacity-60"
                  onClick={run} disabled={loading}>
            {loading ? "Generando…" : "Generar"}
          </button>
        </div>

        <div className="self-end">
          <button className="w-full bg-slate-700 hover:bg-slate-800 text-white font-bold py-2 px-4 rounded-lg"
                  onClick={exportCSV} disabled={group.length===0}>
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
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Costo Renta</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Costo Seguro</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Costo Total</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {group.map((g, idx) => (
              <tr key={g.unit + idx} className={idx % 2 ? "bg-slate-50" : "bg-white"}>
                <td className="px-6 py-4 text-sm font-medium text-slate-900">{g.unit}</td>
                <td className="px-6 py-4 text-sm text-slate-500">{g.company || "—"}</td>
                <td className="px-6 py-4 text-sm text-slate-500">{mxn(g.rent)}</td>
                <td className="px-6 py-4 text-sm text-slate-500">{mxn(g.insurance)}</td>
                <td className="px-6 py-4 text-sm font-semibold text-slate-800">{mxn(g.total)}</td>
              </tr>
            ))}
            {group.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-4 text-sm text-slate-500">{loading ? "Cargando…" : "Sin resultados."}</td></tr>
            )}
          </tbody>
          <tfoot className="bg-slate-100">
            <tr>
              <td colSpan={4} className="px-6 py-3 text-right text-sm font-bold text-slate-700">
                TOTAL {company ? `PARA '${company.toUpperCase()}'` : ""}
              </td>
              <td className="px-6 py-3 text-left text-sm font-bold text-slate-900">{mxn(grandTotal)}</td>
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
  const [company, setCompany] = useState<string>("");
  const [windowDays, setWindowDays] = useState<number>(30);
  const [type, setType] = useState<string>(""); // "contract" | "policy"
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true); setErr("");
        const c = await getContracts();
        setContracts(c ?? []);
      } catch (e:any) {
        setErr(e?.message ?? "Error cargando vencimientos");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const companies = useMemo(
    () => Array.from(new Set(contracts.map(c => c.company).filter(Boolean))) as string[],
    [contracts]
  );

  const today = new Date(); today.setHours(0,0,0,0);

  const items = useMemo(() => {
    return contracts
      .filter(c => !company || c.company === company)
      .filter(c => !type || c.type === type) // ojo: aquí esperamos "contract"|"policy"
      .map(c => {
        const end = c.end_date ? new Date(c.end_date) : undefined;
        end?.setHours(0,0,0,0);
        const days = end ? Math.ceil((+end - +today) / 86400000) : NaN;
        return {
          unit: c.unit,
          concept: c.type === "contract" ? "Fin de Contrato" : "Fin de Póliza",
          ref: c.num,
          endDate: end ? end.toLocaleDateString("es-MX") : "",
          daysRemaining: days,
          company: c.company || "",
          type: c.type
        };
      })
      .filter(i => !Number.isNaN(i.daysRemaining))
      .filter(i => i.daysRemaining >= 0 && i.daysRemaining <= windowDays)
      .sort((a,b)=>a.daysRemaining - b.daysRemaining);
  }, [contracts, company, type, windowDays, today]);

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <p className="text-sm text-slate-500 mb-6">
        Filtre para ver los próximos vencimientos de contratos y pólizas.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-slate-50 rounded-lg border">
        <select className="block w-full pl-3 pr-10 py-2 border-slate-300 rounded-md"
                value={company} onChange={(e)=>setCompany(e.target.value)}>
          <option value="">Todas las Empresas</option>
          {companies.map(c=> <option key={c} value={c}>{c}</option>)}
        </select>

        <select className="block w-full pl-3 pr-10 py-2 border-slate-300 rounded-md"
                value={windowDays} onChange={(e)=>setWindowDays(Number(e.target.value))}>
          <option value={30}>Próximos 30 días</option>
          <option value={60}>Próximos 60 días</option>
          <option value={90}>Próximos 90 días</option>
        </select>

        <select className="block w-full pl-3 pr-10 py-2 border-slate-300 rounded-md"
                value={type} onChange={(e)=>setType(e.target.value)}>
          <option value="">Todos los Tipos</option>
          <option value="contract">Contrato (renta)</option>
          <option value="policy">Póliza (seguro)</option>
        </select>

        <div className="self-end">
          <button className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-lg"
                  onClick={() => { /* ya filtra con estado */ }}>
            Buscar
          </button>
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

/* ===================== CONTENEDOR TABS ===================== */
export const Reports: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ReportTab>("costos");
  return (
    <div>
      <div className="border-b border-slate-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("costos")}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "costos" ? "border-blue-500 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            Reporte de Costos
          </button>
          <button
            onClick={() => setActiveTab("vencimientos")}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "vencimientos" ? "border-blue-500 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            Reporte de Vencimientos
          </button>
        </nav>
      </div>

      {activeTab === "costos" ? <CostsReport /> : <ExpirationsReport />}
    </div>
  );
};
