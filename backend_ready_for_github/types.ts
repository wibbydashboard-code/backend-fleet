
export interface Company {
  id: number;
  name: string;
}

export interface Unit {
  id: number;
  economic_number: string;
  license_plate: string;
  serial_number: string;
  type: string;
  brand: string;
  model: string;
  year: number;
  assigned_company_id: number;
  status: 'Activo' | 'Baja' | 'Por Finalizar';
  company_name?: string;
}

export interface Contract {
  id: number;
  unit_id: number;
  contract_number: string;
  provider: string;
  contracting_company_id: number;
  start_date: string;
  end_date: string;
  term_months: number;
  monthly_rent: number;
  company?: string;
  unit?: string;
  num?: string;
  prov?: string;
  type?: string;
}

export interface InsurancePolicy {
  id: number;
  unit_id: number;
  policy_number: string;
  insurer: string;
  start_date: string;
  end_date: string;
  status: 'Vigente' | 'Vencida';
}

export interface Payment {
  id: number;
  contract_id: number;
  payment_date?: string;
  period: string;
  amount: number;
  status: 'Pagado' | 'Pendiente';
  type?: string;
  company?: string;
  unit?: string;
}

export interface Document {
  id: number;
  related_id: number; // Can be unit_id, contract_id, etc.
  name: string;
}

export interface Expiration {
    type: 'Renta' | 'Seguro' | 'Contrato';
    unitName: string;
    reference: string;
    daysRemaining: number;
}
