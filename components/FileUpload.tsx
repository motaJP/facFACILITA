import React, { useCallback } from 'react';

interface FileUploadProps {
  label: string;
  accept: string;
  onFileSelect: (file: File) => void;
  selectedFileName?: string;
  colorClass?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({ label, accept, onFileSelect, selectedFileName, colorClass = "border-gray-300 bg-gray-50" }) => {
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md relative hover:bg-opacity-50 transition-colors ${colorClass}`}>
        <div className="space-y-1 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="flex text-sm text-gray-600 justify-center">
            <label className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
              <span>Upload a file</span>
              <input type="file" className="sr-only" accept={accept} onChange={handleChange} />
            </label>
          </div>
          <p className="text-xs text-gray-500">CSV, TXT, XLS</p>
          {selectedFileName && (
            <p className="text-sm font-semibold text-emerald-600 mt-2">
              Selected: {selectedFileName}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileUpload;