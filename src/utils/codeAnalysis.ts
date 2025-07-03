import { CodeSmell, CodeSmellType, AnalysisResult, AnalysisStats, CodeMetrics } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { ASTParser } from './astParser';

// Store file contents for later viewing
const fileContentStore = new Map<string, string>();

// Helper function to detect long functions using AST
async function detectLongFunctions(content: string, fileName: string, ast: any): Promise<CodeSmell[]> {
  const smells: CodeSmell[] = [];
  const parser = await ASTParser.getInstance();
  
  ast.walk({
    enter: (node: any) => {
      if (node.type === 'function_definition') {
        const functionName = node.childForFieldName('declarator')?.text || 'anonymous';
        const body = node.childForFieldName('body');
        
        if (body) {
          const lines = body.text.split('\n');
          const startLine = node.startPosition.row + 1;
          
          // Check for all functions longer than 10 lines (your low threshold)
          if (lines.length > 20) {
            const cyclomaticComplexity = parser.calculateCyclomaticComplexity(node);
            const couplingCount = parser.calculateCoupling(node);

            const metrics = {
              cyclomaticComplexity,
              linesOfCode: lines.length,
              methodCount: 1,
              inheritanceDepth: 0,
              couplingCount,
              cohesionScore: 1
            };

            // Determine severity based on your thresholds
            let severity: 'high' | 'medium' | 'low';
            if (lines.length > 40) {
              severity = 'high';
            } else if (lines.length > 30) {
              severity = 'medium';
            } else {
              severity = 'low';
            }

            smells.push({
              id: uuidv4(),
              type: 'LongFunction',
              fileName,
              lineNumber: startLine,
              endLineNumber: startLine + lines.length,
              codeSnippet: node.text.substring(0, 500) + (node.text.length > 500 ? '...' : ''),
              entityName: functionName,
              description: `Function "${functionName}" is too long (${lines.length} lines)`,
              refactoringTip: 'Consider breaking this function into smaller, more focused functions that each handle a specific task.',
              severity,
              metrics
            });
          }
        }
      }
      return true;
    }
  });
  
  return smells;
}

// Helper function to detect large classes using AST
async function detectLargeClasses(content: string, fileName: string, ast: any): Promise<CodeSmell[]> {
  const smells: CodeSmell[] = [];
  const parser = await ASTParser.getInstance();
  
  ast.walk({
    enter: (node: any) => {
      if (node.type === 'class_specifier') {
        const className = node.childForFieldName('name')?.text || 'anonymous';
        const body = node.childForFieldName('body');
        
        if (body) {
          const lines = body.text.split('\n');
          const methodCount = parser.countMethods(node);
          const inheritanceDepth = parser.calculateInheritanceDepth(node);
          
          if (lines.length > 200 || methodCount > 10) {
            const metrics = {
              cyclomaticComplexity: parser.calculateCyclomaticComplexity(node),
              linesOfCode: lines.length,
              methodCount,
              inheritanceDepth,
              couplingCount: parser.calculateCoupling(node),
              cohesionScore: parser.calculateCohesion(node)
            };

            smells.push({
              id: uuidv4(),
              type: 'LargeClass',
              fileName,
              lineNumber: node.startPosition.row + 1,
              codeSnippet: className + ' { ... }',
              entityName: className,
              description: `Class "${className}" is too large (${lines.length} lines, ${methodCount} methods)`,
              refactoringTip: 'Consider using composition or splitting this class into smaller, more focused classes that follow the Single Responsibility Principle.',
              severity: lines.length > 500 || methodCount > 20 ? 'high' : 'medium',
              metrics
            });
          }
        }
      }
      return true;
    }
  });
  
  return smells;
}

function detectLongParameterLists(content: string, fileName: string): CodeSmell[] {
  const smells: CodeSmell[] = [];
  const functionRegex = /(\w+)\s+(\w+)\s*\(([^)]*)\)/g;
  
  let match;
  while ((match = functionRegex.exec(content)) !== null) {
    const [fullMatch, returnType, functionName, params] = match;
    const paramCount = params.split(',').filter(param => param.trim().length > 0).length;
    
    if (paramCount > 4) {
      const lineNumber = content.substring(0, match.index).split('\n').length;
      
      smells.push({
        id: uuidv4(),
        type: 'LongParameterList',
        fileName,
        lineNumber,
        codeSnippet: fullMatch,
        entityName: functionName,
        description: `Function "${functionName}" has too many parameters (${paramCount})`,
        refactoringTip: 'Consider grouping related parameters into objects or using the Parameter Object pattern.',
        severity: paramCount > 7 ? 'high' : paramCount > 5 ? 'medium' : 'low'
      });
    }
  }
  
  return smells;
}

function detectGlobalVariables(content: string, fileName: string): CodeSmell[] {
  const smells: CodeSmell[] = [];
  const globalVarRegex = /^(?:const|static)?\s*\w+\s+(\w+)\s*(?:=\s*[^;]+)?;/gm;
  
  let match;
  while ((match = globalVarRegex.exec(content)) !== null) {
    const beforeMatch = content.substring(0, match.index);
    const braceCount = (beforeMatch.match(/{/g) || []).length - (beforeMatch.match(/}/g) || []).length;
    
    if (braceCount === 0) {
      const [fullMatch, varName] = match;
      const lineNumber = content.substring(0, match.index).split('\n').length;
      
      smells.push({
        id: uuidv4(),
        type: 'GlobalVariables',
        fileName,
        lineNumber,
        codeSnippet: fullMatch,
        entityName: varName,
        description: `Global variable "${varName}" detected`,
        refactoringTip: 'Consider encapsulating global state in classes or using the Singleton pattern if appropriate.',
        severity: 'medium'
      });
    }
  }
  
  return smells;
}

function detectDuplicateCode(content: string, fileName: string): CodeSmell[] {
  const smells: CodeSmell[] = [];
  const functionBodies = new Map<string, {name: string, lineNumber: number, code: string}>();
  const functionRegex = /(\w+)\s+(\w+)\s*\(([^)]*)\)\s*(?:const)?\s*{([^{}]*(?:{[^{}]*(?:{[^{}]*}[^{}]*)*}[^{}]*)*)}/g;
  
  let match;
  while ((match = functionRegex.exec(content)) !== null) {
    const [fullMatch, returnType, functionName, params, body] = match;
    const normalizedBody = body.replace(/\s+/g, ' ').trim();
    
    if (normalizedBody.length > 100) {
      const lineNumber = content.substring(0, match.index).split('\n').length;
      
      if (functionBodies.has(normalizedBody)) {
        const original = functionBodies.get(normalizedBody)!;
        smells.push({
          id: uuidv4(),
          type: 'DuplicateCode',
          fileName,
          lineNumber,
          codeSnippet: functionName + '(...) { ... }',
          entityName: functionName,
          description: `Function "${functionName}" contains code duplicated from "${original.name}" (line ${original.lineNumber})`,
          refactoringTip: 'Extract the duplicated code into a shared function that can be called from both places.',
          severity: 'high'
        });
      } else {
        functionBodies.set(normalizedBody, {
          name: functionName,
          lineNumber,
          code: normalizedBody
        });
      }
    }
  }
  
  return smells;
}

function detectPrimitiveObsession(content: string, fileName: string): CodeSmell[] {
  const smells: CodeSmell[] = [];
  const methodRegex = /(\w+)\s+(\w+)\s*\(([^)]*)\)/g;
  
  let match;
  while ((match = methodRegex.exec(content)) !== null) {
    const [fullMatch, returnType, methodName, params] = match;
    const paramList = params.split(',').map(p => p.trim());
    
    const suspiciousParams = paramList.filter(param => {
      const paramParts = param.split(' ');
      const paramName = paramParts[paramParts.length - 1].replace('*', '').replace('&', '');
      
      return /(?:id|code|name|address|phone|email|date|time)$/.test(paramName) &&
             /(int|float|double|char|bool|string)/.test(param);
    });
    
    if (suspiciousParams.length >= 2) {
      const lineNumber = content.substring(0, match.index).split('\n').length;
      
      smells.push({
        id: uuidv4(),
        type: 'PrimitiveObsession',
        fileName,
        lineNumber,
        codeSnippet: fullMatch,
        entityName: methodName,
        description: `Function "${methodName}" uses multiple primitive types that could be an object`,
        refactoringTip: 'Consider creating a class to encapsulate related primitive values.',
        severity: 'medium'
      });
    }
  }
  
  return smells;
}

