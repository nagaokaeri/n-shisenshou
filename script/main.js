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

  g.game.pushScene(MainScene.create());
}

module.exports = main;
