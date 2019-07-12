/**
 * 音声を再生する関数たち
 */
var util = require("./util");
var cmn = require("./Common");

function play(scene, assetId) {
  scene.assets[assetId].play().changeVolume(cmn.MASTER_VOLUME * cmn.data.environmentVolume);
}

module.exports.playHaiSelect = function(scene, random) {
  play(scene, util.choice(["ne_kore1", "ne_kore2", "ne_kore3", "ne_koredesuwa1", "ne_tanomu1",
    "ne_ai1","ne_eseitekini","ne_good","ne_honmani","ne_horaa1","ne_horaa2","ne_imanomita",
    "ne_kitayo","ne_kitayo2","ne_korekore","ne_korezettaikore","ne_maashouganai","ne_majide2",
    "ne_minna","ne_nigasukayo","ne_okkei","ne_onashasu","ne_oredato","ne_oseisida","ne_tanomuu",
    "ne_tinko","ne_w","ne_zettaituyoi"], random));
};

module.exports.playHaiSelectZ4 = function(scene, random) {
  play(scene, util.choice(["ne_kita1"], random));
};

module.exports.playHaiErase = function(scene, random) {
  play(scene, util.choice(["ne_eeyan", "ne_honmanisore1", "ne_majide1",
    "ne_oosugoi1", "ne_oreka1", "ne_sugo1", "ne_tuyo1", "ne_usi1", "ne_yatta1"], random));
};

module.exports.playHaiShuffle = function(scene, random) {
  play(scene, util.choice(["ne_nerugia"], random));
};

module.exports.playHaiMiss = function(scene, random) {
  play(scene, util.choice(["ne_aa1", "ne_akan1", "ne_akan2", "ne_akan3", "ne_akan4",
    "ne_akan5", "ne_akante", "ne_e", "ne_ee1", "ne_ha1", "ne_tyotyotyotyo", "ne_uso1",
    "ne_uso3", "ne_usouso1", "ne_uwa1", "ne_yurusanzo1"], random));
};

module.exports.playHaiAllClear = function(scene, random) {
  play(scene, util.choice(["ne_itii1","ne_doremi","ne_doya1","ne_hayakumo","ne_kitigai",
    "ne_reberuga","ne_uieeeee","ne_usoyaba"], random));
};

module.exports.playRestart1 = function(scene, random) {
  play(scene, util.choice(["ne_yameruka"], random));
};

module.exports.playRestart2 = function(scene, random) {
  play(scene, util.choice(["ne_akui1","ne_atamaokasinarudekonoanime","ne_majikayamaikuka",
    "ne_matometengni","ne_omaeyurusanzo","ne_ribenjisiteiku","ne_subuta","ne_touzen1",
    "ne_wantusuri","ne_zenzen"], random));
};
