"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameExternalStorage = void 0;
const types = require("./content-storage-types/index.js");
class GameExternalStorage {
    constructor({ kvs: storage, playId, gameCode }) {
        this.apiVersion = 1; // 現状固定
        this.dataTable = Object.create(null);
        this.kvs = storage;
        this.playId = playId;
        this.gameCode = gameCode;
    }
    read(req, callback) {
        try {
            const result = this._readSync(req);
            setImmediate(() => callback(null, result));
        }
        catch (e) {
            setImmediate(() => callback(e, null));
        }
    }
    write(req, callback) {
        try {
            const result = this._writeSync(req);
            setImmediate(() => callback(null, result));
        }
        catch (e) {
            setImmediate(() => callback(e, null));
        }
    }
    _readSync(req) {
        const { gameCode, playScope, key, playerIds, type } = req;
        const limit = req.limit ?? types.DEFAULT_STORAGE_READ_REQUEST_LIMIT;
        const offset = req.offset ?? types.DEFAULT_STORAGE_READ_REQUEST_OFFSET;
        const order = req.order ?? "unspecified";
        if (playerIds && order !== "unspecified")
            throw new Error("could not be specified both playerIds and specified order");
        if (!playerIds && order === "unspecified")
            throw new Error("neither playerIds nor specified order given");
        if (order !== "unspecified" && (typeof limit !== "number" || limit < 0))
            throw new Error("invalid limit");
        if ((order === "asc" || order === "desc") && (type !== "number" && type !== "ordered-number"))
            throw new Error("asc/desc can be specified only for number");
        if (playerIds && type === "ordered-number")
            throw new Error(`could not read value for key ${req.key} specified playerIds and ordered-number`);
        const dataTable = this.getDataTableFromKVS(playScope, req) ?? Object.create(null);
        if (playerIds) {
            const data = playerIds.map(playerId => {
                const value = playerId in dataTable ? dataTable[playerId] : null;
                return { playerId, value };
            });
            return { gameCode, playScope, key, data, type };
        }
        const data = Object.keys(dataTable).map(playerId => ({ playerId, value: dataTable[playerId] }));
        // asc/desc は JSON 上では効率的に実装できないので、全件取得したものをソートして limit 件切り出す。
        // 最適化された実装は declare() 時点で type: "number" を踏まえた適切なデータ構造を採用できるはず。
        switch (order) {
            case "asc":
                // order が asc/desc なら spec.type が number なのは上で確認済み、
                // かつ spec.type と一致しない値は書き込まないのを write() が保証しているので、常に `as number` できる。
                // (あるいは、TypeScript にこの invariant を推論させられないので明示的なキャストが必要)
                data.sort((a, b) => a.value - b.value);
                return { gameCode, playScope, key, type, data: data.slice(offset, offset + limit) };
            case "desc":
                data.sort((a, b) => b.value - a.value);
                return { gameCode, playScope, key, type, data: data.slice(offset, offset + limit) };
            default:
                return { gameCode, playScope, key, type, data: data.slice(offset, offset + limit) };
        }
    }
    _writeSync(req) {
        const { gameCode, key, playScope, data, type } = req;
        const writeType = req.writeType ?? "overwrite";
        const min = req.min ?? types.STORAGE_MIN_NUMBER;
        const max = req.max ?? types.STORAGE_MAX_NUMBER;
        if (type !== "number" && type !== "ordered-number") {
            if (writeType === "incr" || writeType === "decr")
                throw new Error("incr/decr cannot be used for type " + type);
        }
        const dataTable = this.getDataTableFromKVS(playScope, req) ?? Object.create(null);
        const failed = data.map(({ playerId, value }) => {
            if (typeof value !== "number") {
                if (value != null && type !== "string" && type !== "general") {
                    throw new Error(`type mismatch: the value ${value} for player ${playerId} does not match the type ${type}`);
                }
                dataTable[playerId] = value;
                return null;
            }
            if (type !== "number" && type !== "ordered-number") {
                throw new Error(`type mismatch: the value ${value} for player ${playerId} does not match the type ${type}`);
            }
            const needsCalc = (writeType === "incr" || writeType === "decr");
            let current = null;
            if (needsCalc) {
                if (playerId in dataTable) {
                    current = dataTable[playerId];
                }
                else if (typeof current !== "number") {
                    throw new Error(`no value for key ${key} of player ${playerId}`);
                }
            }
            const calculated = 
            // current が number でなければ incr/decr でないことは上でチェック済みなのでキャストできる
            (writeType === "incr") ? current + value :
                (writeType === "decr") ? current - value :
                    value;
            const clamped = Math.min(max, Math.max(min, calculated));
            const diff = calculated - clamped;
            if (diff < 0) {
                return {
                    gameCode,
                    playScope,
                    key,
                    playerId,
                    type,
                    failureType: "subceedMin",
                    message: "subceedMin (message T.B.D)"
                };
            }
            else if (diff > 0) {
                return {
                    gameCode,
                    playScope,
                    key,
                    playerId,
                    type,
                    failureType: "exceedMax",
                    message: "exceedMax (message T.B.D)"
                };
            }
            else {
                dataTable[playerId] = calculated;
                return null;
            }
        }).filter((failed) => failed != null);
        this.setDataTableToKVS(playScope, req, dataTable);
        return failed.length ? { failed } : null;
    }
    getDataTableFromKVS(playScope, loc) {
        const str = this.kvs.getItem(GameExternalStorage.kvsPrefix +
            this._resolvePlayId(playScope) +
            "__" +
            this._locatorIdOf(loc) +
            "__");
        try {
            const data = JSON.parse(str);
            return data;
        }
        catch (_e) {
            //
        }
        return null;
    }
    setDataTableToKVS(playScope, loc, data) {
        this.kvs.setItem(GameExternalStorage.kvsPrefix +
            this._resolvePlayId(playScope) +
            "__" +
            this._locatorIdOf(loc) +
            "__", JSON.stringify(data));
    }
    _resolvePlayId(playScope) {
        switch (playScope) {
            case "play":
                return this.playId;
            case "rootPlay":
                return "$ROOTPLAY";
            case "global":
            default:
                return "$GLOBAL";
        }
    }
    _locatorIdOf(loc) {
        return this.gameCode + "___" + loc.key;
    }
}
exports.GameExternalStorage = GameExternalStorage;
GameExternalStorage.kvsPrefix = "__akashic_game_storage__";
