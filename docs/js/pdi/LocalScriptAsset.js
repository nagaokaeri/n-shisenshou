// eslint-disable-next-line @typescript-eslint/no-unused-vars
class LocalScriptAsset extends g.ScriptAsset {
    constructor(id, path) {
        super(id, path);
        this.func = window.gLocalAssetContainer[id]; // gLocalScriptContainer は index.ect 上のscriptタグ内で宣言されている
    }
    _load(loader) {
        if (this.func !== undefined) {
            setTimeout(() => {
                loader._onAssetLoad(this);
            }, 0);
        }
        else {
            setTimeout(() => {
                loader._onAssetError(this, g.ExceptionFactory.createAssetLoadError("can not load script asset"));
            }, 0);
        }
    }
    execute(execEnv) {
        this.func(execEnv);
        return execEnv.module.exports;
    }
}
