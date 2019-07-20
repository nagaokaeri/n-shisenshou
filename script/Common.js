// グローバル変数
module.exports.data = {
  environmentVolume: 0.5
};

// 定数
var HAI_SRC_WIDTH = 62;
var HAI_SRC_HEIGHT = 88;
var HAI_DISPLAY_SCALE = 0.6;
var HAI_DISPLAY_WIDTH = Math.floor(HAI_SRC_WIDTH * HAI_DISPLAY_SCALE);
var HAI_DISPLAY_HEIGHT = Math.floor(HAI_SRC_HEIGHT * HAI_DISPLAY_SCALE);
var HAI_DISPLAY_MARGIN_Y = -8; // これ HAI_DISPLAY_SCALE にも依存するから調整
var HAI_DISPLAY_MARGIN_X = 0;
var BOARD_WIDTH = 19; // 牌は17x8に配置 + 周囲1マス
var BOARD_HEIGHT = 10; // 牌は17x8に配置 + 周囲1マス

var SCORE_BOARD_ID = 1; // ボードIDとして固定で1を指定
var MASTER_VOLUME = 0;

module.exports.HAI_SRC_WIDTH = HAI_SRC_WIDTH;
module.exports.HAI_SRC_HEIGHT = HAI_SRC_HEIGHT;
module.exports.HAI_DISPLAY_SCALE = HAI_DISPLAY_SCALE;
module.exports.HAI_DISPLAY_WIDTH = HAI_DISPLAY_WIDTH;
module.exports.HAI_DISPLAY_HEIGHT = HAI_DISPLAY_HEIGHT;
module.exports.HAI_DISPLAY_MARGIN_Y = HAI_DISPLAY_MARGIN_Y;
module.exports.HAI_DISPLAY_MARGIN_X = HAI_DISPLAY_MARGIN_X;
module.exports.BOARD_WIDTH = BOARD_WIDTH;
module.exports.BOARD_HEIGHT = BOARD_HEIGHT;
module.exports.SCORE_BOARD_ID = SCORE_BOARD_ID;
module.exports.MASTER_VOLUME = MASTER_VOLUME;
