
import React, { useState, useMemo, useEffect } from 'react';
import { DEFAULT_CONFIG } from './constants';
import { CteConfig, ReconciliationResult, MatchStatus, CteCategory, InternalRecord, ExternalRecord, InternalSource } from './types';
import Sidebar from './components/Sidebar';
import ImportArea from './components/ImportArea';
import DatabaseView from './components/DatabaseView';
import SettingsPanel from './components/SettingsPanel';
import ResultTable from './components/ResultTable';
import { processInternalFile, processExternalFiles, reconcileData, generateExcelReport } from './services/dataProcessor';

// Helper for month names
const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const STORAGE_KEYS = {
    INTERNAL: 'facilita_internal_records',
    EXTERNAL: 'facilita_external_records',
    CONFIRMED: 'facilita_confirmed_matches',
    CONFIG: 'facilita_config'
};

const App: React.FC = () => {
  const [config, setConfig] = useState<CteConfig>(DEFAULT_CONFIG);
  const [activeTab, setActiveTab] = useState('import'); 
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // -- Data State --
  const [internalRecords, setInternalRecords] = useState<InternalRecord[]>([]);
  const [externalRecords, setExternalRecords] = useState<ExternalRecord[]>([]);
  
  // -- Manual Confirmation State --
  const [confirmedMatches, setConfirmedMatches] = useState<Record<string, string>>({});
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [dataLoaded, setDataLoaded] = useState(false);

  // -- Persistence: Load --
  useEffect(() => {
    try {
        const savedInternal = localStorage.getItem(STORAGE_KEYS.INTERNAL);
        const savedExternal = localStorage.getItem(STORAGE_KEYS.EXTERNAL);
        const savedConfirmed = localStorage.getItem(STORAGE_KEYS.CONFIRMED);
        const savedConfig = localStorage.getItem(STORAGE_KEYS.CONFIG);

        if (savedInternal) setInternalRecords(JSON.parse(savedInternal));
        if (savedExternal) setExternalRecords(JSON.parse(savedExternal));
        if (savedConfirmed) setConfirmedMatches(JSON.parse(savedConfirmed));
        if (savedConfig) setConfig(JSON.parse(savedConfig));
        
        setDataLoaded(true);
    } catch (e) {
        console.error("Failed to load persistence", e);
        setDataLoaded(true);
    }
  }, []);

  // -- Persistence: Save --
  useEffect(() => {
    if (!dataLoaded) return;
    localStorage.setItem(STORAGE_KEYS.INTERNAL, JSON.stringify(internalRecords));
  }, [internalRecords, dataLoaded]);

  useEffect(() => {
    if (!dataLoaded) return;
    localStorage.setItem(STORAGE_KEYS.EXTERNAL, JSON.stringify(externalRecords));
  }, [externalRecords, dataLoaded]);

  useEffect(() => {
    if (!dataLoaded) return;
    localStorage.setItem(STORAGE_KEYS.CONFIRMED, JSON.stringify(confirmedMatches));
  }, [confirmedMatches, dataLoaded]);

  useEffect(() => {
    if (!dataLoaded) return;
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
  }, [config, dataLoaded]);


  // -- Derived Results --
  const results: ReconciliationResult[] = useMemo(() => {
    if (internalRecords.length === 0) return [];
    return reconcileData(internalRecords, externalRecords, confirmedMatches);
  }, [internalRecords, externalRecords, lastUpdated, confirmedMatches]);

  const dashboardData = useMemo(() => {
    if (results.length === 0) return null;

    // Financial Summaries
    const summary = {
        paid: 0,
        paidCount: 0,
        scheduled: 0,
        scheduledCount: 0,
        pending: 0,
        pendingCount: 0,
        anticipated: 0,
        anticipatedCount: 0,
    };

    // Monthly Pivot Data
    const pivot: Record<string, any> = {};

    results.forEach(item => {
        const val = item.record.value || 0;
        const cat = item.record.category;
        
        // --- Status Aggregation ---
        if (item.status === MatchStatus.MATCHED && item.matchCandidate) {
            const status = item.matchCandidate.status;
            if (status === 'PAGO') {
                summary.paid += val;
                summary.paidCount++;
            } else if (status === 'A PAGAR') {
                summary.scheduled += val;
                summary.scheduledCount++;
            } else if (status === 'ADIANTADO') {
                summary.anticipated += val;
                summary.anticipatedCount++;
                summary.paid += val; 
            }
        } else {
            summary.pending += val;
            summary.pendingCount++;
        }

        // --- Pivot Table Aggregation ---
        if (item.record.date) {
            const dateObj = new Date(item.record.date);
            if (!isNaN(dateObj.getTime())) {
                const year = dateObj.getFullYear();
                const month = dateObj.getMonth(); // 0-11
                const key = `${year}-${String(month + 1).padStart(2, '0')}`;

                if (!pivot[key]) {
                    pivot[key] = {
                        key,
                        year,
                        month,
                        label: `${MONTH_NAMES[month] || 'Mês'}/${year.toString().slice(-2)}`,
                        rota: { qty: 0, val: 0 },
                        puxada: { qty: 0, val: 0 },
                        iss: { qty: 0, val: 0 },
                        acerto: { qty: 0, val: 0 }
                    };
                }

                const entry = pivot[key];
                const target = 
                    cat === CteCategory.ROTA ? entry.rota :
                    cat === CteCategory.PUXADA ? entry.puxada :
                    cat === CteCategory.ISS ? entry.iss :
                    entry.acerto;

                target.qty++;
                target.val += val;
            }
        }
    });

    const pivotList = Object.values(pivot).sort((a: any, b: any) => b.key.localeCompare(a.key));
    return { summary, pivotList };
  }, [results]);

  // -- Handlers --

  const handleInternalUpload = async (file: File, source: InternalSource) => {
      setIsProcessing(true);
      try {
          const newRecords = await processInternalFile(file, config, source);
          setInternalRecords(prev => [...prev, ...newRecords]);
          setLastUpdated(new Date());
          alert(`${newRecords.length} registros de ${source} carregados com sucesso.`);
      } catch (e) {
          console.error(e);
          alert("Erro ao ler arquivo.");
      } finally {
          setIsProcessing(false);
      }
  };

  const handleExternalUpload = async (file: File, type: 'PAGO' | 'A PAGAR' | 'ADIANTADO') => {
      setIsProcessing(true);
      try {
          const newRecords = await processExternalFiles([{ file, type }]);
          setExternalRecords(prev => [...prev, ...newRecords]);
          setLastUpdated(new Date());
          alert(`${newRecords.length} títulos (${type}) adicionados ao banco.`);
      } catch (e) {
          console.error(e);
          alert("Erro ao ler CSV.");
      } finally {
          setIsProcessing(false);
      }
  };

  const handleConfirmMatch = (internalId: string, externalId: string) => {
    setConfirmedMatches(prev => ({ ...prev, [internalId]: externalId }));
  };

  const handleExport = () => {
      if (results.length === 0) {
          alert("Não há dados para exportar.");
          return;
      }
      generateExcelReport(results);
  };

  const handleClearSystem = () => {
      if(window.confirm("ATENÇÃO: Isso apagará TODOS os dados importados e vínculos manuais. Deseja continuar?")) {
          setInternalRecords([]);
          setExternalRecords([]);
          setConfirmedMatches({});
          localStorage.clear();
          window.location.reload();
      }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
      {/* Sidebar */}
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content Area */}
      <div className="flex-1 ml-64 overflow-y-auto">
         {/* Top Bar */}
         <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30 px-8 py-4 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">
                {activeTab === 'dashboard' ? 'Dashboard Financeiro' : 
                 activeTab === 'import' ? 'Importação de Dados' : 'Banco de Títulos'}
            </h2>
            <div className="flex gap-3">
                 {activeTab === 'dashboard' && results.length > 0 && (
                     <button 
                        onClick={handleExport}
                        className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-md shadow-sm flex items-center gap-2 transition-colors"
                     >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4-4m0 0L8 8m4-4v12" /></svg>
                        Exportar Relatório (XLSX)
                     </button>
                 )}
                 <button 
                    onClick={() => setIsSettingsOpen(true)}
                    className="text-gray-600 hover:text-gray-900 text-sm font-medium flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    Configurar
                </button>
            </div>
         </header>

         <main className="p-8 max-w-[1920px] mx-auto">
            
            {activeTab === 'import' && (
                <ImportArea 
                    onInternalUpload={handleInternalUpload}
                    onExternalUpload={handleExternalUpload}
                    internalRecords={internalRecords}
                    externalRecords={externalRecords}
                    onClearInternal={() => setInternalRecords([])}
                    onClearExternal={() => setExternalRecords([])}
                />
            )}

            {activeTab === 'database' && (
                <DatabaseView records={externalRecords} />
            )}

            {activeTab === 'dashboard' && (
                <>
                    {!dashboardData ? (
                        <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-gray-200">
                            <svg className="mx-auto h-16 w-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <h3 className="mt-4 text-lg font-medium text-gray-900">Nenhum dado para exibir</h3>
                            <p className="mt-1 text-sm text-gray-500">Importe as planilhas de Puxada, Rota e Títulos Financeiros para ver o dashboard.</p>
                            <button 
                                onClick={() => setActiveTab('import')}
                                className="mt-6 px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700"
                            >
                                Ir para Importação
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Stats Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 border-l-4 border-l-green-500">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Pago</p>
                                    <h3 className="text-2xl font-bold text-gray-800 mt-1">{formatCurrency(dashboardData.summary.paid)}</h3>
                                    <p className="text-xs text-green-600 mt-2 font-medium">{dashboardData.summary.paidCount} CTEs baixados</p>
                                </div>

                                <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 border-l-4 border-l-blue-500">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Agendado</p>
                                    <h3 className="text-2xl font-bold text-gray-800 mt-1">{formatCurrency(dashboardData.summary.scheduled)}</h3>
                                    <p className="text-xs text-blue-600 mt-2 font-medium">{dashboardData.summary.scheduledCount} CTEs previstos</p>
                                </div>

                                <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 border-l-4 border-l-red-500">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pendentes</p>
                                    <h3 className="text-2xl font-bold text-gray-800 mt-1">{formatCurrency(dashboardData.summary.pending)}</h3>
                                    <p className="text-xs text-red-600 mt-2 font-medium">{dashboardData.summary.pendingCount} CTEs sem vínculo</p>
                                </div>

                                <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 bg-gradient-to-br from-purple-50 to-white">
                                    <p className="text-xs font-bold text-purple-400 uppercase tracking-wider">Adiantamentos</p>
                                    <h3 className="text-2xl font-bold text-purple-900 mt-1">{formatCurrency(dashboardData.summary.anticipated)}</h3>
                                    <p className="text-xs text-purple-600 mt-2 font-medium">Incluso no total pago</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                                {/* Result Table */}
                                <div className="xl:col-span-2">
                                    <ResultTable 
                                        results={results} 
                                        onConfirmMatch={handleConfirmMatch}
                                    />
                                </div>

                                {/* Pivot Table */}
                                <div className="xl:col-span-1">
                                    <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
                                        <div className="px-5 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                                            <h3 className="font-semibold text-gray-900">Evolução Mensal</h3>
                                            <span className="text-xs bg-gray-200 px-2 py-1 rounded text-gray-600">Por Competência</span>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mês</th>
                                                        <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Puxada</th>
                                                        <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Rota</th>
                                                        <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">ISS</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {dashboardData.pivotList.map((row: any) => (
                                                        <tr key={row.key} className="hover:bg-gray-50">
                                                            <td className="px-3 py-3 whitespace-nowrap text-sm font-medium text-gray-900 bg-gray-50 border-r border-gray-100">
                                                                {row.label}
                                                            </td>
                                                            <td className="px-3 py-2 whitespace-nowrap text-right">
                                                                <div className="text-xs text-gray-900 font-semibold">{formatCurrency(row.puxada.val)}</div>
                                                                <div className="text-[10px] text-gray-400">{row.puxada.qty} un</div>
                                                            </td>
                                                            <td className="px-3 py-2 whitespace-nowrap text-right">
                                                                <div className="text-xs text-gray-900 font-semibold">{formatCurrency(row.rota.val)}</div>
                                                                <div className="text-[10px] text-gray-400">{row.rota.qty} un</div>
                                                            </td>
                                                            <td className="px-3 py-2 whitespace-nowrap text-right">
                                                                <div className="text-xs text-gray-900 font-semibold">{formatCurrency(row.iss.val)}</div>
                                                                <div className="text-[10px] text-gray-400">{row.iss.qty} un</div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    <tr className="bg-slate-50 border-t-2 border-slate-100">
                                                        <td className="px-3 py-3 text-xs font-bold text-gray-900">TOTAL</td>
                                                        <td className="px-3 py-3 text-right text-xs font-bold text-gray-900">
                                                            {formatCurrency(dashboardData.pivotList.reduce((acc: number, r: any) => acc + r.puxada.val, 0))}
                                                        </td>
                                                        <td className="px-3 py-3 text-right text-xs font-bold text-gray-900">
                                                            {formatCurrency(dashboardData.pivotList.reduce((acc: number, r: any) => acc + r.rota.val, 0))}
                                                        </td>
                                                        <td className="px-3 py-3 text-right text-xs font-bold text-gray-900">
                                                            {formatCurrency(dashboardData.pivotList.reduce((acc: number, r: any) => acc + r.iss.val, 0))}
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            <SettingsPanel 
                isOpen={isSettingsOpen} 
                onClose={() => setIsSettingsOpen(false)} 
                config={config} 
                onUpdate={setConfig}
                onReset={handleClearSystem}
            />

         </main>
      </div>
    </div>
  );
};

export default App;
