export interface AqlFunctionMetadata {
    name: string;
    arguments: string;
    implementations: string[];
    deterministic: boolean;
    cacheable: boolean;
    canRunOnDBServerCluster: boolean;
    canRunOnDBServerOneShard: boolean;
    canReadDocuments: boolean;
    canUseInAnalyzer: boolean;
    canRunOnDBServer: boolean;
    stub: boolean;
}
export interface FunctionSignature {
    name: string;
    parameters: ParameterInfo[];
    minArgs: number;
    maxArgs: number;
    variadic: boolean;
    category: string;
    description: string;
    returnType: string;
}
export interface ParameterInfo {
    name: string;
    type: string;
    required: boolean;
    description: string;
}
export declare class FunctionDocumentation {
    private functions;
    constructor();
    private loadFunctions;
    /**
     * Get function signature by name
     */
    getFunction(name: string): FunctionSignature | undefined;
    /**
     * Get all function names
     */
    getAllFunctionNames(): string[];
    /**
     * Get all functions
     */
    getAllFunctions(): FunctionSignature[];
    /**
     * Get functions by category
     */
    getFunctionsByCategory(category: string): FunctionSignature[];
    /**
     * Get all categories
     */
    getCategories(): string[];
    /**
     * Generate signature string for display
     */
    getSignatureString(name: string): string;
    /**
     * Generate markdown documentation for a function
     */
    getMarkdownDoc(name: string): string;
}
export declare const functionDocs: FunctionDocumentation;
