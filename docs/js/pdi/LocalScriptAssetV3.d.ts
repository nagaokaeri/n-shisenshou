declare class LocalScriptAssetV3 {
    type: string;
    script: string;
    id: string;
    path: string;
    exports: string[];
    originalPath: string;
    onDestroyed: Trigger<Asset>;
    func: Function;
    constructor(id: string, path: string, exports?: string[]);
    destroy(): void;
    destroyed(): boolean;
    inUse(): boolean;
    execute(execEnv: any): any;
    _load(loader: AssetLoadHandler): void;
    /**
     * @private
     */
    _assetPathFilter(path: string): string;
}
