export type ViewType = 'dashboard' | 'unidades' | 'contratos' | 'reportes';

// Tipo mínimo para que compile; amplíalo según tus props reales
export interface Unit {
  id: number;
  [k: string]: any;
}
