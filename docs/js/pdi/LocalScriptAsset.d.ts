declare class LocalScriptAsset extends g.ScriptAsset {
    func: Function;
    constructor(id: string, path: string);
    _load(loader: AssetLoadHandler): void;
    execute(execEnv: ScriptAssetExecuteEnvironment): any;
}
