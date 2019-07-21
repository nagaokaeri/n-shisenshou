/**
 * 音声を再生する関数たち
 */
var util = require("./util");
var cmn = require("./Common");

function play(scene, assetId) {
  scene.assets[assetId].play().changeVolume(cmn.MASTER_VOLUME * cmn.data.environmentVolume);
}

module.exports.playHaiSelect = function(scene, random) {
  play(scene, util.choice(["se_select1", "se_select2", "se_select3"], random));
};

module.exports.playHaiErase = function(scene, random) {
  play(scene, util.choice(['se_erase1','se_erase2','se_erase3','se_erase4','se_erase5'], random));
};

module.exports.playHaiMiss = function(scene, random) {
  play(scene, util.choice(["se_miss"], random));
};

module.exports.playHaiAllClear = function(scene, random) {
  play(scene, util.choice(["se_allclear"], random));
};
