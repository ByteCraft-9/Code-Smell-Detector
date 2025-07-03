import React from 'react';
import { FileCode, ArrowRight } from 'lucide-react';

interface EmptyStateProps {
  onStartClick: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ onStartClick }) => {
  return (
    <div className="text-center py-12 px-4">
      <FileCode className="mx-auto h-16 w-16 text-gray-400" />
      <h2 className="mt-4 text-lg font-medium text-gray-900">Detect C++ Code Smells</h2>
      <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
        Upload your C++ source files to identify potential code smells and get refactoring suggestions to improve your code quality.
      </p>
      
      <div className="mt-8">
        <button
          onClick={onStartClick}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          Get Started
          <ArrowRight className="ml-2 h-4 w-4" />
        </button>
      </div>
      
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-center h-10 w-10 rounded-md bg-primary-100 text-primary-600 mx-auto">
            <span className="text-lg font-bold">1</span>
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900 text-center">Upload Code</h3>
          <p className="mt-1 text-xs text-gray-500">
            Drag and drop your C++ source files or browse to select them.
          </p>
        </div>
        
        <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-center h-10 w-10 rounded-md bg-primary-100 text-primary-600 mx-auto">
            <span className="text-lg font-bold">2</span>
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900 text-center">Analyze</h3>
          <p className="mt-1 text-xs text-gray-500">
            Our analyzer will detect common code smells and potential issues.
          </p>
        </div>
        
        <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-center h-10 w-10 rounded-md bg-primary-100 text-primary-600 mx-auto">
            <span className="text-lg font-bold">3</span>
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900 text-center">Review Results</h3>
          <p className="mt-1 text-xs text-gray-500">
            Get insights and refactoring suggestions to improve your code.
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmptyState;