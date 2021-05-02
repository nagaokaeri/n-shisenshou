"use strict";

var MainScene = require("./MainScene");
var cmn = require("./Common");
var util = require("./util");

var resolvePlayerInfo = require("@akashic-extension/resolve-player-info").resolvePlayerInfo;

/** NOTE: このファイルで唯一の export 関数 */
function create(assetsScene) {
  var scene = new g.Scene({ game: g.game });
  scene.onLoad.add(function () {
    // ここからゲーム内容を記述します

    // 背景色を設定します。
    var background1 = new g.FilledRect({
      scene: scene,
      cssColor: "forestgreen",
      width: g.game.width,
      height: g.game.height
    });
    scene.append(background1);

    // タイトル
    scene.append(new g.Label({
      scene: scene,
      x: 50,
      y: 40,
      font: cmn.data.font2,
      fontSize: 30,
      textColor: 'white',
      text: "協力四川省"
    }));

    g.game.onPlayerInfo.add(function(ev) {
      // 各プレイヤーが名前利用許諾のダイアログに応答した時、通知されます。
      // ev.player.name にそのプレイヤーの名前が含まれます。
      // (ev.player.id には (最初から) プレイヤーIDが含まれています)
      cmn.data.nameTable[ev.player.id] = ev.player.name;
    });

    // 名前登録ボタン
    var nameButton = new g.FilledRect({
      scene: scene,
      x: 100,
      y: 150,
      width: 150,
      height: 40,
      cssColor: "blue",
      touchable: true
    });
    nameButton.append(
      new g.Label({
        scene: scene,
        x: 8,
        y: 6,
        font: cmn.data.font2,
        textColor: 'white',
        text: "名前登録"
      })
    );
    nameButton.onPointDown.add(function(ev){
      if (g.game.selfId !== ev.player.id) return; // 自分がボタンを押したときだけ処理
      resolvePlayerInfo({ raises: true }, function(err, playerInfo){
        nameLabel.text = util.toZenkaku(util.nullToDefault(playerInfo.name, "ゲスト"));
        nameLabel.invalidate();
      });
    });
    scene.append(nameButton);

    // 登録されてる名前を表示する
    var nameLabel = new g.Label({
      scene: scene,
      x: 250 + 8,
      y: 150 + 6,
      font: cmn.data.font2,
      textColor: 'white',
      text: ""
    });
    scene.append(nameLabel);

    var startButton = new g.FilledRect({
      scene: scene,
      x: 100,
      y: 100,
      width: 150,
      height: 40,
      cssColor: "red",
      touchable: true
    });
    startButton.append(
      new g.Label({
        scene: scene,
        x: 8,
        y: 6,
        font: cmn.data.font2,
        textColor: 'white',
        text: "ゲーム開始"
      })
    );
    startButton.onPointDown.add(function(ev){
      if (cmn.data.gameMasterId !== ev.player.id) return; // 生放送主だけがボタンを押せるようにする
      g.game.vars.gameState.score = 0;
      cmn.data.playerScore = {};
      cmn.data.frameCount = 0;
      g.game.pushScene(MainScene.create(assetsScene));
    });
    scene.append(startButton);

    // ここまでゲーム内容を記述します
  });

  return scene;
};

module.exports.create = create;
