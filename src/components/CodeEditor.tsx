import React, { useState, useEffect } from 'react';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { vs2015, github } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { CodeSmell } from '../types';
import { X, Eye, EyeOff, Sun, Moon, ZoomIn, ZoomOut } from 'lucide-react';

interface CodeEditorProps {
  smell: CodeSmell;
  fileContent: string;
  onClose: () => void;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ smell, fileContent, onClose }) => {
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  const [fontSize, setFontSize] = useState(14);
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [highlightedLines, setHighlightedLines] = useState<number[]>([]);

  useEffect(() => {
    // Calculate lines to highlight based on the smell
    const lines = [];
    const startLine = smell.lineNumber;
    const endLine = smell.endLineNumber || startLine;
    
    for (let i = startLine; i <= endLine; i++) {
      lines.push(i);
    }
    setHighlightedLines(lines);
  }, [smell]);

  const getLineProps = (lineNumber: number) => {
    const isHighlighted = highlightedLines.includes(lineNumber);
    return {
      style: {
        display: 'block',
        backgroundColor: isHighlighted 
          ? (isDarkTheme ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)')
          : 'transparent',
        borderLeft: isHighlighted 
          ? `4px solid ${isDarkTheme ? '#EF4444' : '#DC2626'}` 
          : 'none',
        paddingLeft: isHighlighted ? '8px' : '12px',
        margin: 0,
        cursor: 'pointer'
      },
      onClick: () => {
        // Scroll to line if needed
        const element = document.getElementById(`line-${lineNumber}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    };
  };

  const increaseFontSize = () => {
    setFontSize(prev => Math.min(prev + 2, 24));
  };

  const decreaseFontSize = () => {
    setFontSize(prev => Math.max(prev - 2, 10));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl h-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <div className="flex items-center space-x-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Code Inspector: {smell.fileName}
              </h2>
              <p className="text-sm text-gray-600">
                {smell.type.replace(/([A-Z])/g, ' $1').trim()} at line {smell.lineNumber}
              </p>
            </div>
            
            <div className="flex items-center space-x-2 text-sm">
              <span className={`px-2 py-1 rounded-full font-medium ${
                smell.severity === 'high' 
                  ? 'bg-error-100 text-error-800'
                  : smell.severity === 'medium'
                  ? 'bg-warning-100 text-warning-800'
                  : 'bg-secondary-100 text-secondary-800'
              }`}>
                {smell.severity.toUpperCase()}
              </span>
            </div>
          </div>
          
          {/* Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowLineNumbers(!showLineNumbers)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              title={showLineNumbers ? 'Hide line numbers' : 'Show line numbers'}
            >
              {showLineNumbers ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            
            <button
              onClick={decreaseFontSize}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              title="Decrease font size"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            
            <span className="text-xs text-gray-500 px-2">{fontSize}px</span>
            
            <button
              onClick={increaseFontSize}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              title="Increase font size"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            
            <button
              onClick={() => setIsDarkTheme(!isDarkTheme)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              title={isDarkTheme ? 'Switch to light theme' : 'Switch to dark theme'}
            >
              {isDarkTheme ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              title="Close editor"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Code Smell Info */}
        <div className="px-4 py-3 bg-blue-50 border-b">
          <div className="flex items-start space-x-3">
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900 mb-1">
                Issue Description:
              </p>
              <p className="text-sm text-blue-800 mb-2">
                {smell.description}
              </p>
              <p className="text-sm font-medium text-blue-900 mb-1">
                Refactoring Suggestion:
              </p>
              <p className="text-sm text-blue-800">
                {smell.refactoringTip}
              </p>
            </div>
            
            {smell.metrics && (
              <div className="bg-white p-3 rounded-md border min-w-[200px]">
                <h4 className="text-xs font-medium uppercase text-gray-500 mb-2">
                  Code Metrics
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500">Complexity:</span>
                    <p className="font-medium">{smell.metrics.cyclomaticComplexity}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">LOC:</span>
                    <p className="font-medium">{smell.metrics.linesOfCode}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Coupling:</span>
                    <p className="font-medium">{smell.metrics.couplingCount}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Cohesion:</span>
                    <p className="font-medium">{(smell.metrics.cohesionScore * 100).toFixed(0)}%</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Code Editor */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full overflow-auto">
            <SyntaxHighlighter
              language="cpp"
              style={isDarkTheme ? vs2015 : github}
              showLineNumbers={showLineNumbers}
              lineNumberStyle={{
                minWidth: '3em',
                paddingRight: '1em',
                textAlign: 'right',
                userSelect: 'none',
                color: isDarkTheme ? '#6B7280' : '#9CA3AF'
              }}
              customStyle={{
                margin: 0,
                padding: '1rem',
                fontSize: `${fontSize}px`,
                lineHeight: '1.5',
                fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                background: isDarkTheme ? '#1E1E1E' : '#FFFFFF',
                minHeight: '100%'
              }}
              lineProps={getLineProps}
              wrapLines={true}
              wrapLongLines={true}
            >
              {fileContent}
            </SyntaxHighlighter>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-gray-50 border-t">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>
              Showing {smell.fileName} • Lines highlighted: {highlightedLines.join(', ')}
            </div>
            <div>
              Total lines: {fileContent.split('\n').length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodeEditor;