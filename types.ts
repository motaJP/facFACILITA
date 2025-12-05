
export enum CteCategory {
  ROTA = 'ROTA',
  PUXADA = 'PUXADA',
  ISS = 'ISS',
  ACERTO = 'ACERTO',
  UNKNOWN = 'DESCONHECIDO'
}

export enum MatchStatus {
  MATCHED = 'MATCHED',
  UNMATCHED = 'UNMATCHED',
  DISCREPANCY = 'DISCREPANCY', // Found but value/date differs
  MANUAL_REVIEW = 'MANUAL_REVIEW' // CTE invalid or data missing
}

export type InternalSource = 'PUXADA' | 'ROTA';

export interface CteConfig {
  rotaValue: number;
  puxadaValues: number[];
  puxadaMaxThreshold: number;
}

export interface InternalRecord {
  id: string; // Generated UUID
  cteNumber: string; // Cleaned string
  originalCte: string;
  date: string; // ISO format
  value: number;
  category: CteCategory;
  source: InternalSource; // New: tracks which sheet it came from
  rawLine: any;
  needsReview: boolean;
}

export interface ExternalRecord {
  id: string;
  docNumber: string; // From CSV
  refNumber: string; // Extracted CTE number
  date: string;
  dueDate: string;
  value: number;
  status: 'PAGO' | 'A PAGAR' | 'ADIANTADO';
  originalRow: any;
  fileName: string; // To know which CSV it came from
}

export interface ReconciliationResult {
  internalId: string;
  externalId?: string;
  status: MatchStatus;
  notes: string[];
  record: InternalRecord;
  matchCandidate?: ExternalRecord;
}

export interface DashboardStats {
  totalInternal: number;
  totalMatched: number;
  totalDiscrepancies: number;
  totalUnmatched: number;
  totalValueMatched: number;
  totalValuePending: number;
  byCategory: Record<CteCategory, number>;
}
