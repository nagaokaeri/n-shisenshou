// 本来であればv3系のg.ScriptAssetをimplementsすべきだが、ビルド時に使用しているakashic-engineはv2系なので一からクラス定義している
// eslint-disable-next-line @typescript-eslint/no-unused-vars
class LocalScriptAssetV3 {
    constructor(id, path, exports = []) {
        this.type = "script";
        this.id = id;
        this.originalPath = path;
        this.exports = exports;
        this.path = this._assetPathFilter(path);
        this.onDestroyed = new g.Trigger();
        this.func = window.gLocalAssetContainer[id]; // gLocalScriptContainer は index.ect 上のscriptタグ内で宣言されている
    }
    destroy() {
        this.onDestroyed.fire(this);
        this.id = undefined;
        this.originalPath = undefined;
        this.path = undefined;
        this.exports = undefined;
        this.onDestroyed.destroy();
        this.onDestroyed = undefined;
    }
    destroyed() {
        return this.id === undefined;
    }
    inUse() {
        return false;
    }
    // 引数の型はg.ScriptAssetRuntimeValueだが、v2系には無いものなのでanyを指定している
    execute(execEnv) {
        this.func(execEnv);
        return execEnv.module.exports;
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
    /**
     * @private
     */
    _assetPathFilter(path) {
        // 拡張子の補完・読み替えが必要なassetはこれをオーバーライドすればよい。(対応形式が限定されるaudioなどの場合)
        return path;
    }
}
