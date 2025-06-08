declare class LocalTextAssetV3 {
    type: string;
    id: string;
    path: string;
    originalPath: string;
    onDestroyed: Trigger<Asset>;
    data: string;
    constructor(id: string, path: string);
    destroy(): void;
    destroyed(): boolean;
    inUse(): boolean;
    _load(loader: AssetLoadHandler): void;
    /**
     * @private
     */
    _assetPathFilter(path: string): string;
}
