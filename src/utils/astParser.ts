import Parser from 'web-tree-sitter';

export class ASTParser {
  private parser: Parser | null = null;
  private static instance: ASTParser;
  private initialized = false;

  private constructor() {}

  public static async getInstance(): Promise<ASTParser> {
    if (!ASTParser.instance) {
      ASTParser.instance = new ASTParser();
    }
    if (!ASTParser.instance.initialized) {
      await ASTParser.instance.initialize();
    }
    return ASTParser.instance;
  }

  private async initialize(): Promise<void> {
    try {
      await Parser.init({
        locateFile(scriptName: string, scriptDirectory: string) {
          if (scriptName === 'tree-sitter.wasm') {
            return '/wasm/tree-sitter.wasm';
          }
          return scriptDirectory + scriptName;
        }
      });
      
      // Create parser instance only after initialization
      this.parser = new Parser();
      
      // Load the WASM file from public/wasm directory
      const Lang = await Parser.Language.load('/wasm/tree-sitter-cpp.wasm');
      await this.parser.setLanguage(Lang);
      
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize Tree-sitter:', error);
      throw new Error('Failed to initialize code parser. Please ensure all required files are present.');
    }
  }

  parseCode(code: string): Parser.Tree {
    if (!this.initialized || !this.parser) {
      throw new Error('ASTParser not initialized. Call getInstance() first.');
    }
    return this.parser.parse(code);
  }

  calculateCyclomaticComplexity(node: Parser.SyntaxNode): number {
    let complexity = 1; // Base complexity

    const incrementingNodes = [
      'if_statement',
      'while_statement',
      'for_statement',
      'case_statement',
      '&&',
      '||',
      'catch_clause'
    ];

    // Traverse the AST
    const cursor = node.walk();
    do {
      if (incrementingNodes.includes(cursor.nodeType)) {
        complexity++;
      }
    } while(cursor.gotoNextSibling() || cursor.gotoParent() && cursor.gotoNextSibling());

    return complexity;
  }

  countMethods(node: Parser.SyntaxNode): number {
    let methodCount = 0;
    const cursor = node.walk();

    do {
      if (cursor.nodeType === 'function_definition') {
        methodCount++;
      }
    } while(cursor.gotoNextSibling() || cursor.gotoParent() && cursor.gotoNextSibling());

    return methodCount;
  }

  calculateInheritanceDepth(node: Parser.SyntaxNode): number {
    let maxDepth = 0;
    const cursor = node.walk();

    do {
      if (cursor.nodeType === 'class_specifier') {
        let depth = 0;
        let baseClass = cursor.currentNode().childForFieldName('base_class');
        
        while (baseClass) {
          depth++;
          baseClass = baseClass.childForFieldName('base_class');
        }
        
        maxDepth = Math.max(maxDepth, depth);
      }
    } while(cursor.gotoNextSibling() || cursor.gotoParent() && cursor.gotoNextSibling());

    return maxDepth;
  }

  calculateCoupling(node: Parser.SyntaxNode): number {
    const dependencies = new Set<string>();
    const cursor = node.walk();

    do {
      if (['qualified_identifier', 'field_expression', 'call_expression'].includes(cursor.nodeType)) {
        const text = cursor.currentNode().text;
        if (!text.startsWith('std::')) { // Exclude standard library
          dependencies.add(text.split('::')[0]);
        }
      }
    } while(cursor.gotoNextSibling() || cursor.gotoParent() && cursor.gotoNextSibling());

    return dependencies.size;
  }

  calculateCohesion(node: Parser.SyntaxNode): number {
    const methods: string[] = [];
    const fieldAccesses: Map<string, Set<string>> = new Map();
    const cursor = node.walk();

    // First pass: collect methods and field accesses
    do {
      if (cursor.nodeType === 'function_definition') {
        const methodName = cursor.currentNode().childForFieldName('declarator')?.text || '';
        methods.push(methodName);
        fieldAccesses.set(methodName, new Set());
      } else if (cursor.nodeType === 'field_expression') {
        const fieldName = cursor.currentNode().childForFieldName('field')?.text || '';
        const currentMethod = methods[methods.length - 1];
        if (currentMethod && fieldName) {
          fieldAccesses.get(currentMethod)?.add(fieldName);
        }
      }
    } while(cursor.gotoNextSibling() || cursor.gotoParent() && cursor.gotoNextSibling());

    // Calculate LCOM (Lack of Cohesion of Methods)
    let methodPairs = 0;
    let connectedPairs = 0;

    for (let i = 0; i < methods.length; i++) {
      for (let j = i + 1; j < methods.length; j++) {
        methodPairs++;
        const fields1 = fieldAccesses.get(methods[i]) || new Set();
        const fields2 = fieldAccesses.get(methods[j]) || new Set();
        
        // Check if methods share any fields
        const intersection = new Set([...fields1].filter(x => fields2.has(x)));
        if (intersection.size > 0) {
          connectedPairs++;
        }
      }
    }

    // Convert LCOM to cohesion score (0 to 1, higher is better)
    return methodPairs > 0 ? connectedPairs / methodPairs : 1;
  }

  calculateMetrics(code: string): CodeMetrics {
    const tree = this.parseCode(code);
    const rootNode = tree.rootNode;

    return {
      cyclomaticComplexity: this.calculateCyclomaticComplexity(rootNode),
      linesOfCode: code.split('\n').length,
      methodCount: this.countMethods(rootNode),
      inheritanceDepth: this.calculateInheritanceDepth(rootNode),
      couplingCount: this.calculateCoupling(rootNode),
      cohesionScore: this.calculateCohesion(rootNode)
    };
  }
}