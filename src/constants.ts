
import { Company, Unit, Contract, InsurancePolicy, Payment, Document, Expiration } from '../types';

export const COMPANIES: Company[] = [
  { id: 1, name: 'Intra' },
  { id: 2, name: 'Icold' },
  { id: 3, name: 'Traslados' },
  { id: 4, name: 'VTS Carriers' },
  { id: 5, name: 'EC Log.' },
  { id: 6, name: 'Administrativos Corp.' },
];

export const UNITS: Unit[] = [
  { id: 1, economic_number: 'I262', license_plate: '59UK3W', serial_number: 'SN12345', type: 'Caja Refrigerada', brand: 'UTILITY', model: '3000R', year: 2024, assigned_company_id: 2, company_name: 'Icold', status: 'Activo' },
  { id: 2, economic_number: 'T757', license_plate: '84AJ3D', serial_number: 'SN67890', type: 'Tractocamion', brand: 'Kenworth', model: 'T680', year: 2023, assigned_company_id: 1, company_name: 'Intra', status: 'Activo' },
  { id: 3, economic_number: 'MG-01', license_plate: 'RDE-453-C', serial_number: 'SN54321', type: 'MG GT 2022', brand: 'MG', model: 'GT', year: 2022, assigned_company_id: 6, company_name: 'Administrativos Corp.', status: 'Por Finalizar' },
  { id: 4, economic_number: 'U420', license_plate: '83AR2D', serial_number: 'SN09876', type: 'Tractocamion', brand: 'Freightliner', model: 'Cascadia', year: 2021, assigned_company_id: 4, company_name: 'VTS Carriers', status: 'Baja' },
  { id: 5, economic_number: 'I263', license_plate: '59UK3X', serial_number: 'SN12346', type: 'Caja Refrigerada', brand: 'UTILITY', model: '3000R', year: 2024, assigned_company_id: 2, company_name: 'Icold', status: 'Activo' },
];

export const CONTRACTS: Contract[] = [
  { id: 1, unit_id: 1, contract_number: 'Paccar-CR-262', provider: 'Paccar Financial', contracting_company_id: 2, company: 'Icold', unit: 'I262', start_date: '2024-12-01', end_date: '2029-11-30', term_months: 60, monthly_rent: 24108.52 },
  { id: 2, unit_id: 2, contract_number: 'TIP-Multi-05', provider: 'TIP México', contracting_company_id: 1, company: 'Intra', unit: 'T757', start_date: '2023-06-15', end_date: '2026-06-14', term_months: 36, monthly_rent: 35000.00 },
  { id: 3, unit_id: 3, contract_number: 'GMAC-MG-001', provider: 'GM Financial', contracting_company_id: 6, company: 'Administrativos Corp.', unit: 'MG-01', start_date: '2022-10-24', end_date: '2025-10-24', term_months: 36, monthly_rent: 8500.00 },
  { id: 4, unit_id: 5, contract_number: 'Paccar-CR-263', provider: 'Paccar Financial', contracting_company_id: 2, company: 'Icold', unit: 'I263', start_date: '2024-12-01', end_date: '2029-11-30', term_months: 60, monthly_rent: 24108.52 },
];

export const POLICIES: InsurancePolicy[] = [
  { id: 1, unit_id: 1, policy_number: 'VCI844830100', insurer: 'Axa Seguros', start_date: '2025-02-18', end_date: '2026-01-24', status: 'Vigente' },
  { id: 2, unit_id: 2, policy_number: 'GNP-TR-987', insurer: 'GNP Seguros', start_date: '2025-01-01', end_date: '2025-12-31', status: 'Vigente' },
  { id: 3, unit_id: 3, policy_number: 'AXA-98765', insurer: 'Axa Seguros', start_date: '2024-10-24', end_date: '2025-10-23', status: 'Vigente' },
];

export const PAYMENTS: Payment[] = [
    { id: 1, contract_id: 1, period: 'Julio 2025', status: 'Pagado', amount: 24108.52, payment_date: '2025-07-05', type: 'rent' },
    { id: 2, contract_id: 1, period: 'Junio 2025', status: 'Pagado', amount: 24108.52, payment_date: '2025-06-04', type: 'insurance' },
    { id: 3, contract_id: 1, period: 'Mayo 2025', status: 'Pagado', amount: 24108.52, payment_date: '2025-05-05', type: 'rent' },
    { id: 4, contract_id: 1, period: 'Agosto 2025', status: 'Pendiente', amount: 24108.52, type: 'insurance' },
];

export const DOCUMENTS: Document[] = [
    { id: 1, related_id: 1, name: 'Contrato_Paccar-CR-262.pdf' },
    { id: 2, related_id: 1, name: 'Poliza_AXA_VCI844830100.pdf' },
];

export const EXPIRATIONS: Expiration[] = [
    { type: 'Renta', unitName: 'Tractocamion T757', reference: 'Contrato: 511813', daysRemaining: 3 },
    { type: 'Seguro', unitName: 'MG GT 2022', reference: 'Póliza: AXA-98765', daysRemaining: 12 },
    { type: 'Contrato', unitName: 'Caja Seca I250', reference: 'Contrato: Paccar-CS-01', daysRemaining: 25 },
    { type: 'Renta', unitName: 'Chevrolet Beat', reference: 'Contrato: GM-456-B', daysRemaining: 28 },
];

export const BAR_CHART_DATA = [
  { name: 'Intra', value: 75000 },
  { name: 'Icold', value: 90000 },
  { name: 'Traslados', value: 40000 },
  { name: 'VTS Carriers', value: 60000 },
  { name: 'EC Log.', value: 25000 },
  { name: 'Total', value: 85000 },
];