function detectInappropriateIntimacy(content: string, fileName: string): CodeSmell[] {
  const smells: CodeSmell[] = [];
  const classRegex = /class\s+(\w+)(?:\s*:\s*(?:public|protected|private)\s+\w+)?\s*{([^{}]*(?:{[^{}]*(?:{[^{}]*}[^{}]*)*}[^{}]*)*)}/g;
  
  let match;
  while ((match = classRegex.exec(content)) !== null) {
    const [fullMatch, className, body] = match;
    const classReferences = new Map<string, number>();
    const memberAccessRegex = /(\w+)\.(\w+)/g;
    const pointerAccessRegex = /(\w+)->(\w+)/g;
    
    let accessMatch;
    while ((accessMatch = memberAccessRegex.exec(body)) !== null) {
      const [, objName, memberName] = accessMatch;
      if (objName !== 'this' && objName !== 'std' && objName !== 'string') {
        classReferences.set(objName, (classReferences.get(objName) || 0) + 1);
      }
    }
    
    while ((accessMatch = pointerAccessRegex.exec(body)) !== null) {
      const [, objName, memberName] = accessMatch;
      if (objName !== 'this' && objName !== 'std' && objName !== 'string') {
        classReferences.set(objName, (classReferences.get(objName) || 0) + 1);
      }
    }
    
    for (const [referencedClass, count] of classReferences.entries()) {
      if (count > 5) {
        const lineNumber = content.substring(0, match.index).split('\n').length;
        
        smells.push({
          id: uuidv4(),
          type: 'InappropriateIntimacy',
          fileName,
          lineNumber,
          codeSnippet: `class ${className} { ... }`,
          entityName: className,
          description: `Class "${className}" has inappropriate intimacy with "${referencedClass}" (${count} accesses)`,
          refactoringTip: 'Consider moving some functionality or creating an intermediary class to reduce coupling.',
          severity: count > 10 ? 'high' : 'medium'
        });
      }
    }
  }
  
  return smells;
}

function detectComplexConditions(content: string, fileName: string): CodeSmell[] {
  const smells: CodeSmell[] = [];
  const ifRegex = /if\s*\((.*?)\)/g;
  
  let match;
  while ((match = ifRegex.exec(content)) !== null) {
    const [fullMatch, condition] = match;
    
    // Count logical operators
    const operatorCount = (condition.match(/&&|\|\||!|==|!=|>=|<=|>|</g) || []).length;
    const lineNumber = content.substring(0, match.index).split('\n').length;
    
    if (operatorCount > 3) {
      smells.push({
        id: uuidv4(),
        type: 'ComplexCondition',
        fileName,
        lineNumber,
        codeSnippet: fullMatch,
        entityName: 'condition',
        description: `Complex condition with ${operatorCount} operators`,
        refactoringTip: 'Break the condition into smaller, well-named boolean variables or methods.',
        severity: operatorCount > 5 ? 'high' : 'medium'
      });
    }
  }
  
  return smells;
}

function detectDeepNesting(content: string, fileName: string): CodeSmell[] {
  const smells: CodeSmell[] = [];
  const lines = content.split('\n');
  let currentNestingLevel = 0;
  let maxNestingLevel = 0;
  let nestingStartLine = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Count opening braces for nesting level
    if (line.includes('{')) {
      currentNestingLevel++;
      if (currentNestingLevel > maxNestingLevel) {
        maxNestingLevel = currentNestingLevel;
        nestingStartLine = i + 1;
      }
    }
    
    // Decrease nesting level on closing brace
    if (line.includes('}')) {
      if (currentNestingLevel === maxNestingLevel && maxNestingLevel > 3) {
        smells.push({
          id: uuidv4(),
          type: 'DeepNesting',
          fileName,
          lineNumber: nestingStartLine,
          codeSnippet: 'Nested block { ... }',
          entityName: 'nested_block',
          description: `Deep nesting detected (${maxNestingLevel} levels)`,
          refactoringTip: 'Consider using early returns, guard clauses, or extracting nested logic into separate methods.',
          severity: maxNestingLevel > 4 ? 'high' : 'medium'
        });
      }
      currentNestingLevel--;
      if (currentNestingLevel === 0) {
        maxNestingLevel = 0;
      }
    }
  }
  
  return smells;
}

export async function analyzeCode(content: string, fileName: string): Promise<AnalysisResult> {
  // Store the file content for later viewing in the code editor
  fileContentStore.set(fileName, content);
  
  const parser = await ASTParser.getInstance();
  const ast = parser.parseCode(content);
  const metrics = parser.calculateMetrics(content);
  
  const smells: CodeSmell[] = [
    ...await detectLongFunctions(content, fileName, ast.rootNode),
    ...await detectLargeClasses(content, fileName, ast.rootNode),
    ...detectLongParameterLists(content, fileName),
    ...detectGlobalVariables(content, fileName),
    ...detectDuplicateCode(content, fileName),
    ...detectPrimitiveObsession(content, fileName),
    ...detectInappropriateIntimacy(content, fileName),
    ...detectComplexConditions(content, fileName),
    ...detectDeepNesting(content, fileName)
  ];
  
  return {
    fileName,
    fileSize: content.length,
    smells,
    totalSmells: smells.length,
    timestamp: Date.now(),
    metrics
  };
}

