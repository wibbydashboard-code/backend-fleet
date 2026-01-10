export type ViewType = 'dashboard' | 'unidades' | 'contratos' | 'pagos' | 'proveedores' | 'empresas' | 'reportes';

// Tipo mínimo para que compile; amplíalo según tus props reales
export interface Unit {
  id: number;
  economic_number: string;
  assigned_company_id?: number | null;
  company_name?: string | null;
  type?: string;
  brand?: string;
  license_plate?: string;
  [k: string]: any;
}
