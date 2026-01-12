const API_BASE = import.meta.env.PROD
  ? 'https://backend-fleet.onrender.com/api'
  : 'http://localhost:3000/api';

function getAuthHeaders() {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const response = await fetch(url, options);

  if (response.status === 401 || response.status === 403) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
    throw new Error('Sesión expirada. Inicia sesión nuevamente.');
  }

  return response;
}

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
  const res = await fetchWithAuth(`${API_BASE}/stats`, {
    headers: getAuthHeaders()
  });
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

  const res = await fetchWithAuth(url.toString(), {
    headers: getAuthHeaders()
  });
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
    headers: getAuthHeaders(),
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
    headers: getAuthHeaders(),
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
  const res = await fetch(`${API_BASE}/contracts`, {
    headers: getAuthHeaders()
  });
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
  const res = await fetch(`${API_BASE}/contracts`, {
    headers: getAuthHeaders()
  });
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

  const res = await fetch(url.toString(), {
    headers: getAuthHeaders()
  });
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
    headers: getAuthHeaders(),
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
  const res = await fetch(`${API_BASE}/providers`, {
    headers: getAuthHeaders()
  });
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
    headers: getAuthHeaders(),
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
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Error updating provider');
  return await res.json().then(json => json.data);
}

export async function updateProviderStatus(providerId: number, status: 'Activo' | 'Inactivo'): Promise<ProviderRow> {
  const res = await fetch(`${API_BASE}/providers/${providerId}/status`, {
    method: 'PUT',
    headers: getAuthHeaders(),
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
    headers: getAuthHeaders(),
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

  const res = await fetch(url.toString(), {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Error fetching payments');
  const data = await res.json();
  return data.data || [];
}

export async function getPaymentsByContract(contractId: number): Promise<PaymentRow[]> {
  const res = await fetch(`${API_BASE}/payments/by-contract/${contractId}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Error fetching payments by contract');
  const json = await res.json();
  return json.data || [];
}

export async function updatePaymentStatus(paymentId: number, status: 'Pagado' | 'Pendiente' | 'Vencido'): Promise<PaymentRow> {
  const res = await fetch(`${API_BASE}/payments/${paymentId}/status`, {
    method: 'PUT',
    headers: getAuthHeaders(),
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

export type CompanyRow = {
  id: number;
  name: string;
  status: 'Activo' | 'Inactivo';
  created_at?: string;
};

export async function getCompanies(): Promise<CompanyRow[]> {
  const res = await fetch(`${API_BASE}/companies`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Error fetching companies');
  const json = await res.json();
  return json.data || [];
}

export async function createCompany(name: string): Promise<CompanyRow> {
  const res = await fetch(`${API_BASE}/companies`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ name })
  });
  if (!res.ok) {
    const err = await res.json();
    if (err.error === 'EMPRESA_DUPLICADA') throw new Error(err.message);
    throw new Error(err.error || 'Error creating company');
  }
  const json = await res.json();
  return json.data;
}

export async function updateCompany(id: number, name: string): Promise<CompanyRow> {
  const res = await fetch(`${API_BASE}/companies/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ name })
  });
  if (!res.ok) {
    const err = await res.json();
    if (err.error === 'EMPRESA_DUPLICADA') throw new Error(err.message);
    throw new Error(err.error || 'Error updating company');
  }
  const json = await res.json();
  return json.data;
}

export async function updateCompanyStatus(id: number, status: 'Activo' | 'Inactivo'): Promise<CompanyRow> {
  const res = await fetch(`${API_BASE}/companies/${id}/status`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ status })
  });
  if (!res.ok) throw new Error('Error updating company status');
  const json = await res.json();
  return json.data;
}

export async function deleteCompany(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/companies/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const err = await res.json();
    if (err.error === 'Cannot delete: Company has assigned units') {
      throw new Error('COMPANY_HAS_UNITS');
    }
    throw new Error('Error deleting company');
  }
}

// --- BATCH UPLOAD ---
export async function downloadUnitsTemplate(): Promise<Blob> {
  const res = await fetch(`${API_BASE}/units/template`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Error descargando plantilla');
  return res.blob();
}

export type BatchUploadResult = {
  total: number;
  inserted: number;
  failed: number;
  duplicados_en_excel?: number;
  duplicados_en_bd?: number;
  errors: Array<{ row: number; economic_number?: string; message: string; campo?: string; valor?: string; motivo?: string }>;
};

export async function uploadUnitsBatch(file: File): Promise<BatchUploadResult> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/units/batch-upload`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` },
    body: formData,
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({ error: 'Error desconocido' }));
    throw new Error(errorJson.error || 'Error subiendo archivo');
  }
  return res.json();
}

export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  ok: boolean;
  data: {
    token: string;
    user: {
      id: number;
      email: string;
      name: string;
      role: string;
      tenantId: number;
    };
  };
};

export async function login(data: LoginRequest): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Login failed' }));
    throw new Error(err.error || 'Login failed');
  }
  const result = await res.json();
  if (result.data?.token) {
    localStorage.setItem('token', result.data.token);
  }
  return result;
}

export function logout(): void {
  localStorage.removeItem('token');
}

export type AuditLogRow = {
  id: number;
  tenant_id: number;
  user_id: number;
  action: string;
  entity: string;
  entity_id: number | null;
  metadata: any;
  ip: string | null;
  created_at: string;
};

export async function getAuditLogs(params: { entity?: string; action?: string; limit?: number; offset?: number } = {}): Promise<AuditLogRow[]> {
  const url = new URL(`${API_BASE}/audit-logs`);
  if (params.entity) url.searchParams.append('entity', params.entity);
  if (params.action) url.searchParams.append('action', params.action);
  if (params.limit) url.searchParams.append('limit', String(params.limit));
  if (params.offset) url.searchParams.append('offset', String(params.offset));

  const res = await fetchWithAuth(url.toString(), {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Error fetching audit logs');
  const json = await res.json();
  return json.data || [];
}