export function getFileContent(fileName: string): string {
  return fileContentStore.get(fileName) || '// File content not available';
}

export function calculateStats(results: AnalysisResult[]): AnalysisStats {
  const totalFiles = results.length;
  const totalSmells = results.reduce((sum, result) => sum + result.totalSmells, 0);
  
  const smellsByType: Record<CodeSmellType, number> = {
    LongFunction: 0,
    LargeClass: 0,
    DuplicateCode: 0,
    PrimitiveObsession: 0,
    LongParameterList: 0,
    InappropriateIntimacy: 0,
    GlobalVariables: 0,
    ComplexCondition: 0,
    DeepNesting: 0
  };
  
  const smellsByFile: Record<string, number> = {};
  
  results.forEach(result => {
    smellsByFile[result.fileName] = result.totalSmells;
    
    result.smells.forEach(smell => {
      smellsByType[smell.type]++;
    });
  });
  
  const worstFiles = Object.entries(smellsByFile)
    .map(([fileName, smellCount]) => ({ fileName, smellCount }))
    .sort((a, b) => b.smellCount - a.smellCount)
    .slice(0, 5);
  
  // Calculate average metrics
  const avgMetrics = results.reduce((acc, result) => {
    acc.cyclomaticComplexity += result.metrics.cyclomaticComplexity;
    acc.linesOfCode += result.metrics.linesOfCode;
    acc.methodCount += result.metrics.methodCount;
    acc.inheritanceDepth += result.metrics.inheritanceDepth;
    acc.couplingCount += result.metrics.couplingCount;
    acc.cohesionScore += result.metrics.cohesionScore;
    return acc;
  }, {
    cyclomaticComplexity: 0,
    linesOfCode: 0,
    methodCount: 0,
    inheritanceDepth: 0,
    couplingCount: 0,
    cohesionScore: 0
  });

  Object.keys(avgMetrics).forEach(key => {
    avgMetrics[key] = avgMetrics[key] / totalFiles;
  });
  
  return {
    totalFiles,
    totalSmells,
    smellsByType,
    smellsByFile,
    worstFiles,
    averageMetrics: avgMetrics as CodeMetrics
  };
}

export function getRefactoringTip(smellType: CodeSmellType): string {
  const tips: Record<CodeSmellType, string> = {
    LongFunction: 'Break the function into smaller, more focused functions that each handle a specific task.',
    LargeClass: 'Apply the Single Responsibility Principle by splitting the class into smaller classes, each with a clear purpose.',
    DuplicateCode: 'Extract the duplicated code into a shared function or utility class that can be reused.',
    PrimitiveObsession: 'Create small, specific objects to hold related data instead of using primitive types.',
    LongParameterList: 'Group related parameters into parameter objects or consider using the Builder pattern for complex object creation.',
    InappropriateIntimacy: 'Reduce dependencies between classes by moving methods to the class that contains the data they operate on.',
    GlobalVariables: 'Encapsulate global variables in classes or use dependency injection to pass required data explicitly.',
    ComplexCondition: 'Break complex conditions into smaller, well-named boolean variables or methods.',
    DeepNesting: 'Use early returns, guard clauses, or extract nested logic into separate methods.'
  };
  
  return tips[smellType] || 'Review the code and apply appropriate refactoring techniques.';
}

export function getSmellDescription(smellType: CodeSmellType): string {
  const descriptions: Record<CodeSmellType, string> = {
    LongFunction: 'Functions that are too long are difficult to understand, test, and maintain.',
    LargeClass: 'Classes that try to do too much violate the Single Responsibility Principle and become hard to maintain.',
    DuplicateCode: 'Copy-pasted code creates maintenance problems when one instance is updated but others are forgotten.',
    PrimitiveObsession: 'Using primitive types instead of small objects for simple tasks leads to repeated code and missed abstractions.',
    LongParameterList: 'Functions with many parameters are difficult to call and understand, and often indicate missing abstractions.',
    InappropriateIntimacy: 'Classes that are too tightly coupled know too much about each other\'s internal details.',
    GlobalVariables: 'Global state makes code harder to understand and test, and creates unexpected dependencies.',
    ComplexCondition: 'Complex conditional expressions are hard to understand and maintain.',
    DeepNesting: 'Deeply nested code is difficult to follow and understand.'
  };
  
  return descriptions[smellType] || 'A pattern in code that suggests a deeper problem.';
}