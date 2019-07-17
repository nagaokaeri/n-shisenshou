var MainScene = require("./MainScene");
var cmn = require("./Common");

function main() {

  // 音量バーを表示
  if (typeof window !== "undefined" && window.RPGAtsumaru) {
    cmn.data.environmentVolume = window.RPGAtsumaru.volume.getCurrentValue();
    window.RPGAtsumaru.volume.changed.subscribe(function(volume){
      cmn.data.environmentVolume = volume;
    });
  }

  // リスタートで音声ファイルを再読み込みしないために階層をわける
  var audioScene = new g.Scene({
    game: g.game,
    assetIds: [
      "ne_aa1","ne_akan1","ne_akan2","ne_akan3","ne_akan4","ne_akan5","ne_akante","ne_e","ne_ee1",
      "ne_eeyan","ne_ha1","ne_honmanisore1","ne_kita1","ne_kore1","ne_kore2","ne_kore3","ne_koredesuwa1",
      "ne_majide1","ne_nerugia","ne_oosugoi1","ne_oreka1","ne_sugo1","ne_tanomu1","ne_tuyo1",
      "ne_tyotyotyotyo","ne_usi1","ne_uso1","ne_uso3","ne_usouso1","ne_usousouso1","ne_uwa1",
      "ne_yatta1","ne_yurusanzo1","ne_ai1","ne_eseitekini","ne_good","ne_honmani","ne_horaa1",
      "ne_horaa2","ne_imanomita","ne_kitayo","ne_kitayo2","ne_korekore","ne_korezettaikore",
      "ne_maashouganai","ne_majide2","ne_minna","ne_nigasukayo","ne_okkei","ne_onashasu",
      "ne_oredato","ne_oseisida","ne_tanomuu","ne_tinko","ne_w","ne_zettaituyoi","ne_itii1",
      "ne_doremi","ne_doya1","ne_hayakumo","ne_kitigai","ne_reberuga","ne_uieeeee","ne_usoyaba",
      "ne_yameruka","ne_akui1","ne_atamaokasinarudekonoanime","ne_majikayamaikuka",
      "ne_matometengni","ne_omaeyurusanzo","ne_ribenjisiteiku","ne_subuta","ne_touzen1",
      "ne_wantusuri","ne_zenzen"]
  });
  audioScene.loaded.add(function () {
    g.game.pushScene(MainScene.create(audioScene));
  });
  g.game.pushScene(audioScene);
}

module.exports = main;
