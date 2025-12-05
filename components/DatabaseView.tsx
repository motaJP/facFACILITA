
import React, { useState } from 'react';
import { ExternalRecord } from '../types';

interface DatabaseViewProps {
  records: ExternalRecord[];
}

const DatabaseView: React.FC<DatabaseViewProps> = ({ records }) => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');

  const filtered = records.filter(r => {
      const matchesSearch = 
        r.refNumber.includes(search) || 
        r.docNumber.includes(search) || 
        r.fileName.toLowerCase().includes(search.toLowerCase());
      
      const matchesType = filterType === 'ALL' || r.status === filterType;

      return matchesSearch && matchesType;
  });

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end border-b pb-4">
        <div>
            <h2 className="text-2xl font-bold text-gray-800">Banco de Títulos (Financeiro)</h2>
            <p className="text-gray-500">Dados brutos importados dos arquivos CSV.</p>
        </div>
        <div className="text-right">
            <span className="text-3xl font-bold text-gray-900">{records.length}</span>
            <span className="text-sm text-gray-500 block">Registros Totais</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex-1">
            <input 
                type="text" 
                placeholder="Buscar por CTE, Documento ou Arquivo..." 
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />
        </div>
        <select 
            className="border border-gray-300 rounded px-3 py-2 text-sm outline-none"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
        >
            <option value="ALL">Todos os Status</option>
            <option value="PAGO">Pagos</option>
            <option value="A PAGAR">A Pagar</option>
            <option value="ADIANTADO">Adiantados</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto max-h-[600px]">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                    <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Documento</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Referência (CTE)</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Origem (Arquivo)</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {filtered.slice(0, 500).map((row) => (
                        <tr key={row.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-sm text-gray-900">{row.docNumber}</td>
                            <td className="px-4 py-2 text-sm font-mono text-gray-600">{row.refNumber}</td>
                            <td className="px-4 py-2 text-sm text-gray-600">{row.date}</td>
                            <td className="px-4 py-2 text-sm font-medium text-gray-900">{formatCurrency(row.value)}</td>
                            <td className="px-4 py-2">
                                <span className={`inline-flex px-2 text-xs font-semibold rounded-full ${
                                    row.status === 'PAGO' ? 'bg-green-100 text-green-800' :
                                    row.status === 'A PAGAR' ? 'bg-blue-100 text-blue-800' :
                                    'bg-purple-100 text-purple-800'
                                }`}>
                                    {row.status}
                                </span>
                            </td>
                            <td className="px-4 py-2 text-xs text-gray-400 truncate max-w-[200px]" title={row.fileName}>
                                {row.fileName}
                            </td>
                        </tr>
                    ))}
                    {filtered.length > 500 && (
                        <tr>
                            <td colSpan={6} className="text-center py-2 text-xs text-gray-400">
                                Mostrando os primeiros 500 resultados de {filtered.length}...
                            </td>
                        </tr>
                    )}
                     {filtered.length === 0 && (
                        <tr>
                            <td colSpan={6} className="text-center py-8 text-gray-400">
                                Nenhum registro encontrado.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default DatabaseView;
