// src/api.ts
const API_URL = import.meta.env.VITE_API_URL || 'https://fleet.mentoresestrategicos.com/api';

async function j<T>(r: Response): Promise<T> {
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}
async function get<T>(path: string): Promise<T> {
  return j<T>(await fetch(`${API_URL}/${path}`, { credentials: 'omit' }));
}

// === EXPORTS NOMBRADOS ===
export async function getStats() {
  // { ok, stats, nextExp, nextPolicies }
  return get<{ ok: boolean; stats: any; nextExp: any[]; nextPolicies: any[] }>('stats.php');
}

export async function getUnits() {
  // espera un array de unidades desde units_list.php
  return get<any[]>('units_list.php');
}

export async function getContracts() {
  return get<any[]>('contracts_list.php');
}

export async function getPaymentsReport() {
  return get<any>('report_payments.php');
}
