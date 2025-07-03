export type CodeSmellType = 
  | 'LongFunction'
  | 'LargeClass'
  | 'DuplicateCode'
  | 'PrimitiveObsession'
  | 'LongParameterList'
  | 'InappropriateIntimacy'
  | 'GlobalVariables'
  | 'ComplexCondition'
  | 'DeepNesting';

export interface CodeMetrics {
  cyclomaticComplexity: number;
  linesOfCode: number;
  methodCount: number;
  inheritanceDepth: number;
  couplingCount: number;
  cohesionScore: number;
}

export interface CodeSmell {
  id: string;
  type: CodeSmellType;
  fileName: string;
  lineNumber: number;
  endLineNumber?: number;
  codeSnippet: string;
  entityName: string;
  description: string;
  refactoringTip: string;
  severity: 'low' | 'medium' | 'high';
  metrics?: CodeMetrics;
  astNode?: any; // Tree-sitter AST node
}

export interface AnalysisResult {
  fileName: string;
  fileSize: number;
  smells: CodeSmell[];
  totalSmells: number;
  timestamp: number;
  metrics: CodeMetrics;
}

export interface AnalysisStats {
  totalFiles: number;
  totalSmells: number;
  smellsByType: Record<CodeSmellType, number>;
  smellsByFile: Record<string, number>;
  worstFiles: { fileName: string; smellCount: number }[];
  averageMetrics: CodeMetrics;
}