
import { InternalRecord, ExternalRecord, CteCategory, CteConfig, ReconciliationResult, MatchStatus, InternalSource } from '../types';
import * as XLSX from 'xlsx';

// Detect separator: counts occurrences to find the most likely one
const detectSeparator = (text: string): string => {
  const lines = text.split('\n').slice(0, 5);
  const counts = { ';': 0, ',': 0, '\t': 0 };
  
  lines.forEach(line => {
    for (const char of line) {
      if (char === ';') counts[';']++;
      else if (char === ',') counts[',']++;
      else if (char === '\t') counts['\t']++;
    }
  });
  
  if (counts[';'] >= counts[','] && counts[';'] >= counts['\t']) return ';';
  if (counts['\t'] >= counts[','] && counts['\t'] >= counts[';']) return '\t';
  return ',';
};

// Robust CSV Line Parser
const parseCSVLine = (line: string, separator: string): string[] => {
    const res = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') {
            inQuote = !inQuote;
        } else if (c === separator && !inQuote) {
            res.push(cur.replace(/^"|"$/g, '').trim()); 
            cur = '';
        } else {
            cur += c;
        }
    }
    res.push(cur.replace(/^"|"$/g, '').trim());
    return res;
};

// Helper to clean currency strings 
const parseCurrency = (val: string | number): number => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  
  // Aggressively remove everything that is NOT a digit, comma, dot, or minus
  let clean = val.toString().replace(/[^\d.,-]/g, '');
  
  // Brazilian format: 1.000,00 -> 1000.00
  const lastCommaIndex = clean.lastIndexOf(',');
  const lastDotIndex = clean.lastIndexOf('.');

  if (lastCommaIndex > lastDotIndex) {
      clean = clean.replace(/\./g, '').replace(',', '.');
  } 
  
  return parseFloat(clean) || 0;
};

// Helper to clean CTE numbers
// Handles "3057-1" -> "3057"
const normalizeCte = (cte: string | number) => {
  if (!cte) return { raw: '', normalized: '' };
  const raw = cte.toString().trim();
  
  // Split by dash or slash to handle "1234-1" or "1234/1"
  // We take the first part which is usually the main CTE number
  const parts = raw.split(/[-/]/);
  const mainPart = parts[0];
  
  // Remove non-digits and leading zeros
  let normalized = mainPart.replace(/\D/g, '').replace(/^0+/, '');
  
  // Fallback: if normalization emptied the string (e.g. input was "A-1"), 
  // try to find ANY digit sequence in the raw string
  if (!normalized && /\d/.test(raw)) {
      const match = raw.match(/(\d+)/);
      if (match) {
          normalized = match[1].replace(/^0+/, '');
      }
  }

  return { raw, normalized };
};

const MONTH_MAP: Record<string, string> = {
    'jan': '01', 'fev': '02', 'mar': '03', 'abr': '04', 'mai': '05', 'jun': '06',
    'jul': '07', 'ago': '08', 'set': '09', 'out': '10', 'nov': '11', 'dez': '12',
    'janeiro': '01', 'fevereiro': '02', 'março': '03', 'abril': '04', 'maio': '05', 'junho': '06',
    'julho': '07', 'agosto': '08', 'setembro': '09', 'outubro': '10', 'novembro': '11', 'dezembro': '12'
};

