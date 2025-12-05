
import React, { useState } from 'react';
import { ReconciliationResult, MatchStatus, CteCategory, InternalRecord, ExternalRecord } from '../types';
import { analyzeDiscrepancy } from '../services/geminiService';
import MatchReviewModal from './MatchReviewModal';

interface ResultTableProps {
  results: ReconciliationResult[];
  onConfirmMatch?: (internalId: string, externalId: string) => void;
}

type FilterStatus = 'ALL' | 'PAGO' | 'AGENDADO' | 'PENDENTE' | 'DIVERGENTE' | 'REVISAO';

const ResultTable: React.FC<ResultTableProps> = ({ results, onConfirmMatch }) => {
  const [filter, setFilter] = useState<FilterStatus>('ALL');
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<Record<string, string>>({});

  // State for Modal
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<{ internal: InternalRecord, candidate: ExternalRecord } | null>(null);

  const handleOpenReview = (internal: InternalRecord, candidate: ExternalRecord) => {
      setSelectedMatch({ internal, candidate });
      setReviewModalOpen(true);
  };

  const handleConfirmFromModal = () => {
      if (selectedMatch && onConfirmMatch) {
          onConfirmMatch(selectedMatch.internal.id, selectedMatch.candidate.id);
      }
  };

  // Helper to determine display status
  const getDisplayStatus = (item: ReconciliationResult): string => {
    // If we have a match candidate (partial) but status is Review, show Review
    if (item.status === MatchStatus.MANUAL_REVIEW) return 'REVISAO';
    
    if (item.status === MatchStatus.DISCREPANCY) return 'DIVERGENTE';
    if (item.status === MatchStatus.UNMATCHED) return 'PENDENTE';
    
    if (item.matchCandidate) {
        if (item.matchCandidate.status === 'PAGO') return 'PAGO';
        if (item.matchCandidate.status === 'A PAGAR') return 'AGENDADO';
        if (item.matchCandidate.status === 'ADIANTADO') return 'ANTECIPADO';
    }
    return 'PENDENTE'; // Fallback
  };

  const filtered = results.filter(r => {
      const status = getDisplayStatus(r);
      if (filter === 'ALL') return true;
      if (filter === 'PAGO') return status === 'PAGO' || status === 'ANTECIPADO';
      if (filter === 'AGENDADO') return status === 'AGENDADO';
      if (filter === 'PENDENTE') return status === 'PENDENTE';
      if (filter === 'DIVERGENTE') return status === 'DIVERGENTE';
      if (filter === 'REVISAO') return status === 'REVISAO';
      return true;
  });

  const handleAiAnalyze = async (item: ReconciliationResult) => {
    setAnalyzingId(item.internalId);
    const internalData = JSON.stringify({
        cte: item.record.cteNumber,
        val: item.record.value,
        date: item.record.date
    });
    const candidates = item.matchCandidate ? [{
        ref: item.matchCandidate.refNumber,
        val: item.matchCandidate.value,
        date: item.matchCandidate.date
    }] : [];

    const analysis = await analyzeDiscrepancy(internalData, candidates.map(c => JSON.stringify(c)));
    setAiAnalysis(prev => ({...prev, [item.internalId]: analysis}));
    setAnalyzingId(null);
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  
  const formatDate = (dateStr: string) => {
      if(!dateStr) return '??/??/??';
      try {
        const [y, m, d] = dateStr.split('-');
        if (!y || !m || !d) return dateStr;
        return `${d}/${m}/${y}`;
      } catch (e) {
          return dateStr;
      }
  };

  const getMonthYear = (dateStr: string) => {
      if(!dateStr) return { m: '-', y: '-' };
      try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return { m: '-', y: '-' };
        return { m: d.getMonth() + 1, y: d.getFullYear() };
      } catch (e) {
        return { m: '-', y: '-' };
      }
  };

  return (
    <>
    <div className="bg-white shadow-sm rounded-lg border border-gray-200 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200 flex flex-wrap gap-4 justify-between items-center bg-white rounded-t-lg">
        <h3 className="text-lg font-semibold text-gray-800">Detalhe das CTEs</h3>
        <div className="flex flex-wrap gap-2">
            <button onClick={() => setFilter('ALL')} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filter === 'ALL' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Todos</button>
            <button onClick={() => setFilter('PAGO')} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filter === 'PAGO' ? 'bg-green-600 text-white' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}>Pagos</button>
            <button onClick={() => setFilter('AGENDADO')} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filter === 'AGENDADO' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}>A Pagar</button>
            <button onClick={() => setFilter('PENDENTE')} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filter === 'PENDENTE' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}>Não Pagos</button>
            <button onClick={() => setFilter('DIVERGENTE')} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filter === 'DIVERGENTE' ? 'bg-yellow-500 text-white' : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'}`}>Divergências</button>
            <button onClick={() => setFilter('REVISAO')} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filter === 'REVISAO' ? 'bg-orange-500 text-white' : 'bg-orange-50 text-orange-700 hover:bg-orange-100'}`}>Revisão Manual</button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Número CT-e</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Dt Emissão</th>
              <th scope="col" className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Mês</th>
              <th scope="col" className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Ano</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Tipo</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Valor</th>
              <th scope="col" className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filtered.map((item) => {
              const status = getDisplayStatus(item);
              const { m, y } = getMonthYear(item.record.date);
              
              const isPartialMatchReview = status === 'REVISAO' && item.matchCandidate;

              return (
                <React.Fragment key={item.internalId}>
                <tr className={`hover:bg-gray-50 transition-colors ${status === 'REVISAO' ? 'bg-orange-50' : ''}`}>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.record.originalCte || <span className="text-red-400 italic">Desconhecido</span>}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600" title={item.record.date || 'Data Inválida'}>
                    {formatDate(item.record.date)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-600">
                    {m}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-600">
                    {y}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        item.record.category === CteCategory.PUXADA ? 'bg-orange-100 text-orange-800' :
                        item.record.category === CteCategory.ROTA ? 'bg-indigo-100 text-indigo-800' :
                        item.record.category === CteCategory.ISS ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                    }`}>
                      {item.record.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900">
                    {formatCurrency(item.record.value)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <span className={`inline-flex px-2 py-1 text-xs font-bold rounded-full leading-none
                        ${status === 'PAGO' ? 'bg-green-100 text-green-800' : 
                          status === 'AGENDADO' ? 'bg-blue-100 text-blue-800' :
                          status === 'ANTECIPADO' ? 'bg-purple-100 text-purple-800' :
                          status === 'DIVERGENTE' ? 'bg-yellow-100 text-yellow-800' :
                          status === 'REVISAO' ? 'bg-orange-100 text-orange-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                        {status}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                     <div className="flex justify-end gap-2 items-center">
                        {/* PARTIAL MATCH CONFIRMATION UI */}
                        {isPartialMatchReview && item.matchCandidate && onConfirmMatch && (
                            <div className="flex items-center gap-2 bg-white border border-orange-200 rounded px-2 py-1 shadow-sm">
                                <span className="text-xs text-orange-600 font-mono">
                                    {item.matchCandidate.refNumber}
                                </span>
                                <button
                                    onClick={() => handleOpenReview(item.record, item.matchCandidate!)}
                                    className="text-white bg-green-500 hover:bg-green-600 rounded-full p-1 shadow-sm"
                                    title="Validar Vínculo"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </button>
                            </div>
                        )}

                        {status === 'DIVERGENTE' && (
                             <button 
                             onClick={() => handleAiAnalyze(item)}
                             disabled={analyzingId === item.internalId}
                             className="text-indigo-600 hover:text-indigo-900 text-xs border border-indigo-200 px-2 py-1 rounded hover:bg-indigo-50"
                             title="Analisar divergência com IA"
                           >
                              {analyzingId === item.internalId ? '...' : 'IA Analisar'}
                           </button>
                        )}
                        {(item.notes.length > 0 && !isPartialMatchReview) && (
                            <span className="text-gray-400 text-xs cursor-help" title={item.notes.join('\n')}>
                                ℹ️
                            </span>
                        )}
                     </div>
                  </td>
                </tr>
                {aiAnalysis[item.internalId] && (
                  <tr className="bg-indigo-50">
                      <td colSpan={8} className="px-4 py-3 text-xs text-indigo-800 italic border-l-4 border-indigo-400">
                          {aiAnalysis[item.internalId]}
                      </td>
                  </tr>
                )}
                </React.Fragment>
              );
            })}
            
            {filtered.length === 0 && (
                <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                        Nenhum registro encontrado para este filtro.
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
    
    <MatchReviewModal 
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        onConfirm={handleConfirmFromModal}
        internal={selectedMatch?.internal || null}
        candidate={selectedMatch?.candidate || null}
    />
    </>
  );
};

export default ResultTable;
