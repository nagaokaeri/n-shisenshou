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
  var assetsScene = new g.Scene({
    game: g.game,
    assetIds: [
      "version", "font16_1", "font16_1_glyph",
      "manzu", "pinzu", "souzu", "jihai1", "jihai2",
      "restart","search","ranking","giveup",
      'se_allclear','se_end',
      'se_erase1','se_erase2','se_erase3','se_erase4','se_erase5',
      'se_miss','se_select1','se_select2','se_select3']
  });
  assetsScene.loaded.add(function () {
    g.game.pushScene(MainScene.create(assetsScene));
  });
  g.game.pushScene(assetsScene);
}

module.exports = main;
