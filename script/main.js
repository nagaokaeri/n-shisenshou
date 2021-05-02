var TitleScene = require("./TitleScene");
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
      "mplus1c_regular_jis1", "mplus1c_regular_jis1_glyph",
      "manzu", "pinzu", "souzu", "jihai1", "jihai2",
      'se_allclear','se_erase1','se_erase2','se_erase3','se_erase4','se_erase5','se_miss','se_select1','se_select2','se_select3',"se_end"
    ]
  });

  // ゲームスコアの初期化
  g.game.vars.gameState = { score: 0 };
  // プレイヤーごとの消した回数
  cmn.data.playerScore = {};
  // playerId から playerName へのマップ
  cmn.data.nameTable = {};
  // 制限時間
  cmn.data.gameTimeLimit = 60 + 7; // デフォルトの制限時間60秒
  cmn.data.frameCount = 0; // 経過時間をフレーム単位で記録
  // 何も送られてこない時は、標準の乱数生成器を使う
  cmn.data.random = g.game.random;
  cmn.data.localRandom = new g.XorshiftRandomGenerator(g.game.random.get(0,2147483647));

  // ニコ生ゲームの場合は最初に配信者だけがJoinする。最初にJoinした人の ID をゲームマスターの ID として覚え、以後使う。
  // アツマールで遊ぶ場合は誰もJoinしないため、それをもってニコ生かアツマールかを判別する。
  cmn.data.env = 'atsumaru';
  g.game.join.addOnce(function(ev){
    cmn.data.gameMasterId = ev.player.id;
    cmn.data.env = 'nicolive';
  });

  assetsScene.message.add(function(msg) {
    if (msg.data && msg.data.type === "start" && msg.data.parameters) {
      if (msg.data.parameters.totalTimeLimit) {
        // 制限時間を通知するイベントを受信した時点で初期化する
        // ゲームのローディング時間を考慮し、7秒短くする
        cmn.data.gameTimeLimit = msg.data.parameters.totalTimeLimit - 7;
      }
      if (msg.data.parameters.randomSeed != null) {
        // プレイヤー間で共通の乱数生成器を生成
        // `g.XorshiftRandomGenerator` は Akashic Engine の提供する乱数生成器実装で、 `g.game.random` と同じ型。
        cmn.data.random = new g.XorshiftRandomGenerator(msg.data.parameters.randomSeed);
      }
    }
  });

  assetsScene.onLoad.add(function () {
    // フォントを読込みます。
    // BitmapFont を生成
    var glyph = JSON.parse(assetsScene.assets["font16_1_glyph"].data);
    var font = new g.BitmapFont({
      src: assetsScene.assets["font16_1"],
      map: glyph.map,
      defaultGlyphWidth: glyph.width,
      defaultGlyphHeight: glyph.height,
      missingGlyph: glyph.missingGlyph
    });
    cmn.data.font = font;

    // BitmapFont を生成
    var glyph2 = JSON.parse(assetsScene.assets["mplus1c_regular_jis1_glyph"].data);
    var font2 = new g.BitmapFont({
      src: assetsScene.assets["mplus1c_regular_jis1"],
      map: glyph2.map,
      defaultGlyphWidth: glyph2.width,
      defaultGlyphHeight: glyph2.height,
      missingGlyph: glyph2.missingGlyph
    });
    cmn.data.font2 = font2;

    g.game.pushScene(TitleScene.create(assetsScene));
  });
  g.game.pushScene(assetsScene);
}

module.exports = main;
