// eslint-disable-next-line @typescript-eslint/no-unused-vars
class LocalTextAsset extends g.TextAsset {
    constructor(id, path) {
        super(id, path);
        this.data = decodeURIComponent(window.gLocalAssetContainer[id]);
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
}