// Parse dates
const parseDate = (dateInput: string | number): string => {
  if (!dateInput) return '';

  // Excel Serial Date (number)
  if (typeof dateInput === 'number') {
     if (dateInput < 1000) return ''; 
     const date = new Date((dateInput - (25567 + 2)) * 86400 * 1000);
     return !isNaN(date.getTime()) ? date.toISOString().split('T')[0] : '';
  }

  const cleanStr = dateInput.toString().replace(/["']/g, '').trim().toLowerCase();

  // Handle "26 de nov. de 2025" or "26 de nov de 2025" or "26 de nov. 2025"
  const verboseMatch = cleanStr.match(/^(\d{1,2})\s*de\s*([a-zç\.]+?)\.?\s*de\s*(\d{4})/);
  
  if (verboseMatch) {
      const day = verboseMatch[1].padStart(2, '0');
      const monthRaw = verboseMatch[2].replace('.', '');
      const year = verboseMatch[3];
      const month = MONTH_MAP[monthRaw];
      
      if (month) {
          return `${year}-${month}-${day}`;
      }
  }

  // Excel serial as string
  if (!isNaN(Number(cleanStr)) && !cleanStr.includes('/') && !cleanStr.includes('-')) {
     const val = Number(cleanStr);
     if (val < 1000) return ''; 
     const date = new Date((val - (25567 + 2)) * 86400 * 1000);
     return !isNaN(date.getTime()) ? date.toISOString().split('T')[0] : '';
  }
  
  const parts = cleanStr.split('/');
  if (parts.length === 3) {
    let year = parts[2];
    if (year.length === 2) year = '20' + year;
    year = year.substring(0, 4);
    
    const iso = `${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    if(!isNaN(new Date(iso).getTime())) return iso;
  }
  
  // Try YYYY-MM-DD
  if (cleanStr.match(/^\d{4}-\d{2}-\d{2}$/)) return cleanStr;
  
  return ''; 
};

export const categorizeInternalRecord = (val: number, config: CteConfig, explicitType?: string): CteCategory => {
  if (explicitType) {
      const t = explicitType.toUpperCase();
      if (t.includes('ROTA')) return CteCategory.ROTA;
      if (t.includes('PUXADA')) return CteCategory.PUXADA;
      if (t.includes('ISS')) return CteCategory.ISS;
      if (t.includes('ACERTO')) return CteCategory.ACERTO;
  }

  // Value based logic
  if (Math.abs(val - config.rotaValue) < 1.0) return CteCategory.ROTA;
  if (config.puxadaValues.some(p => Math.abs(val - p) < 1.0)) return CteCategory.PUXADA;
  
  if (val <= config.puxadaMaxThreshold) return CteCategory.PUXADA;
  if (val > config.puxadaMaxThreshold) return CteCategory.ACERTO;
  
  return CteCategory.ISS;
};

// --- DATA PROCESSING LOGIC ---

const parseFileContent = async (file: File): Promise<any[][]> => {
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    
    if (isExcel) {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        return XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];
    } else {
        const text = await file.text();
        const separator = detectSeparator(text);
        return text.split(/\r?\n/)
            .filter(r => r.trim().length > 0)
            .map(line => parseCSVLine(line, separator));
    }
};

export const processInternalFile = async (file: File, config: CteConfig, source: InternalSource): Promise<InternalRecord[]> => {
  const rows = await parseFileContent(file);
  if (rows.length === 0) return [];

  const headerRowIndex = rows.findIndex(row => 
      row.some(cell => {
          if (typeof cell !== 'string') return false;
          const c = cell.toLowerCase();
          return c.includes('numero') || c.includes('ct-e') || c.includes('cte') || c.includes('transporte');
      })
  );

  const effectiveHeaderIdx = headerRowIndex === -1 ? 0 : headerRowIndex;
  const headerCols = rows[effectiveHeaderIdx].map(c => String(c).toLowerCase());

  const idxMap = {
      cte: headerCols.findIndex(c => c.includes('numero') || c.includes('ct-e') || c.includes('cte')),
      val: headerCols.findIndex(c => c.includes('valor') || c.includes('r$')),
      date: headerCols.findIndex(c => c.includes('emiss') || c.includes('dt') || c.includes('data')),
      type: headerCols.findIndex(c => c.includes('tipo') || c.includes('categ')),
      transporte: headerCols.findIndex(c => c.includes('transporte'))
  };

  if (idxMap.cte === -1 && idxMap.val === -1 && rows[effectiveHeaderIdx].length >= 4) {
      idxMap.cte = 0;
      idxMap.transporte = 1; 
      idxMap.date = 2;
      idxMap.val = 3;
  }

  const dataRows = rows.slice(effectiveHeaderIdx + 1);
  
  return dataRows.map((row, idx) => {
    if (row.length < 2) return null;

    const valCell = idxMap.val > -1 ? row[idxMap.val] : 0;
    const dateCell = idxMap.date > -1 ? row[idxMap.date] : '';
    const rawCteCell = idxMap.cte > -1 ? row[idxMap.cte] : (idxMap.transporte > -1 ? row[idxMap.transporte] : `ROW-${idx}`);
    
    const value = parseCurrency(valCell);
    const date = parseDate(dateCell);
    const { raw, normalized } = normalizeCte(rawCteCell);
    
    const typeStr = idxMap.type > -1 ? String(row[idxMap.type]) : source;

    const needsReview = (value > 0 && !normalized) || (value > 0 && !date);

    if (!normalized && value === 0) return null;

    return {
      id: crypto.randomUUID(),
      cteNumber: normalized, 
      originalCte: raw || '?',      
      date,
      value,
      category: categorizeInternalRecord(value, config, typeStr),
      source,
      rawLine: row,
      needsReview
    };
  }).filter(r => r !== null) as InternalRecord[];
};

export const processExternalFiles = async (
  files: { file: File, type: 'PAGO' | 'A PAGAR' | 'ADIANTADO' }[]
): Promise<ExternalRecord[]> => {
  let allRecords: ExternalRecord[] = [];

  for (const item of files) {
    const rows = await parseFileContent(item.file);
    const validRows = rows.filter(r => r.length > 2);
    
    if (validRows.length === 0) continue;

    let headerRowIdx = validRows.findIndex(row => 
        row.some(c => {
             const s = String(c).toLowerCase();
             return s.includes('documento') || s.includes('valor') || s.includes('empresa') || s.includes('refer');
        })
    );

    let headers: string[] = [];
    if (headerRowIdx > -1) {
        headers = validRows[headerRowIdx].map(c => String(c).toLowerCase());
    }

    let valIdx = headers.findIndex(h => h.includes('valor'));
    let refIdx = headers.findIndex(h => h.includes('refer') || (h.includes('ref') && !h.includes('data')));
    let dateIdx = headers.findIndex(h => h.includes('data') && (h.includes('doc') || h.includes('emis')));
    let docIdx = headers.findIndex(h => h.includes('n') && h.includes('doc')); 

    if (headerRowIdx === -1 || valIdx === -1 || dateIdx === -1 || (refIdx === -1 && docIdx === -1)) {
        const startRow = headerRowIdx === -1 ? 0 : headerRowIdx + 1;
        const sampleRows = validRows.slice(startRow, startRow + 5);
        
        const scores = new Array(validRows[0].length).fill(0).map(() => ({ date: 0, currency: 0, ref: 0 }));

        for (const row of sampleRows) {
            row.forEach((cell, idx) => {
                const s = String(cell);
                if (parseDate(s).length > 0) scores[idx].date++;
                if (/[0-9]/.test(s) && (s.includes(',') || s.includes('.')) && parseDate(s).length === 0) scores[idx].currency++;
                if (/\d/.test(s) && s.length < 20 && parseDate(s).length === 0 && !s.includes('R$') && !s.includes('$')) scores[idx].ref++;
            });
        }

        if (dateIdx === -1) {
            let max = 0;
            scores.forEach((s, i) => { if(s.date > max) { max = s.date; dateIdx = i; } });
        }
        if (valIdx === -1) {
             let max = 0;
             scores.forEach((s, i) => { if(s.currency > max) { max = s.currency; valIdx = i; } });
        }
        if (refIdx === -1 && docIdx === -1) {
             let max = 0;
             scores.forEach((s, i) => { 
                 if(i !== valIdx && i !== dateIdx && s.ref > max) { max = s.ref; refIdx = i; } 
             });
        }
    }

    const dataStart = headerRowIdx === -1 ? 0 : headerRowIdx + 1;

    const records = validRows.slice(dataStart).map(row => {
      let value = 0;
      let refNumber = '';
      let date = '';
      let docNumber = '';

      if (valIdx > -1 && row[valIdx]) {
          value = parseCurrency(row[valIdx]);
      } else {
           const foundIdx = row.findIndex(c => {
              const s = String(c);
              return (s.includes('R$') || s.match(/[0-9].,[0-9]/)) && !s.includes('NF');
          });
          if (foundIdx > -1) value = parseCurrency(row[foundIdx]);
      }

      if (dateIdx > -1 && row[dateIdx]) {
          date = parseDate(row[dateIdx]);
      } else {
          const foundIdx = row.findIndex(c => parseDate(c).length > 0);
          if (foundIdx > -1) date = parseDate(row[foundIdx]);
      }

      if (refIdx > -1 && row[refIdx]) {
          refNumber = normalizeCte(row[refIdx]).normalized;
      } 
      
      if (!refNumber) {
         if (docIdx > -1 && row[docIdx]) {
             refNumber = normalizeCte(row[docIdx]).normalized;
         } else {
             const potentials = row.map((c, i) => ({ val: String(c), i })).filter(x => 
                x.i !== valIdx && x.i !== dateIdx && x.i !== docIdx
             );
             for (const p of potentials) {
                 const { normalized } = normalizeCte(p.val);
                 if (normalized.length >= 3 && normalized.length < 15) {
                    refNumber = normalized; 
                    break;
                 }
             }
         }
      }

      if (docIdx > -1 && row[docIdx]) {
          docNumber = String(row[docIdx]);
      } else {
          docNumber = String(row[0] || '');
      }

      if (value === 0 && !refNumber) return null;

      return {
        id: crypto.randomUUID(),
        docNumber,
        refNumber, 
        date,
        dueDate: '',
        value,
        status: item.type,
        originalRow: row,
        fileName: item.file.name
      };
    }).filter(r => r !== null) as ExternalRecord[];
    
    allRecords = [...allRecords, ...records];
  }

  return allRecords;
};

export const reconcileData = (
  internal: InternalRecord[],
  external: ExternalRecord[],
  confirmedMatches: Record<string, string> = {}
): ReconciliationResult[] => {
  return internal.map(rec => {
    
    if (confirmedMatches[rec.id]) {
        const confirmedExt = external.find(e => e.id === confirmedMatches[rec.id]);
        if (confirmedExt) {
            return {
                internalId: rec.id,
                externalId: confirmedExt.id,
                status: MatchStatus.MATCHED,
                notes: ["Vínculo confirmado manualmente"],
                record: rec,
                matchCandidate: confirmedExt
            };
        }
    }

    if (rec.needsReview) {
        return {
            internalId: rec.id,
            status: MatchStatus.MANUAL_REVIEW,
            notes: ["Dados incompletos ou inválidos (Data/CTE)"],
            record: rec
        };
    }

    const candidates = external.filter(ext => {
        if (!ext.refNumber || !rec.cteNumber) return false;
        if (ext.refNumber === rec.cteNumber) return true;
        const minLen = Math.min(ext.refNumber.length, rec.cteNumber.length);
        if (minLen < 3) return false;
        if (rec.cteNumber.endsWith(ext.refNumber)) return true;
        if (ext.refNumber.endsWith(rec.cteNumber)) return true;
        return false;
    });

    if (candidates.length === 0) {
         return {
            internalId: rec.id,
            status: MatchStatus.UNMATCHED,
            notes: [],
            record: rec
        };
    }

    const exactNumMatch = candidates.find(c => c.refNumber === rec.cteNumber);

    if (exactNumMatch) {
        if (Math.abs(exactNumMatch.value - rec.value) < 0.05) {
            return {
                internalId: rec.id,
                externalId: exactNumMatch.id,
                status: MatchStatus.MATCHED,
                notes: [],
                record: rec,
                matchCandidate: exactNumMatch
            };
        } else {
             return {
                internalId: rec.id,
                externalId: exactNumMatch.id,
                status: MatchStatus.DISCREPANCY,
                notes: [`CTE encontrado, mas valor diverge. Planilha: R$${rec.value} vs Extrato: R$${exactNumMatch.value}`],
                record: rec,
                matchCandidate: exactNumMatch
            };
        }
    }

    const partialMatchValueOk = candidates.find(c => {
         const isValueMatch = Math.abs(c.value - rec.value) < 0.05;
         return isValueMatch;
    });

    if (partialMatchValueOk) {
        return {
            internalId: rec.id,
            externalId: partialMatchValueOk.id,
            status: MatchStatus.MANUAL_REVIEW,
            notes: [`Sugestão: CTE parcial (${partialMatchValueOk.refNumber}) com mesmo valor.`],
            record: rec,
            matchCandidate: partialMatchValueOk
        };
    }

    return {
        internalId: rec.id,
        status: MatchStatus.UNMATCHED,
        notes: [],
        record: rec
    };
  });
};

export const generateExcelReport = (results: ReconciliationResult[]) => {
    const data = results.map(r => {
        const matched = r.matchCandidate;
        
        let displayStatus = 'PENDENTE';
        if (r.status === MatchStatus.MATCHED) displayStatus = matched?.status || 'PAGO';
        else if (r.status === MatchStatus.DISCREPANCY) displayStatus = 'DIVERGENTE';
        else if (r.status === MatchStatus.MANUAL_REVIEW) displayStatus = 'REVISÃO';

        return {
            'CTE Interno': r.record.originalCte,
            'Data Emissão': r.record.date,
            'Categoria': r.record.category,
            'Valor Interno (R$)': r.record.value,
            'STATUS CONCILIAÇÃO': displayStatus,
            'CTE/Ref Encontrado': matched ? matched.refNumber : '-',
            'Valor Encontrado (R$)': matched ? matched.value : 0,
            'Data Pagamento/Vencto': matched ? matched.date : '-',
            'Origem Arquivo': matched ? matched.fileName : '-',
            'Observações': r.notes.join('; ')
        };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Relatório Conciliação");
    
    // Auto-width columns roughly
    const wscols = Object.keys(data[0] || {}).map(() => ({ wch: 20 }));
    ws['!cols'] = wscols;

    XLSX.writeFile(wb, `Conciliacao_Facilita_${new Date().toISOString().split('T')[0]}.xlsx`);
};
