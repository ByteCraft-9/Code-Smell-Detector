import React, { useState } from 'react';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { vs2015 } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { CodeSmell } from '../types';
import { AlertTriangle, ChevronDown, ChevronUp, Code, FileWarning, Activity, Eye } from 'lucide-react';

interface SmellCardProps {
  smell: CodeSmell;
  onLineClick?: (fileName: string, line: number) => void;
  onViewFullCode?: (smell: CodeSmell) => void;
}

const SmellCard: React.FC<SmellCardProps> = ({ smell, onLineClick, onViewFullCode }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-error-100 text-error-800';
      case 'medium':
        return 'bg-warning-100 text-warning-800';
      case 'low':
        return 'bg-secondary-100 text-secondary-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSmellTypeIcon = (type: string) => {
    switch (type) {
      case 'LongFunction':
      case 'LargeClass':
        return <Code className="h-4 w-4" />;
      default:
        return <FileWarning className="h-4 w-4" />;
    }
  };

  const handleLineClick = (lineNumber: number) => {
    if (onLineClick) {
      onLineClick(smell.fileName, lineNumber);
    }
  };

  const handleViewFullCode = () => {
    if (onViewFullCode) {
      onViewFullCode(smell);
    }
  };

  return (
    <div className="border rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
      <div 
        className="px-4 py-3 bg-white flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-3">
          <div className={`p-1.5 rounded-md ${getSeverityColor(smell.severity)}`}>
            {getSmellTypeIcon(smell.type)}
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-900">
              {smell.type.replace(/([A-Z])/g, ' $1').trim()}
            </h3>
            <p className="text-xs text-gray-500">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleLineClick(smell.lineNumber);
                }}
                className="hover:text-primary-600 hover:underline"
              >
                {smell.fileName}:{smell.lineNumber}
              </button>
              {" - "}
              {smell.entityName}
            </p>
          </div>
          
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getSeverityColor(smell.severity)}`}>
            {smell.severity.toUpperCase()}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleViewFullCode();
            }}
            className="p-1.5 text-primary-600 hover:text-primary-800 hover:bg-primary-50 rounded-md transition-colors"
            title="View full code"
          >
            <Eye className="h-4 w-4" />
          </button>
          
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
        </div>
      </div>
      
      {isExpanded && (
        <div className="border-t px-4 py-3 bg-gray-50">
          <div className="space-y-3">
            <div>
              <h4 className="text-xs font-medium uppercase text-gray-500 mb-1">Description</h4>
              <p className="text-sm text-gray-700">{smell.description}</p>
            </div>
            
            {smell.metrics && (
              <div className="bg-white p-3 rounded-md border">
                <h4 className="text-xs font-medium uppercase text-gray-500 mb-2 flex items-center">
                  <Activity className="h-3 w-3 mr-1" />
                  Code Metrics
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                  <div>
                    <span className="text-xs text-gray-500">Complexity:</span>
                    <p className="font-medium">{smell.metrics.cyclomaticComplexity}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">LOC:</span>
                    <p className="font-medium">{smell.metrics.linesOfCode}</p>
                  </div>
                  {smell.metrics.methodCount > 0 && (
                    <div>
                      <span className="text-xs text-gray-500">Methods:</span>
                      <p className="font-medium">{smell.metrics.methodCount}</p>
                    </div>
                  )}
                  {smell.metrics.inheritanceDepth > 0 && (
                    <div>
                      <span className="text-xs text-gray-500">Inheritance Depth:</span>
                      <p className="font-medium">{smell.metrics.inheritanceDepth}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-xs text-gray-500">Coupling:</span>
                    <p className="font-medium">{smell.metrics.couplingCount}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Cohesion:</span>
                    <p className="font-medium">{(smell.metrics.cohesionScore * 100).toFixed(0)}%</p>
                  </div>
                </div>
              </div>
            )}
            
            <div>
              <h4 className="text-xs font-medium uppercase text-gray-500 mb-1">Code Snippet</h4>
              <div className="rounded-md overflow-hidden text-xs">
                <SyntaxHighlighter
                  language="cpp"
                  style={vs2015}
                  showLineNumbers
                  startingLineNumber={smell.lineNumber}
                  customStyle={{ borderRadius: '0.375rem', fontSize: '0.8rem' }}
                  lineProps={(lineNumber) => ({
                    style: { cursor: 'pointer' },
                    onClick: () => handleLineClick(lineNumber)
                  })}
                >
                  {smell.codeSnippet}
                </SyntaxHighlighter>
              </div>
            </div>
            
            <div className="bg-success-50 border border-success-200 rounded-md p-3">
              <h4 className="text-xs font-medium uppercase text-success-700 mb-1 flex items-center">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Refactoring Suggestion
              </h4>
              <p className="text-sm text-success-900">{smell.refactoringTip}</p>
            </div>

            <div className="pt-2 border-t">
              <button
                onClick={handleViewFullCode}
                className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-md transition-colors"
              >
                <Eye className="h-4 w-4 mr-2" />
                View Full Source Code
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmellCard;