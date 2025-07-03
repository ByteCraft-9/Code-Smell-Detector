import React, { useState } from 'react';
import { 
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, Legend, 
  ResponsiveContainer, CartesianGrid, LineChart, Line 
} from 'recharts';
import { AnalysisResult, AnalysisStats, CodeSmell, CodeSmellType } from '../types';
import { getSmellDescription, getRefactoringTip, getFileContent } from '../utils/codeAnalysis';
import SmellCard from './SmellCard';
import CodeEditor from './CodeEditor';
import { 
  FileWarning, BarChart2, PieChart as PieChartIcon, Filter, 
  Download, TrendingUp, AlertTriangle, FileCode, Clock 
} from 'lucide-react';
import { PDFReportGenerator } from '../utils/pdfGenerator';

interface DashboardProps {
  results: AnalysisResult[];
  stats: AnalysisStats;
}

const COLORS = [
  '#4338CA', '#0F766E', '#C2410C', '#15803D', '#B45309', 
  '#B91C1C', '#6366F1', '#047857', '#EA580C', '#0369A1'
];

const Dashboard: React.FC<DashboardProps> = ({ results, stats }) => {
  const [activeTab, setActiveTab] = useState<'smells' | 'charts'>('charts');
  const [selectedSmellType, setSelectedSmellType] = useState<CodeSmellType | 'all'>('all');
  const [selectedFile, setSelectedFile] = useState<string | 'all'>('all');
  const [sortBy, setSortBy] = useState<'severity' | 'file' | 'type'>('severity');
  const [timeRange, setTimeRange] = useState<'all' | 'day' | 'week'>('all');
  const [selectedSmellForEditor, setSelectedSmellForEditor] = useState<CodeSmell | null>(null);

  // Prepare data for charts
  const smellsByTypeData = Object.entries(stats.smellsByType).map(([type, count]) => ({
    name: type.replace(/([A-Z])/g, ' $1').trim(),
    value: count,
    type: type as CodeSmellType,
  }));

  const smellsByFileData = Object.entries(stats.smellsByFile)
    .map(([fileName, count]) => ({
      name: fileName.length > 20 ? '...' + fileName.slice(-20) : fileName,
      fullName: fileName,
      value: count,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  // Calculate severity distribution
  const severityDistribution = results.flatMap(r => r.smells).reduce((acc, smell) => {
    acc[smell.severity] = (acc[smell.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const severityData = Object.entries(severityDistribution).map(([severity, count]) => ({
    name: severity.charAt(0).toUpperCase() + severity.slice(1),
    value: count,
  }));

  // Get all smells across all files
  const allSmells = results.flatMap(result => result.smells);

  // Filter smells based on selected criteria
  const filteredSmells = allSmells.filter(smell => {
    const matchesType = selectedSmellType === 'all' || smell.type === selectedSmellType;
    const matchesFile = selectedFile === 'all' || smell.fileName === selectedFile;
    return matchesType && matchesFile;
  });

  // Sort smells based on selected criteria
  const sortedSmells = [...filteredSmells].sort((a, b) => {
    if (sortBy === 'severity') {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    } else if (sortBy === 'file') {
      return a.fileName.localeCompare(b.fileName);
    } else {
      return a.type.localeCompare(b.type);
    }
  });

  const exportResults = async () => {
    const pdfGenerator = new PDFReportGenerator();
    try {
      const pdfDataUri = await pdfGenerator.generateReport(results, stats);
      const linkElement = document.createElement('a');
      linkElement.href = pdfDataUri;
      linkElement.download = `code-smell-analysis-${new Date().toISOString().split('T')[0]}.pdf`;
      linkElement.click();
    } catch (error) {
      console.error('Error generating PDF:', error);
      // Fallback to JSON export
      const exportData = {
        summary: stats,
        detailedResults: results,
        timestamp: new Date().toISOString(),
      };
      
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
      const exportFileName = `code-smell-analysis-${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileName);
      linkElement.click();
    }
  };

  const handleViewFullCode = (smell: CodeSmell) => {
    setSelectedSmellForEditor(smell);
  };

  const handleCloseEditor = () => {
    setSelectedSmellForEditor(null);
  };

  // Get unique file names
  const fileNames = Array.from(new Set(results.map(result => result.fileName)));

  // Calculate summary metrics
  const criticalSmells = allSmells.filter(smell => smell.severity === 'high').length;
  const avgSmellsPerFile = (stats.totalSmells / stats.totalFiles).toFixed(1);
  const mostCommonSmell = Object.entries(stats.smellsByType)
    .sort((a, b) => b[1] - a[1])[0][0]
    .replace(/([A-Z])/g, ' $1').trim();

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Files Analyzed</p>
              <h3 className="text-2xl font-semibold text-gray-900">{stats.totalFiles}</h3>
            </div>
            <FileCode className="h-8 w-8 text-primary-500" />
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Average {avgSmellsPerFile} smells per file
          </p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Code Smells</p>
              <h3 className="text-2xl font-semibold text-gray-900">{stats.totalSmells}</h3>
            </div>
            <AlertTriangle className="h-8 w-8 text-warning-500" />
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Most common: {mostCommonSmell}
          </p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Critical Issues</p>
              <h3 className="text-2xl font-semibold text-gray-900">{criticalSmells}</h3>
            </div>
            <TrendingUp className="h-8 w-8 text-error-500" />
          </div>
          <p className="mt-2 text-xs text-gray-500">
            High severity smells requiring attention
          </p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Worst File</p>
              <h3 className="text-lg font-semibold text-gray-900 truncate max-w-[180px]">
                {stats.worstFiles[0]?.fileName || 'N/A'}
              </h3>
            </div>
            <FileWarning className="h-8 w-8 text-secondary-500" />
          </div>
          <p className="mt-2 text-xs text-gray-500">
            {stats.worstFiles[0]?.smellCount || 0} code smells detected
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gray-50 border-b flex flex-col sm:flex-row sm:items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Code Analysis Results</h2>
            <p className="text-sm text-gray-600 mt-1">
              Comprehensive analysis of your C++ codebase
            </p>
          </div>
          <div className="mt-3 sm:mt-0 flex space-x-2">
            <button
              className="flex items-center px-3 py-1.5 text-sm font-medium rounded-md border text-gray-700 hover:bg-gray-50 transition-colors"
              onClick={exportResults}
            >
              <Download className="h-4 w-4 mr-1" />
              Export Analysis
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <div className="flex">
            <button
              className={`px-4 py-3 text-sm font-medium ${
                activeTab === 'charts'
                  ? 'border-b-2 border-primary-500 text-primary-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
              onClick={() => setActiveTab('charts')}
            >
              <BarChart2 className="h-4 w-4 inline mr-1" />
              Analytics
            </button>
            <button
              className={`px-4 py-3 text-sm font-medium ${
                activeTab === 'smells'
                  ? 'border-b-2 border-primary-500 text-primary-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
              onClick={() => setActiveTab('smells')}
            >
              <FileWarning className="h-4 w-4 inline mr-1" />
              Detailed Findings
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'charts' ? (
            <div className="space-y-6">
              {/* Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Code Smells by Type */}
                <div className="bg-white p-4 rounded-lg shadow-sm border">
                  <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
                    <BarChart2 className="h-5 w-5 text-primary-600 mr-2" />
                    Distribution by Type
                  </h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={smellsByTypeData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="name"
                          angle={-45}
                          textAnchor="end"
                          height={70}
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis />
                        <Tooltip
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-white p-3 border rounded-lg shadow-lg">
                                  <p className="font-medium">{label}</p>
                                  <p className="text-primary-600">
                                    Count: {payload[0].value}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {(payload[0].value / stats.totalSmells * 100).toFixed(1)}% of total
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="value" name="Count">
                          {smellsByTypeData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Severity Distribution */}
                <div className="bg-white p-4 rounded-lg shadow-sm border">
                  <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
                    <PieChartIcon className="h-5 w-5 text-primary-600 mr-2" />
                    Severity Distribution
                  </h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={severityData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {severityData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={entry.name === 'High' ? '#DC2626' : entry.name === 'Medium' ? '#F59E0B' : '#2DD4BF'}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-white p-3 border rounded-lg shadow-lg">
                                  <p className="font-medium">{payload[0].name} Severity</p>
                                  <p className="text-primary-600">
                                    Count: {payload[0].value}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {(payload[0].value / stats.totalSmells * 100).toFixed(1)}% of total
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Files with Most Smells */}
                <div className="lg:col-span-2 bg-white p-4 rounded-lg shadow-sm border">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Top Files by Code Smells</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            File Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Smell Count
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Distribution
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Severity Breakdown
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {stats.worstFiles.map((file) => {
                          const fileSmells = allSmells.filter(smell => smell.fileName === file.fileName);
                          const severityCounts = fileSmells.reduce((acc, smell) => {
                            acc[smell.severity] = (acc[smell.severity] || 0) + 1;
                            return acc;
                          }, {} as Record<string, number>);

                          return (
                            <tr key={file.fileName} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {file.fileName}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {file.smellCount}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="w-full bg-gray-200 rounded-full h-2.5">
                                  <div
                                    className="bg-primary-600 h-2.5 rounded-full"
                                    style={{ width: `${(file.smellCount / stats.totalSmells) * 100}%` }}
                                  ></div>
                                </div>
                                <span className="text-xs text-gray-500">
                                  {((file.smellCount / stats.totalSmells) * 100).toFixed(1)}%
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center space-x-2">
                                  {severityCounts.high > 0 && (
                                    <span className="px-2 py-1 text-xs rounded-full bg-error-100 text-error-700">
                                      {severityCounts.high} High
                                    </span>
                                  )}
                                  {severityCounts.medium > 0 && (
                                    <span className="px-2 py-1 text-xs rounded-full bg-warning-100 text-warning-700">
                                      {severityCounts.medium} Medium
                                    </span>
                                  )}
                                  {severityCounts.low > 0 && (
                                    <span className="px-2 py-1 text-xs rounded-full bg-secondary-100 text-secondary-700">
                                      {severityCounts.low} Low
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div>
              {/* Filters for Detailed Findings */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6 bg-gray-50 p-4 rounded-md">
                <div className="flex items-center">
                  <Filter className="h-4 w-4 text-gray-500 mr-2" />
                  <span className="text-sm font-medium text-gray-700">Filter:</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
                  <div>
                    <label htmlFor="smell-type" className="block text-xs text-gray-500 mb-1">
                      Smell Type
                    </label>
                    <select
                      id="smell-type"
                      value={selectedSmellType}
                      onChange={(e) => setSelectedSmellType(e.target.value as CodeSmellType | 'all')}
                      className="w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-primary-300 focus:ring focus:ring-primary-200 focus:ring-opacity-50"
                    >
                      <option value="all">All Types</option>
                      {Object.keys(stats.smellsByType).map((type) => (
                        <option key={type} value={type}>
                          {type.replace(/([A-Z])/g, ' $1').trim()}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="file-name" className="block text-xs text-gray-500 mb-1">
                      File Name
                    </label>
                    <select
                      id="file-name"
                      value={selectedFile}
                      onChange={(e) => setSelectedFile(e.target.value)}
                      className="w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-primary-300 focus:ring focus:ring-primary-200 focus:ring-opacity-50"
                    >
                      <option value="all">All Files</option>
                      {fileNames.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="sort-by" className="block text-xs text-gray-500 mb-1">
                      Sort By
                    </label>
                    <select
                      id="sort-by"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as 'severity' | 'file' | 'type')}
                      className="w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-primary-300 focus:ring focus:ring-primary-200 focus:ring-opacity-50"
                    >
                      <option value="severity">Severity</option>
                      <option value="file">File Name</option>
                      <option value="type">Smell Type</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Results list */}
              {sortedSmells.length > 0 ? (
                <div className="space-y-4">
                  {sortedSmells.map((smell) => (
                    <SmellCard 
                      key={smell.id} 
                      smell={smell} 
                      onViewFullCode={handleViewFullCode}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                  <p className="text-gray-500">No code smells match your current filters</p>
                  {selectedSmellType !== 'all' || selectedFile !== 'all' ? (
                    <button
                      className="mt-2 text-primary-600 hover:text-primary-800 text-sm font-medium"
                      onClick={() => {
                        setSelectedSmellType('all');
                        setSelectedFile('all');
                      }}
                    >
                      Clear filters
                    </button>
                  ) : null}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Code Editor Modal */}
      {selectedSmellForEditor && (
        <CodeEditor
          smell={selectedSmellForEditor}
          fileContent={getFileContent(selectedSmellForEditor.fileName)}
          onClose={handleCloseEditor}
        />
      )}
    </div>
  );
};

export default Dashboard;