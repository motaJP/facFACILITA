import { CteConfig } from './types';

export const DEFAULT_CONFIG: CteConfig = {
  rotaValue: 1350.00,
  puxadaValues: [3150.00, 6300.00],
  puxadaMaxThreshold: 10000.00
};

export const CSV_HEADERS = {
  INTERNAL: ['NUMERO', 'TRANSPORTE', 'DT', 'VALOR'],
  EXTERNAL: ['Documento', 'Referencia', 'Valor', 'Vencimento', 'Data']
};

export const COLORS = {
  primary: '#0f766e', // teal-700
  secondary: '#f59e0b', // amber-500
  danger: '#ef4444', // red-500
  success: '#22c55e', // green-500
  neutral: '#64748b' // slate-500
};