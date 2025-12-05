import React from 'react';
import { InternalRecord, ExternalRecord } from '../types';

interface MatchReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  internal: InternalRecord | null;
  candidate: ExternalRecord | null;
}

const MatchReviewModal: React.FC<MatchReviewModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  internal, 
  candidate 
}) => {
  if (!isOpen || !internal || !candidate) return null;

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  
  const formatDate = (dateStr: string) => {
    if(!dateStr) return '-';
    try {
       const [y, m, d] = dateStr.split('-');
       return `${d}/${m}/${y}`;
    } catch { return dateStr; }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden border border-gray-200">
        
        {/* Header */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-800">
            Validar Vínculo Manual
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
                
                {/* Left: Internal */}
                <div className="flex-1 bg-blue-50 border border-blue-100 rounded-lg p-5">
                    <div className="text-xs font-bold text-blue-600 uppercase mb-3 tracking-wider">Controle Interno (Planilha)</div>
                    
                    <div className="space-y-3">
                        <div>
                            <span className="text-xs text-gray-500 block">Número CTE (Normalizado)</span>
                            <span className="text-xl font-bold text-gray-900">{internal.cteNumber}</span>
                            <span className="text-xs text-gray-400 ml-2">({internal.originalCte})</span>
                        </div>
                        <div>
                            <span className="text-xs text-gray-500 block">Valor</span>
                            <span className="text-lg font-semibold text-gray-900">{formatCurrency(internal.value)}</span>
                        </div>
                        <div>
                            <span className="text-xs text-gray-500 block">Data Emissão</span>
                            <span className="text-sm text-gray-700">{formatDate(internal.date)}</span>
                        </div>
                        <div>
                            <span className="text-xs text-gray-500 block">Categoria</span>
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded bg-blue-100 text-blue-800">
                                {internal.category}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Center Icon */}
                <div className="flex items-center justify-center text-gray-400">
                    <svg className="w-8 h-8 transform md:rotate-0 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </div>

                {/* Right: External */}
                <div className="flex-1 bg-green-50 border border-green-100 rounded-lg p-5">
                    <div className="text-xs font-bold text-green-600 uppercase mb-3 tracking-wider">Título Financeiro (CSV)</div>
                    
                    <div className="space-y-3">
                        <div>
                            <span className="text-xs text-gray-500 block">Referência / CTE Encontrada</span>
                            <span className="text-xl font-bold text-gray-900">{candidate.refNumber}</span>
                        </div>
                        <div>
                            <span className="text-xs text-gray-500 block">Valor Título</span>
                            <span className="text-lg font-semibold text-gray-900">{formatCurrency(candidate.value)}</span>
                        </div>
                        <div>
                            <span className="text-xs text-gray-500 block">Data Documento</span>
                            <span className="text-sm text-gray-700">{formatDate(candidate.date)}</span>
                        </div>
                        <div>
                            <span className="text-xs text-gray-500 block">Status</span>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded ${
                                candidate.status === 'PAGO' ? 'bg-green-100 text-green-800' : 
                                candidate.status === 'A PAGAR' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                            }`}>
                                {candidate.status}
                            </span>
                        </div>
                        <div className="pt-2 border-t border-green-200 mt-2">
                            <span className="text-xs text-gray-500 block">Nº Documento (CSV): <span className="text-gray-800 font-mono">{candidate.docNumber}</span></span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-6 p-3 bg-yellow-50 border border-yellow-100 rounded text-sm text-yellow-800 flex gap-2">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p>
                    Atenção: Os números das CTEs são divergentes (parcialmente). Confirme se tratam do mesmo lançamento antes de vincular.
                </p>
            </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-white border border-gray-300 rounded text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={() => { onConfirm(); onClose(); }}
            className="px-4 py-2 bg-teal-600 text-white rounded font-medium hover:bg-teal-700 shadow-sm transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            Confirmar Vínculo
          </button>
        </div>
      </div>
    </div>
  );
};

export default MatchReviewModal;