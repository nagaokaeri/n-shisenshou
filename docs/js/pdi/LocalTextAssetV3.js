// 本来であればv3系のg.TextAssetをimplementsすべきだが、ビルド時に使用しているakashic-engineはv2系なので一からクラス定義している
// eslint-disable-next-line @typescript-eslint/no-unused-vars
class LocalTextAssetV3 {
    constructor(id, path) {
        this.type = "text";
        this.id = id;
        this.originalPath = path;
        this.path = this._assetPathFilter(path);
        this.onDestroyed = new g.Trigger();
        this.data = decodeURIComponent(window.gLocalAssetContainer[id]);
    }
    destroy() {
        this.onDestroyed.fire(this);
        this.id = undefined;
        this.originalPath = undefined;
        this.path = undefined;
        this.onDestroyed.destroy();
        this.onDestroyed = undefined;
    }
    destroyed() {
        return this.id === undefined;
    }
    inUse() {
        return false;
    }
    _load(loader) {
        if (this.data !== undefined) {
            setTimeout(() => {
                loader._onAssetLoad(this);
            }, 0);
        }
        else {
            setTimeout(() => {
                loader._onAssetError(this, g.ExceptionFactory.createAssetLoadError("can not load text asset"));
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
