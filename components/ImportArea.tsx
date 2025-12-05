
import React from 'react';
import FileUpload from './FileUpload';
import { ExternalRecord, InternalRecord } from '../types';

interface ImportAreaProps {
  onInternalUpload: (file: File, source: 'PUXADA' | 'ROTA') => void;
  onExternalUpload: (file: File, type: 'PAGO' | 'A PAGAR' | 'ADIANTADO') => void;
  internalRecords: InternalRecord[];
  externalRecords: ExternalRecord[];
  onClearExternal: () => void;
  onClearInternal: () => void;
}

const ImportArea: React.FC<ImportAreaProps> = ({ 
  onInternalUpload, 
  onExternalUpload, 
  internalRecords, 
  externalRecords,
  onClearExternal,
  onClearInternal
}) => {

  const puxadaCount = internalRecords.filter(r => r.source === 'PUXADA').length;
  const rotaCount = internalRecords.filter(r => r.source === 'ROTA').length;
  
  const pagosCount = externalRecords.filter(r => r.status === 'PAGO').length;
  const aPagarCount = externalRecords.filter(r => r.status === 'A PAGAR').length;
  const adiantadoCount = externalRecords.filter(r => r.status === 'ADIANTADO').length;

  return (
    <div className="space-y-8">
      <div className="border-b pb-4">
        <h2 className="text-2xl font-bold text-gray-800">Central de Importação</h2>
        <p className="text-gray-500">Alimente o sistema com as planilhas de controle e os CSVs financeiros.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Section 1: Internal Controls */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">1. Controles Internos (Excel)</h3>
                    <p className="text-sm text-gray-500">Planilhas de Puxada e Rota</p>
                </div>
                {internalRecords.length > 0 && (
                    <button onClick={onClearInternal} className="text-red-500 text-xs hover:underline">Limpar</button>
                )}
            </div>

            <div className="space-y-6">
                <div>
                    <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">Planilha de Puxada</span>
                        <span className={puxadaCount > 0 ? "text-green-600" : "text-gray-400"}>
                            {puxadaCount} registros carregados
                        </span>
                    </div>
                    <FileUpload 
                        label="" 
                        accept=".xlsx,.xls,.csv" 
                        onFileSelect={(f) => onInternalUpload(f, 'PUXADA')} 
                        colorClass="bg-orange-50 border-orange-200"
                    />
                </div>

                <div>
                    <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">Planilha de Rota</span>
                        <span className={rotaCount > 0 ? "text-green-600" : "text-gray-400"}>
                            {rotaCount} registros carregados
                        </span>
                    </div>
                    <FileUpload 
                        label="" 
                        accept=".xlsx,.xls,.csv" 
                        onFileSelect={(f) => onInternalUpload(f, 'ROTA')} 
                        colorClass="bg-indigo-50 border-indigo-200"
                    />
                </div>
            </div>
        </div>

        {/* Section 2: Financial DB */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">2. Banco de Títulos (CSV)</h3>
                    <p className="text-sm text-gray-500">Adicione múltiplos arquivos para compor o histórico.</p>
                </div>
                {externalRecords.length > 0 && (
                     <button onClick={onClearExternal} className="text-red-500 text-xs hover:underline">Limpar Banco de Dados</button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                     <div className="bg-green-50 rounded-lg p-3 border border-green-100 flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-green-900">Títulos Pagos</span>
                        <span className="text-xs bg-white px-2 py-1 rounded shadow-sm">{pagosCount} regs</span>
                     </div>
                     <FileUpload 
                        label="Adicionar CSV de Pagos" 
                        accept=".csv,.txt" 
                        onFileSelect={(f) => onExternalUpload(f, 'PAGO')} 
                        colorClass="bg-white border-gray-300 h-24"
                    />
                </div>

                <div>
                     <div className="bg-blue-50 rounded-lg p-3 border border-blue-100 flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-blue-900">A Pagar</span>
                        <span className="text-xs bg-white px-2 py-1 rounded shadow-sm">{aPagarCount} regs</span>
                     </div>
                     <FileUpload 
                        label="Adicionar CSV" 
                        accept=".csv,.txt" 
                        onFileSelect={(f) => onExternalUpload(f, 'A PAGAR')} 
                        colorClass="bg-white border-gray-300 h-24"
                    />
                </div>

                <div>
                     <div className="bg-purple-50 rounded-lg p-3 border border-purple-100 flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-purple-900">Adiantados</span>
                        <span className="text-xs bg-white px-2 py-1 rounded shadow-sm">{adiantadoCount} regs</span>
                     </div>
                     <FileUpload 
                        label="Adicionar CSV" 
                        accept=".csv,.txt" 
                        onFileSelect={(f) => onExternalUpload(f, 'ADIANTADO')} 
                        colorClass="bg-white border-gray-300 h-24"
                    />
                </div>
            </div>
            
            <div className="mt-4 p-3 bg-gray-50 rounded text-xs text-gray-500">
                ℹ️ O sistema acumula os arquivos. Você pode subir o "Pagos de Janeiro", depois "Pagos de Fevereiro", etc.
            </div>
        </div>
      </div>
    </div>
  );
};

export default ImportArea;
