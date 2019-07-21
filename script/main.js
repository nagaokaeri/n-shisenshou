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
      "font16_1", "font16_1_glyph",
      "manzu", "pinzu", "souzu", "jihai1", "jihai2",
      'se_allclear','se_erase1','se_erase2','se_erase3','se_erase4','se_erase5','se_miss','se_select1','se_select2','se_select3',
    ]
  });

  // ゲームスコアの初期化
  g.game.vars.gameState = { score: 0 };
  // プレイヤーごとの消した回数
  cmn.data.playerScore = {};
  // 制限時間
  cmn.data.gameTimeLimit = 800; // デフォルトの制限時間80秒
  cmn.data.frameCount = 0; // 経過時間をフレーム単位で記録

  assetsScene.message.add(function(msg) {
    if (msg.data &&
        msg.data.type === "start" &&
        msg.data.parameters &&
        msg.data.parameters.totalTimeLimit) {
      // 制限時間を通知するイベントを受信した時点で初期化する
      // ゲームのローディング時間を考慮し、7秒短くする
      cmn.data.gameTimeLimit = msg.data.parameters.totalTimeLimit - 7;
    }
  });

  assetsScene.loaded.add(function () {
    g.game.pushScene(MainScene.create(assetsScene));
  });
  g.game.pushScene(assetsScene);
}

module.exports = main;
