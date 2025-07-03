import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, X, FileCode, AlertTriangle } from 'lucide-react';

interface FileUploadProps {
  onFilesUploaded: (files: File[]) => void;
  isAnalyzing: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFilesUploaded, isAnalyzing }) => {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError(null);
    
    // Filter for C++ files
    const cppFiles = acceptedFiles.filter(file => 
      file.name.endsWith('.cpp') || 
      file.name.endsWith('.h') || 
      file.name.endsWith('.hpp') || 
      file.name.endsWith('.cc')
    );
    
    if (cppFiles.length === 0 && acceptedFiles.length > 0) {
      setError('Please upload only C++ files (.cpp, .h, .hpp, .cc)');
      return;
    }

    // Check file size
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    const oversizedFiles = cppFiles.filter(file => file.size > MAX_FILE_SIZE);
    if (oversizedFiles.length > 0) {
      setError(`Some files exceed the 5MB size limit: ${oversizedFiles.map(f => f.name).join(', ')}`);
      return;
    }

    // Add new files to existing ones
    setUploadedFiles(prev => {
      const newFiles = [...prev];
      cppFiles.forEach(file => {
        if (!newFiles.some(f => f.name === file.name)) {
          newFiles.push(file);
        }
      });
      return newFiles;
    });
  }, []);

  const { getRootProps, getInputProps } = useDropzone({ 
    onDrop,
    accept: {
      'text/x-c++src': ['.cpp', '.h', '.hpp', '.cc']
    },
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false)
  });

  const removeFile = (fileToRemove: File) => {
    setUploadedFiles(uploadedFiles.filter(file => file !== fileToRemove));
  };

  const handleAnalyze = () => {
    if (uploadedFiles.length === 0) {
      setError('Please upload at least one C++ file');
      return;
    }
    
    onFilesUploaded(uploadedFiles);
  };

  const getTotalSize = () => {
    const bytes = uploadedFiles.reduce((acc, file) => acc + file.size, 0);
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <div 
        {...getRootProps()} 
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
          isDragActive 
            ? 'border-primary-500 bg-primary-50 scale-102' 
            : 'border-gray-300 hover:border-primary-400'
        }`}
      >
        <input {...getInputProps()} />
        <UploadCloud 
          className={`mx-auto h-12 w-12 ${
            isDragActive ? 'text-primary-500' : 'text-gray-400'
          }`} 
        />
        <p className="mt-2 text-sm font-medium text-gray-700">
          {isDragActive ? 'Drop your C++ files here' : 'Drag & drop C++ files here, or click to browse'}
        </p>
        <p className="mt-1 text-xs text-gray-500">
          Supported file types: .cpp, .h, .hpp, .cc (Max 5MB per file)
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-error-50 text-error-700 rounded-md">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {uploadedFiles.length > 0 && (
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-700">
                Files ready for analysis ({uploadedFiles.length})
              </h3>
              <span className="text-xs text-gray-500">
                Total size: {getTotalSize()}
              </span>
            </div>
          </div>
          
          <ul className="divide-y max-h-60 overflow-y-auto">
            {uploadedFiles.map((file, index) => (
              <li 
                key={`${file.name}-${index}`} 
                className="flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <FileCode className="h-5 w-5 text-secondary-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{file.name}</p>
                    <p className="text-xs text-gray-500">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => removeFile(file)}
                  className="p-1 text-gray-400 hover:text-error-500 transition-colors"
                  disabled={isAnalyzing}
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
          
          <div className="p-4 bg-gray-50 rounded-b-lg">
            <button 
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className={`w-full py-2.5 px-4 rounded-md text-white font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                isAnalyzing 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-primary-600 hover:bg-primary-700 active:bg-primary-800'
              }`}
            >
              {isAnalyzing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <FileCode className="h-4 w-4" />
                  <span>Analyze {uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''}</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;