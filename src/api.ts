const API_BASE = 'http://localhost:3000/api';

export type StatsResponse = {
  ok: boolean;
  stats: {
    units: number;
    active: number;
    next30: number;
    overdue: number;
  };
  nextExp: Array<{
    type: string;
    unit?: string;
    contract_number?: string;
    days_left: number;
  }>;
};

export async function getStats(): Promise<StatsResponse> {
  const res = await fetch(`${API_BASE}/stats`);
  if (!res.ok) throw new Error('Error fetching stats');
  return await res.json();
}

export type UnitRow = {
  id: number;
  economic_number: string;
  license_plate?: string | null;
  serial_number?: string | null;
  type?: string | null;
  brand?: string | null;
  model?: string | null;
  year?: number | null;
  assigned_company_id?: number;
  assigned_provider_id?: number | null;
  status?: string | null;
  company_name?: string | null;
};

export async function getUnits(params: { q?: string; status?: string; company?: string } = {}): Promise<UnitRow[]> {
  const url = new URL(`${API_BASE}/units`);
  if (params.q) url.searchParams.append('q', params.q);
  if (params.status) url.searchParams.append('status', params.status);
  if (params.company) url.searchParams.append('company', params.company);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Error fetching units');
  const data = await res.json();
  return data.data || [];
}

export type CreateUnitRequest = {
  economic_number: string;
  license_plate: string;
  serial_number: string;
  type: string;
  brand: string;
  model: string;
  year: number;
  assigned_company_id: number;
  assigned_provider_id?: number;
};

export async function createUnit(data: CreateUnitRequest): Promise<UnitRow> {
  const res = await fetch(`${API_BASE}/units`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Error creating unit');
  }
  const result = await res.json();
  return result.data;
}

export async function updateUnitStatus(unitId: number, status: 'Activo' | 'Baja'): Promise<UnitRow> {
  const res = await fetch(`${API_BASE}/units/${unitId}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
  if (!res.ok) {
    const err = await res.json();
    if (err.error === 'UNIT_HAS_ACTIVE_CONTRACTS') {
      throw new Error('UNIT_HAS_ACTIVE_CONTRACTS');
    }
    throw new Error(err.error || 'Error updating unit status');
  }
  const result = await res.json();
  return result.data;
}

export type PaymentRow = {
  id: number;
  contract_id: number;
  period?: string;
  status: 'Pagado' | 'Pendiente' | 'Vencido';
  amount: number;
  payment_date?: string;
  due_date?: string;
  type?: string;
  payment_method?: string;
  payment_pdf_path?: string | null;
  created_at?: string | null;
  contract_number?: string;
  company?: string;
  unit?: string;
  unit_economic_number?: string | null;
  company_name?: string | null;
  provider_id?: number;
  provider_name?: string;
};

export async function getPaymentsReport(params: { from?: string; to?: string; company?: string } = {}): Promise<PaymentRow[]> {
  const url = new URL(`${API_BASE}/payments/report`);
  if (params.from) url.searchParams.append('from', params.from);
  if (params.to) url.searchParams.append('to', params.to);
  if (params.company) url.searchParams.append('company', params.company);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Error fetching payments report');
  const data = await res.json();
  return data.data || [];
}

export type ContractRow = {
  id: number;
  contract_number: string;
  provider_id: number;
  unit_id: number;
  contracting_company_id: number;
  start_date: string;
  end_date: string;
  term_months: number;
  monthly_rent: number;
};

export async function getContracts(): Promise<ContractRow[]> {
  const res = await fetch(`${API_BASE}/contracts`);
  if (!res.ok) throw new Error('Error fetching contracts');
  const json = await res.json();
  return json.data || [];
}

export type ContractDisplayRow = {
  id: number;
  type: 'contract' | 'policy';
  num: string;
  prov: string;
  company: string | null;
  unit: string;
  start_date: string | null;
  end_date: string | null;
};

export async function getContractsDisplay(): Promise<ContractDisplayRow[]> {
  const res = await fetch(`${API_BASE}/contracts`);
  if (!res.ok) throw new Error('Error fetching contracts');
  const json = await res.json();
  return (json.data || []).map((c: any) => ({
    id: c.id,
    type: 'contract' as const,
    num: c.contract_number,
    prov: c.provider_name || `Proveedor ${c.provider_id}`,
    company: c.company_name || null,
    unit: c.unit_economic_number || `Unit ${c.unit_id}`,
    start_date: c.start_date,
    end_date: c.end_date
  }));
}

export type ContractCompleteRow = {
  id: number;
  contract_number: string;
  provider_id: number;
  provider_name: string;
  unit_id: number;
  unit_economic_number: string;
  unit_license_plate: string;
  contracting_company_id: number;
  company_name: string;
  start_date: string;
  end_date: string;
  term_months: number;
  monthly_rent: string;
  is_active: number;
  contract_pdf_path: string | null;
  status: 'Activo' | 'Vencido';
};

export async function getContractsComplete(filters: { unit_id?: number; company_id?: number } = {}): Promise<ContractCompleteRow[]> {
  const url = new URL(`${API_BASE}/contracts/complete`);
  if (filters.unit_id) url.searchParams.append('unit_id', String(filters.unit_id));
  if (filters.company_id) url.searchParams.append('company_id', String(filters.company_id));

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Error fetching contracts complete');
  const json = await res.json();
  return json.data || [];
}

export type CreateContractRequest = {
  contract_number: string;
  provider_id: number;
  unit_id: number;
  contracting_company_id: number;
  start_date: string;
  end_date: string;
  term_months: number;
  monthly_rent: number;
};

export async function createContract(data: CreateContractRequest): Promise<ContractCompleteRow> {
  const res = await fetch(`${API_BASE}/contracts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Error creating contract');
  }
  const result = await res.json();
  return result.data;
}

export async function uploadContractPDF(contractId: number, file: File): Promise<ContractCompleteRow> {
  const formData = new FormData();
  formData.append('pdf', file);

  const res = await fetch(`${API_BASE}/contracts/${contractId}/upload`, {
    method: 'POST',
    body: formData
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Error uploading PDF');
  }
  const result = await res.json();
  return result.data;
}

export type ProviderRow = {
  id: number;
  name: string;
  type: 'arrendador' | 'aseguradora';
  rfc: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  status: 'Activo' | 'Inactivo';
};

export async function getProviders(): Promise<ProviderRow[]> {
  const res = await fetch(`${API_BASE}/providers`);
  if (!res.ok) throw new Error('Error fetching providers');
  const json = await res.json();
  return json.data || [];
}

export type CreateProviderRequest = {
  name: string;
  type: 'arrendador' | 'aseguradora';
  rfc?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
};

export async function createProvider(data: CreateProviderRequest): Promise<ProviderRow> {
  const res = await fetch(`${API_BASE}/providers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Error creating provider');
  return await res.json().then(json => json.data);
}

export type UpdateProviderRequest = {
  name: string;
  rfc?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
};

export async function updateProvider(providerId: number, data: UpdateProviderRequest): Promise<ProviderRow> {
  const res = await fetch(`${API_BASE}/providers/${providerId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Error updating provider');
  return await res.json().then(json => json.data);
}

export async function updateProviderStatus(providerId: number, status: 'Activo' | 'Inactivo'): Promise<ProviderRow> {
  const res = await fetch(`${API_BASE}/providers/${providerId}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Error updating provider status');
  }
  const result = await res.json();
  return result.data;
}

export type CreatePaymentRequest = {
  contract_id: number;
  payment_date?: string;
  due_date?: string;
  amount: number;
  payment_method?: string;
  status?: 'Pagado' | 'Pendiente' | 'Vencido';
};

export async function createPayment(data: CreatePaymentRequest): Promise<PaymentRow> {
  const res = await fetch(`${API_BASE}/payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Error creating payment');
  }
  const result = await res.json();
  return result.data;
}

export async function getPayments(filters: { contract_id?: number; status?: string } = {}): Promise<PaymentRow[]> {
  const url = new URL(`${API_BASE}/payments`);
  if (filters.contract_id) url.searchParams.append('contract_id', String(filters.contract_id));
  if (filters.status) url.searchParams.append('status', filters.status);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Error fetching payments');
  const data = await res.json();
  return data.data || [];
}

export async function getPaymentsByContract(contractId: number): Promise<PaymentRow[]> {
  const res = await fetch(`${API_BASE}/payments/by-contract/${contractId}`);
  if (!res.ok) throw new Error('Error fetching payments by contract');
  const json = await res.json();
  return json.data || [];
}

export async function updatePaymentStatus(paymentId: number, status: 'Pagado' | 'Pendiente' | 'Vencido'): Promise<PaymentRow> {
  const res = await fetch(`${API_BASE}/payments/${paymentId}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Error updating payment status');
  }
  const result = await res.json();
  return result.data;
}

export async function uploadPaymentPDF(paymentId: number, file: File): Promise<PaymentRow> {
  const formData = new FormData();
  formData.append('pdf', file);

  const res = await fetch(`${API_BASE}/payments/${paymentId}/upload`, {
    method: 'POST',
    body: formData
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Error uploading payment PDF');
  }
  const result = await res.json();
  return result.data;
}
