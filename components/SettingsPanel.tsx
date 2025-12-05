
import React, { useState } from 'react';
import { CteConfig } from '../types';

interface SettingsPanelProps {
  config: CteConfig;
  onUpdate: (newConfig: CteConfig) => void;
  isOpen: boolean;
  onClose: () => void;
  onReset?: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ config, onUpdate, isOpen, onClose, onReset }) => {
  const [localConfig, setLocalConfig] = useState<CteConfig>(config);

  if (!isOpen) return null;

  const handleSave = () => {
    onUpdate(localConfig);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center">
      <div className="relative p-5 border w-96 shadow-lg rounded-md bg-white">
        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Parametrização de Valores</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Valor ROTA (Fixo)</label>
            <input 
              type="number" 
              value={localConfig.rotaValue}
              onChange={(e) => setLocalConfig({...localConfig, rotaValue: parseFloat(e.target.value)})}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Valores PUXADA (Comuns)</label>
            <input 
              type="text" 
              value={localConfig.puxadaValues.join(', ')}
              onChange={(e) => setLocalConfig({...localConfig, puxadaValues: e.target.value.split(',').map(v => parseFloat(v.trim()))})}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
              placeholder="Ex: 3150, 6300"
            />
            <p className="text-xs text-gray-500">Separar por vírgula</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Limite Máximo Puxada</label>
            <input 
              type="number" 
              value={localConfig.puxadaMaxThreshold}
              onChange={(e) => setLocalConfig({...localConfig, puxadaMaxThreshold: parseFloat(e.target.value)})}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
            />
            <p className="text-xs text-gray-500">Valores acima disso serão ACERTO</p>
          </div>

          <hr className="my-4"/>
          
          {onReset && (
            <div>
               <label className="block text-sm font-medium text-red-700 mb-1">Zona de Perigo</label>
               <button onClick={onReset} className="w-full text-center py-2 border border-red-300 text-red-600 rounded bg-red-50 hover:bg-red-100 text-sm">
                   Resetar Sistema (Limpar Tudo)
               </button>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
            <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 text-base font-medium rounded-md shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300"
            >
            Cancelar
            </button>
            <button
            onClick={handleSave}
            className="px-4 py-2 bg-indigo-600 text-white text-base font-medium rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
            Salvar
            </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
