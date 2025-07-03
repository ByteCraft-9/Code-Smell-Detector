import React, { useState } from 'react';
import { AnalysisResult, AnalysisStats } from './types';
import { analyzeCode, calculateStats } from './utils/codeAnalysis';
import Header from './components/Header';
import FileUpload from './components/FileUpload';
import Dashboard from './components/Dashboard';
import EmptyState from './components/EmptyState';
import { v4 as uuidv4 } from 'uuid';

function App() {
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [stats, setStats] = useState<AnalysisStats | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  const handleFilesUploaded = async (files: File[]) => {
    setIsAnalyzing(true);
    
    try {
      // Create an array of promises for parallel processing
      const analysisPromises = files.map(async (file) => {
        const content = await file.text();
        return analyzeCode(content, file.name);
      });
      
      // Wait for all analysis operations to complete
      const analysisResults = await Promise.all(analysisPromises);
      
      setResults(analysisResults);
      setStats(calculateStats(analysisResults));
      setShowUpload(false);
    } catch (error) {
      console.error('Error analyzing files:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleStartClick = () => {
    setShowUpload(true);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Header />
      
      <main className="flex-1 py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {showUpload ? (
            <div className="mb-8">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Upload C++ Files</h2>
              <FileUpload onFilesUploaded={handleFilesUploaded} isAnalyzing={isAnalyzing} />
            </div>
          ) : results.length > 0 && stats ? (
            <>
              <div className="flex justify-end mb-4">
                <button
                  onClick={() => setShowUpload(true)}
                  className="px-3 py-1.5 text-sm font-medium text-primary-600 hover:text-primary-800 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 transition-colors"
                >
                  Upload More Files
                </button>
              </div>
              <Dashboard results={results} stats={stats} />
            </>
          ) : (
            <EmptyState onStartClick={handleStartClick} />
          )}
        </div>
      </main>
      
      <footer className="bg-white border-t py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-sm text-center text-gray-500">
            C++ Code Smell Detector • {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;