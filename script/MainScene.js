"use strict";

var cmn = require("./Common");
var util = require("./util");
var speaker = require("./speaker");

/** NOTE: このファイルで唯一の export 関数 */
function create(assetsScene) {
  var scene = new g.Scene({
    game: g.game,
    // このシーンで利用するアセットのIDを列挙し、シーンに通知します
    assetIds: []
  });
  // ゲームスコアの初期化
  g.game.vars.gameState = {
    score: 0
  };
  // 制限時間
  var gameTimeLimit = 80; // デフォルトの制限時間80秒
  var frameCount = 0; // 経過時間をフレーム単位で記録
  scene.message.add(function(msg) {
    if (msg.data && msg.data.type === "start" && msg.data.parameters && msg.data.parameters.totalTimeLimit) {
      // 制限時間を通知するイベントを受信した時点で初期化する
      // ゲームのローディング時間を考慮し、7秒短くする
      gameTimeLimit = msg.data.parameters.totalTimeLimit - 7;
    }
  });

  // サーバから取得するオンラインランキングのデータなど。
  var rankingBoardMutex = {
    isLoading: false,
    ranking24h: [],
    ranking30d: [],
    rankingAll: [],
    callbacks: [],
    resolveCallbacks: function() {
      while (this.callbacks[0]) {
        var f = this.callbacks.shift();
        f();
      }
    }
  };

  scene.loaded.add(function () {

    // ここからゲーム内容を記述します

    // 背景色を設定します。
    var background1 = new g.FilledRect({
      scene: scene,
      cssColor: "forestgreen",
      width: g.game.width,
      height: g.game.height
    });
    scene.append(background1);
    var background2 = new g.FilledRect({
      scene: scene,
      cssColor: "seagreen",
      x: g.game.width / 2,
      y: g.game.height / 2,
      width: 0,
      height: 0
    });
    scene.append(background2);


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

    // バージョン表記のラベル
    var versionText = "ver " + assetsScene.assets["version"].data.replace(/[\r\n]/g,"");
    scene.append(new g.Label({
      scene: scene,
      text: versionText,
      font: font,
      fontSize: 16,
      x: g.game.width - (16 * versionText.length + 4),
      y: g.game.height - (16 + 4)
    }));

    /** 牌を消すごとに +1 される */
    var eraseCount = 0;
    /** 点数表示のラベル */
    var scoreLabel = new g.Label({
      scene: scene,
      font: font,
      fontSize: 20,
      x: g.game.width - 200,
      y: 3,
      text: "" + String(g.game.vars.gameState.score)
    });
    function updateScoreLabel() {
      scoreLabel.text = "" + String(g.game.vars.gameState.score);
      scoreLabel.invalidate();
    }
    scene.append(scoreLabel);


    // 時間表示用ラベル
    var timerLabel = new g.Label({
      scene: scene,
      font: font,
      fontSize: 16,
      text: "",
      x: 0,
      y: 0
    });
    scene.append(timerLabel);
    function updateTimerLabel() {
      var s = Math.max(0, remainTimeDecisec());
      var text = s / 10 + (s % 10 === 0 ? ".0" : "");
      if (timerLabel.text != text) {
        timerLabel.text = text;
        timerLabel.invalidate();
        // 残り時間バーの更新
        var elapsedTimeRatio = Math.max(0, 1.0 - s/(10*gameTimeLimit));
        background2.width = g.game.width * elapsedTimeRatio;
        background2.height = g.game.height * elapsedTimeRatio;
        background2.x = g.game.width / 2 - background2.width / 2;
        background2.y = g.game.height / 2 - background2.height / 2;
        background2.modified();
      }
    }
    function remainTimeDecisec() {
      return Math.floor(gameTimeLimit * 10 - frameCount / g.game.fps * 10);
    }

    // 時間切れ後も続けるために、画面クリックで操作不能を解除
    function goOvertime(ev){

      scene.pointUpCapture.remove(goOvertime);

      // ギブアップボタンを削除
      scene.remove(giveupButton);

      // ヒントボタンを追加
      var hintButton = new g.Sprite({
        scene: scene,
        src: assetsScene.assets["search"],
        x: g.game.width - 65,
        y: g.game.height - 180,
        srcWidth: 64,
        srcHeight: 64,
        width: 60,
        height:  60,
        touchable: true
      });
      hintButton.pointUp.add(function(ev) {
        countErasable(scene, t, true);
      });
      scene.insertBefore(hintButton, cover);

      // ランキングボード表示ボタン
      var rankingButton = new g.Sprite({
        scene: scene,
        src: assetsScene.assets["ranking"],
        x: g.game.width - 66,
        y: g.game.height - 259,
        srcWidth: 64,
        srcHeight: 64,
        width: 60,
        height:  60,
        touchable: true
      });
      rankingButton.pointUp.add(function(ev) {
        if (typeof window !== "undefined" && window.RPGAtsumaru) {
          window.RPGAtsumaru.experimental.scoreboards.display(cmn.SCORE_BOARD_ID);
        }
        if (true) {
          setOperable(false);
          displayLocalScoreboard(rankingBoardMutex, function(){setOperable(true);});
        }
      });
      scene.insertBefore(rankingButton, cover);
      setOperable(true);

    }

    // =======================================================
    // ※ RPG アツマールで別タブを表示すると時計が止まるチート対策
    // ※ 新市場対応にするときは修正の必要あり。
    // =======================================================
    var startTimeMillis = new Date().getTime();
    var prevTimeMillis = startTimeMillis;
    var millisPerFrame = 1000 / g.game.fps;
    function updateFrameCount() {
      var currentTimeMillis = new Date().getTime();
      // PCのシステム時刻を変えるチートへの小手先の対策。5秒以上時計が「戻っていたら」不正と判断
      if (currentTimeMillis - prevTimeMillis <= -5000) {
        forceEndGame();
      } else {
        var nextFrameCount = Math.floor((currentTimeMillis - startTimeMillis)/millisPerFrame);
        frameCount = Math.max(frameCount, nextFrameCount);
      }
      prevTimeMillis = currentTimeMillis;
    }
    function forceEndGame() {
      frameCount = Math.max(frameCount, gameTimeLimit * g.game.fps);
    }
    function updateHandler() {

      updateFrameCount();

      if (remainTimeDecisec() <= 0) {
        // 終了時処理

        setOperable(false);
        countErasable(scene, t, true); // ゲーム終了後、消せる場所を表示

        scene.update.remove(updateHandler); // タイムアウトになったら毎フレーム処理自体を止める

        // スコアボードにスコア送信
        if (typeof window !== "undefined" && window.RPGAtsumaru) {
          window.RPGAtsumaru.experimental.scoreboards.setRecord(
            cmn.SCORE_BOARD_ID,
            g.game.vars.gameState.score // スコアを送信
          ).then(function () {
            // ok
            // スコアボードを表示
            window.RPGAtsumaru.experimental.scoreboards.display(cmn.SCORE_BOARD_ID);
          }).catch(function (e) {
            // ng
          }).finally(function(){
            goOvertime();
          });
        } else {
          setRecordToLocalScoreboard(
            startTimeMillis,
            g.game.vars.gameState.score, // スコアをローカルストレージに記録
            rankingBoardMutex // サーバからオンラインランキングのスコアを取得するときの排他制御など
          );
          displayLocalScoreboard(rankingBoardMutex, function(){goOvertime();}); // スコアボードを表示
        }

      }
      updateTimerLabel();
    }
    scene.update.add(updateHandler);

    /** 画面全体を覆う透明で touchable なエンティティ。クリックイベントを吸収する。 */
    var cover = new g.FilledRect({
      scene: scene,
      x: 0,
      y: 0,
      width: g.game.width,
      height: g.game.height,
      cssColor: "#000000",
      opacity: 0,
      touchable: true
    });
    /** 一時的にゲーム全体を操作不可にする */
    function setOperable(operable) {
      if (operable) {
        cover.touchable = false;
      } else {
        cover.touchable = true;
      }
      cover.modified();
    }

    // 麻雀牌を混ぜます
    var list = [];
    for (var i = 1; i <= 9; i++) for (var j = 0; j < 4; j++) list.push("m" + i);
    for (var i = 1; i <= 9; i++) for (var j = 0; j < 4; j++) list.push("p" + i);
    for (var i = 1; i <= 9; i++) for (var j = 0; j < 4; j++) list.push("s" + i);
    for (var i = 1; i <= 7; i++) for (var j = 0; j < 4; j++) list.push("z" + i);
    // util.shuffle(list, g.game.random);

    var t = util.createArray(cmn.BOARD_HEIGHT, cmn.BOARD_WIDTH);
    for (var i = 0; i < cmn.BOARD_HEIGHT; i++) {
      for (var j = 0; j < cmn.BOARD_WIDTH; j++) {
        t[i][j] = {
          label: undefined,
          ref: undefined,
          selected: false,
          overlay: false,
          help: undefined
        };
      }
    }
    t.selectedPos = undefined;
    var haiContainer = new g.E({ scene: scene });
    for (var row = 8; row >= 1; row--) {
      for (var col = 1; col <= 17; col++) {
        t[row][col].label = list[(row-1) * 17 + (col-1)];

        var img = createHaiImage(scene, assetsScene, t[row][col].label);
        img.y = toY(row);
        img.x = toX(col);
        img.touchable = true;

        img.tag = {
          row: row,
          col: col
        };
        t[row][col].ref = img;

        img.pointDown.add(function(ev) {

          var thisImg = ev.target;
          var ti = t[thisImg.tag.row][thisImg.tag.col]; // 今クリックされた牌
          if (t.selectedPos) {
            var si = t[t.selectedPos.row][t.selectedPos.col]; // ひとつ前にクリックされた牌
            if (ti.selected) {
              // 同一の牌をもういちど選択したら、選択解除
              si.overlay.destroy();
              si.overlay = undefined;
              si.selected = false;
              t.selectedPos = undefined;
            } else {
              // 異なる２つの牌を選択した

              // 消せるか判定
              var path = calcPath(t, t.selectedPos, {row:thisImg.tag.row, col:thisImg.tag.col});
              if (path.length > 0) {
                // 消せた。

                if (ti.label === 'z4')
                  speaker.playHaiSelectZ4(assetsScene, g.game.random);
                else
                  speaker.playHaiErase(assetsScene, g.game.random);

                ti.ref.destroy(); ti.ref = undefined;
                ti.label = undefined;
                si.overlay.destroy(); si.overlay = undefined;
                si.ref.destroy(); si.ref = undefined;
                si.label = undefined;
                t.selectedPos = undefined;

                eraseCount++;
                if (remainTimeDecisec() > 0) { // 延長戦では点数を動かさないために残り時間を判定
                  g.game.vars.gameState.score += 100 * (1 + Math.floor(eraseCount/5));
                  // 全消ししたら点数追加（残り時間）
                  if (eraseCount === 17 * 8 / 2) {
                    g.game.vars.gameState.score += remainTimeDecisec();
                  }
                  updateScoreLabel();
                }

                var shiningRoad = new g.E({ scene: scene, opacity: 0.50 });
                var roadRadius = 2;
                for (var i = 0; i < path.length; i++) {
                  var p1 = path[i];
                  var y1 = toY(p1.row) + cmn.HAI_DISPLAY_HEIGHT/2;
                  var x1 = toX(p1.col) + cmn.HAI_DISPLAY_WIDTH/2;
                  shiningRoad.append(new g.FilledRect({
                    scene: scene,
                    x: x1 - roadRadius,
                    y: y1 - roadRadius,
                    width: roadRadius * 2,
                    height: roadRadius * 2,
                    cssColor: "orange"
                  }));
                  if (i + 1 < path.length) {
                    var p2 = path[i+1];
                    var y2 = toY(p2.row) + cmn.HAI_DISPLAY_HEIGHT/2;
                    var x2 = toX(p2.col) + cmn.HAI_DISPLAY_WIDTH/2;
                    var dir = (p1.col === p2.col ? 1 : 0);  // 1: tate, 0: yoko
                    shiningRoad.append(new g.FilledRect({
                      scene: scene,
                      x: Math.min(x1, x2) + (dir === 0 ? roadRadius : -roadRadius),
                      y: Math.min(y1, y2) + (dir === 1 ? roadRadius : -roadRadius),
                      width: (Math.max(x1, x2) - Math.min(x1, x2)) + 2 * (dir === 0 ? -roadRadius : roadRadius),
                      height: (Math.max(y1, y2) - Math.min(y1, y2)) + 2 * (dir === 1 ? -roadRadius : roadRadius),
                      cssColor: "orange"
                    }));
                  }
                }
                scene.append(shiningRoad);
                var intervalId = scene.setInterval(function(){
                  shiningRoad.opacity -= 0.01;
                  shiningRoad.modified();
                  if (shiningRoad.opacity <= 0) {
                    shiningRoad.destroy();
                    scene.clearInterval(intervalId);
                  }
                }, 20);

                if (eraseCount === 17 * 8 / 2) {
                  // 全消しおめですｗ
                  countErasable(scene, t, false); // ヒント表示を消すために一応呼び出す

                  if (remainTimeDecisec() > 0) { // 延長戦では無効にするために判定
                    var cnt = 7;
                    var aciid = scene.setInterval(function(){
                      speaker.playHaiAllClear(assetsScene, g.game.random);
                      cnt--;
                      if (cnt <= 0) {
                        scene.clearInterval(aciid);
                      }
                    }, 700);
                  }
                } else if (countErasable(scene, t, false) == 0) {
                  t = shuffleBoard(scene, t, haiContainer, setOperable);
                  // countErasable(scene, t, false);
                  speaker.playHaiShuffle(assetsScene, g.game.random);
                }

              } else {
                // 消せない
                // 減点する
                if (remainTimeDecisec() > 0) { // 延長戦では点数を動かさないために残り時間を判定
                  g.game.vars.gameState.score = Math.max(0, g.game.vars.gameState.score - 1);
                  updateScoreLabel();
                }

                // 失敗音を鳴らす
                speaker.playHaiMiss(assetsScene, g.game.random);

                // 選択解除する
                si.overlay.destroy();
                si.overlay = undefined;
                si.selected = false;
                t.selectedPos = undefined;
              }
            }
          } else {
            // 1牌目を選択した

            if (ti.label === 'z4')
              speaker.playHaiSelectZ4(assetsScene, g.game.random);
            else
              speaker.playHaiSelect(assetsScene, g.game.random);

            var rect = new g.FilledRect({
              scene: scene,
              x: thisImg.x,
              y: thisImg.y - cmn.HAI_DISPLAY_MARGIN_Y,
              width: thisImg.width,
              height:  thisImg.height + cmn.HAI_DISPLAY_MARGIN_Y,
              opacity: 0.25,
              cssColor: "green"
            });
            scene.append(rect);
            ti.overlay = rect;
            ti.selected = true;
            t.selectedPos = {
              row: thisImg.tag.row,
              col: thisImg.tag.col
            };
          }
        });
        haiContainer.append(img);
      }
    }
    scene.append(haiContainer);

    var resetButton = new g.Sprite({
      scene: scene,
      src: assetsScene.assets["restart"],
      x: g.game.width - 65,
      y: g.game.height - 100,
      width: 64,
      height:  64,
      touchable: true
    });
    resetButton.pointUp.add(function(ev) {
      if (remainTimeDecisec() > 0) {
        speaker.playRestart1(assetsScene, g.game.random);
      } else {
        speaker.playRestart2(assetsScene, g.game.random);
      }
      g.game.replaceScene(create(assetsScene));
    });
    scene.append(resetButton);


    var giveupButton = new g.Sprite({
      scene: scene,
      src: assetsScene.assets["giveup"],
      x: g.game.width - 61,
      y: g.game.height - 180,
      srcWidth: 64,
      srcHeight: 64,
      width: 60,
      height:  60,
      touchable: true
    });
    giveupButton.pointUp.add(function(ev) {
      forceEndGame();
    });
    scene.append(giveupButton);

    scene.append(cover); // 一番上になるように最後に追加する

    setOperable(false); // 最初は操作不可
    scene.setTimeout(function() {
      t = shuffleBoard(scene, t, haiContainer, setOperable);
      // countErasable(scene, t, false);
    }, 600);

    // ここまでゲーム内容を記述します
  });
  return scene;
};

function toX(col) { return (col-1) * (cmn.HAI_DISPLAY_WIDTH + cmn.HAI_DISPLAY_MARGIN_X) + cmn.HAI_DISPLAY_WIDTH; }
function toY(row) { return (row-1) * (cmn.HAI_DISPLAY_HEIGHT + cmn.HAI_DISPLAY_MARGIN_Y) + cmn.HAI_DISPLAY_HEIGHT * 0.7; }

/**
 * @params {string} s  m1-m9,p1-p9,s1-s9,z1-z7
 * @returns {Sprite}
 */
function createHaiImage(scene, assetsScene, s) {

  if (s[0] === 'm') {
    var n = Number(s[1]);
    var m = new g.Sprite({
      scene: scene,
      src: assetsScene.assets["manzu"],
      srcX: [0,2,69,135,202,268,334,400,466,532][n],
      srcY: 3,
      srcWidth: cmn.HAI_SRC_WIDTH,
      srcHeight: cmn.HAI_SRC_HEIGHT,
      width: cmn.HAI_DISPLAY_WIDTH,
      height: cmn.HAI_DISPLAY_HEIGHT
    });
    return m;
  }
  if (s[0] === 'p') {
    var n = Number(s[1]);
    var m = new g.Sprite({
      scene: scene,
      src: assetsScene.assets["pinzu"],
      srcX: [0,2,69,135,202,268,336,402,468,535][n],
      srcY: 3,
      srcWidth: cmn.HAI_SRC_WIDTH,
      srcHeight: cmn.HAI_SRC_HEIGHT,
      width: cmn.HAI_DISPLAY_WIDTH,
      height: cmn.HAI_DISPLAY_HEIGHT
    });
    return m;
  }

  if (s[0] === 's') {
    var n = Number(s[1]);
    var m = new g.Sprite({
      scene: scene,
      src: assetsScene.assets["souzu"],
      srcX: [0,2,69,135,202,268,336,402,468,535][n],
      srcY: 3,
      srcWidth: cmn.HAI_SRC_WIDTH,
      srcHeight: cmn.HAI_SRC_HEIGHT,
      width: cmn.HAI_DISPLAY_WIDTH,
      height: cmn.HAI_DISPLAY_HEIGHT
    });
    return m;
  }
  if (s[0] === 'z') {
    var n = Number(s[1]);
    if (1 <= n && n <= 4) {
      var m = new g.Sprite({
        scene: scene,
        src: assetsScene.assets["jihai1"],
        srcX: [0,2,70,137,205][n],
        srcY: 4,
        srcWidth: cmn.HAI_SRC_WIDTH,
        srcHeight: cmn.HAI_SRC_HEIGHT,
        width: cmn.HAI_DISPLAY_WIDTH,
        height: cmn.HAI_DISPLAY_HEIGHT
      });
      return m;
    }
    if (5 <= n && n <= 7) {
      var m = new g.Sprite({
        scene: scene,
        src: assetsScene.assets["jihai2"],
        srcX: [0,2,69,135,202][n-4],
        srcY: 4,
        srcWidth: cmn.HAI_SRC_WIDTH,
        srcHeight: cmn.HAI_SRC_HEIGHT,
        width: cmn.HAI_DISPLAY_WIDTH,
        height: cmn.HAI_DISPLAY_HEIGHT
      });
      return m;
    }

  }

}


/** @returns {number} 消せる場所の数 */
function countErasable(scene, t, showHint) {

  // 消去
  for (var i = 0; i < 8 * 17; i++) {
    var row1 = ~~(i / 17) + 1, col1 = i % 17 + 1;
    var t1 = t[row1][col1];
    if (t1.hint) { util.destroyAll(t1.hint); }
    t1.hint = [];
  }

  var count = 0;
  for (var i = 0; i < 8 * 17; i++) {
    var row1 = ~~(i / 17) + 1, col1 = i % 17 + 1;
    var t1 = t[row1][col1];
    if (!t1.label) continue;
    for (var j = i + 1; j < 8 * 17; j++) {
      var row2 = ~~(j / 17) + 1, col2 = j % 17 + 1;
      var t2 = t[row2][col2];
      if (!t2.label) continue;
      if (t1.label !== t2.label) continue;
      if (calcPath(t, {row: row1, col: col1}, {row: row2, col: col2}).length >= 2) {
        count++;
        if (showHint) {
          var thisImg = t1.ref;
          var rect1 = new g.FilledRect({
            scene: scene,
            x: toX(thisImg.tag.col),
            y: toY(thisImg.tag.row) - cmn.HAI_DISPLAY_MARGIN_Y,
            width: thisImg.width,
            height:  thisImg.height + cmn.HAI_DISPLAY_MARGIN_Y,
            opacity: 0.20,
            cssColor: "blue"
          });
          scene.append(rect1);
          t1.hint.push(rect1);
          var thisImg = t2.ref;
          var rect2 = new g.FilledRect({
            scene: scene,
            x: toX(thisImg.tag.col),
            y: toY(thisImg.tag.row) - cmn.HAI_DISPLAY_MARGIN_Y,
            width: thisImg.width,
            height:  thisImg.height + cmn.HAI_DISPLAY_MARGIN_Y,
            opacity: 0.20,
            cssColor: "blue"
          });
          scene.append(rect2);
          t2.hint.push(rect2);
        }
      }
    }
  }
  return count;
}


/**
 * 指定した２牌を取れるかどうかを判定する。消せる場合は二角取りの経路を返す。
 * @param {*} t
 * @param {{row: number, col: number}} pos1
 * @param {{row: number, col: number}} pos2
 * @returns {{row: number, col:numer}[]} 二角取りの折れ線の端点の座標の配列を返す。配列の先頭はpos1と、末尾はpos2と一致する。消すことができない場合は空の配列。
 */
function calcPath(t, pos1, pos2) {

  var IMPOSSIBLE = [];

  if (!isin(pos1.row, pos1.col)) return IMPOSSIBLE;
  if (!isin(pos2.row, pos2.col)) return IMPOSSIBLE;
  if (pos1.row === pos2.row && pos1.col === pos2.col) return IMPOSSIBLE;
  if (t[pos1.row][pos1.col].label !== t[pos2.row][pos2.col].label) return IMPOSSIBLE;

  // 1直線でとれるか判定
  if (canGoStraight(t, pos1, pos2)) {
    return [pos1, pos2];
  }

  var result = undefined, minDist;
  // 2直線でとれるか判定
  var pos1plus = getTrackList(t, pos1.row, pos1.col);
  for (var i = 0; i < pos1plus.length; i++) {
    var m1 = pos1plus[i];
    if (canGoStraight(t, m1, pos2)) {
      var dist = getDist(pos1, m1) + getDist(m1, pos2);
      if (result === undefined || minDist > dist) {
        result = m1;
        minDist = dist;
      }
    }
  }
  if (result) return [pos1, result, pos2];

  // 3直線でとれるか判定
  var pos2plus = getTrackList(t, pos2.row, pos2.col);
  for (var i = 0; i < pos1plus.length; i++) {
    var m1 = pos1plus[i];
    for (var j = 0; j < pos2plus.length; j++) {
      var m2 = pos2plus[j];
      if (canGoStraight(t, m1, m2)) {
        var dist = getDist(pos1, m1) + getDist(m1, m2) + getDist(m2, pos2);
        if (result === undefined || minDist > dist) {
          result = [m1, m2];
          minDist = dist;
        }
      }
    }
  }
  if (result) return [pos1, result[0], result[1], pos2];

  return IMPOSSIBLE;
}


/** 縦と横のマス目の差の合計を返す */
function getDist(pos1, pos2) {
  return Math.abs(pos1.row - pos2.row) + Math.abs(pos1.col - pos2.col);
}
/** 盤面の範囲内であるかどうか */
function isin(row, col) {
  return 0 <= row && row < cmn.BOARD_HEIGHT && 0 <= col && col < cmn.BOARD_WIDTH;
}
/**
 * 1直線でとれるか判定する
 * @returns {boolean}
 */
function canGoStraight(t, pos1, pos2) {
  if (pos1.row === pos2.row) {
    var row = pos1.row;
    var col1 = Math.min(pos1.col, pos2.col);
    var col2 = Math.max(pos1.col, pos2.col);
    var blocked = false;
    for (var col = col1 + 1; col < col2; col++) if (t[row][col].label) { blocked = true; break; }
    if (!blocked) return true;
  }
  if (pos1.col === pos2.col) {
    var col = pos1.col;
    var row1 = Math.min(pos1.row, pos2.row);
    var row2 = Math.max(pos1.row, pos2.row);
    var blocked = false;
    for (var row = row1 + 1; row < row2; row++) if (t[row][col].label) { blocked = true; break; }
    if (!blocked) return true;
  }
  return false;
}
/**
 * 上下左右にぶつかるまで進める座標のリストを返す
 * @returns {{row: number, col:number}[]} 座標の配列
 */
function getTrackList(t, row, col) {
  var dr = [0, 1, 0, -1];
  var dc = [-1, 0, 1, 0];
  var result = [];
  for (var d = 0; d < 4; d++) {
    var nrow = row + dr[d];
    var ncol = col + dc[d];
    while (isin(nrow, ncol) && !t[nrow][ncol].label) {
      result.push({ row: nrow, col: ncol });
      nrow += dr[d];
      ncol += dc[d];
    }
  }
  return result;
}

/**
 * 牌を並べ替える。
 * @param {*} scene
 * @param {*} t
 * @param {*} haiContainer
 * @param {function} setOperable
 * @returns {} 新しい t
 */
function shuffleBoard(scene, t, haiContainer, setOperable) {

  setOperable(false); // 処理中は操作させない

  var list = [];
  var old_pos = util.createArray(cmn.BOARD_HEIGHT, cmn.BOARD_WIDTH);
  var new_t = util.createArray(cmn.BOARD_HEIGHT, cmn.BOARD_WIDTH);

  t.selectedPos = undefined;
  new_t.selectedPos = undefined;

  for (var row = 0; row < cmn.BOARD_HEIGHT; row++) {
    for (var col = 0; col < cmn.BOARD_WIDTH; col++) {
      var ti = t[row][col];
      if (ti.label) {
        list.push({row: row, col: col});
        if (ti.overlay) { ti.overlay.destroy(); ti.overlay = undefined; }
        if (ti.hint) { util.destroyAll(ti.hint); ti.hint = []; }
        ti.selected = false;
      } else {
        new_t[row][col] = t[row][col];
      }
    }
  }
  util.shuffle(list, g.game.random);
  var i = 0;
  for (var row = cmn.BOARD_HEIGHT - 1; row >= 0; row--) {
    for (var col = 0; col < cmn.BOARD_WIDTH; col++) {
      if (!new_t[row][col]) {
        var old_row = list[i].row;
        var old_col = list[i].col;
        i++;
        new_t[row][col] = t[old_row][old_col];
        var img = new_t[row][col].ref;
        img.tag.row = row;
        img.tag.col = col;
        old_pos[row][col] = { x: img.x, y: img.y };
        // 入れなおすことで表示順番を変更
        haiContainer.remove(img);
        haiContainer.append(img);
      }
    }
  }

  var N = 8, n = N;
  var intervalId = scene.setInterval(function(){
    n--;
    for (var row = 0; row < cmn.BOARD_HEIGHT; row++) {
      for (var col = 0; col < cmn.BOARD_WIDTH; col++) {
        var ti = new_t[row][col];
        if (ti.label) {
          ti.ref.x = (n * old_pos[row][col].x + (N-n) * toX(col)) / N;
          ti.ref.y = (n * old_pos[row][col].y + (N-n) * toY(row)) / N;
          ti.ref.modified();
        }
      }
    }
    if (n <= 0) {
      setOperable(true); // 操作禁止を解除
      scene.clearInterval(intervalId);
    }
  }, 100);

  return new_t;
}

function displayLocalScoreboard(rankingBoardMutex, callback) {

  migrateScoreStorage();

  var currentStr = localStorage.getItem("scores3");
  var current = [];
  if (currentStr) current = JSON.parse(currentStr);

  current.sort(function(a, b) {
    if (a.score != b.score) return b.score - a.score; // score が大きい順
    return a.time - b.time; // time が小さい順
  });

  var now = new Date();
  var ago24h = ((now.getTime() - 86400 * 1000) / 1000) | 0;
  var ago30d = ((now.getTime() - 30 * 86400 * 1000) / 1000) | 0;

  var ranking24h = current.filter(function(item){ return item.time >= ago24h; });
  var ranking30d = current.filter(function(item){ return item.time >= ago30d; });

  // 長くなりすぎたデータはこのタイミングでストレージから消す
  if (current.length > 20) {
    var alive = [];
    for (var i = 0; i < current.length; i++) {
      // 自分を上回るスコアかつ新しいデータが20件以上あるとき
      // そのデータはもうランキングに表示されることは無い
      var my = current[i];
      var c = 0;
      for (var j = 0; j < current.length; j++) {
        if (my.score < current[j].score && my.time < current[j].time)
          c++;
      }
      if (c < 20) {
        alive.push(current[i]);
      }
    }
    localStorage.setItem("scores3", JSON.stringify(alive));
  }
  
  var ranking24h = ranking24h.slice(0, 20).map(function(item){ return {
      "score": item.score,
      "time": util.formatDate(new Date(1000*item.time)),
    };
  });
  var ranking30d = ranking30d.slice(0, 20).map(function(item){ return {
      "score": item.score,
      "time": util.formatDate(new Date(1000*item.time)),
    };
  });
  var rankingAll = current.slice(0, 20).map(function(item){ return {
      "score": item.score,
      "time": util.formatDate(new Date(1000*item.time)),
    };
  });
  renderHtml(callback, ranking24h, ranking30d, rankingAll, rankingBoardMutex);
}

function renderHtml(callback, ranking24h, ranking30d, rankingAll, rankingBoardMutex) {

  // スタイルシートを追加
  if (!document.getElementById('my-dynamic-style')) {
    var style = document.createElement('style');
    style.id = 'my-dynamic-style';
    style.textContent = '#customAlert{font-family:"Segoe UI",sans-serif;background:linear-gradient(120deg,#f0f8ff,#e6e6fa);margin:0;padding:2em;display:flex;flex-direction:column;align-items:center;position:fixed;top:30px;left:100px;width:500px;height:370px;overflow:auto;border:1px solid #ccc;padding:10px;boxShadow:0 0 10px #999;zIndex:9999}.ranking-table{width:90%;max-width:600px;border-collapse:collapse;background:#fff;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,.1);margin-top:0;margin-bottom:.1em;overflow:hidden}.ranking-table td,.ranking-table th{padding:.2em .5em;text-align:center;max-width:160px}.ranking-table thead{background-color:#6c90f0;color:#fff}.ranking-table tbody tr:nth-child(2n){background-color:#f9f9ff}.ranking-table tbody tr:hover{background-color:#e0e8ff}.rank-1{color:gold}.rank-2{color:silver}.rank-3{color:#cd7f32}.tabs{display:flex;margin-bottom:1px; margin-left:40px;}.tab{padding:10px 20px;cursor:pointer;background:#eee;border:1px solid #ccc;border-bottom:none;margin-right:4px;border-radius:6px 6px 0 0}.tab.active{background:#fff;font-weight:700;border-bottom:2px solid #fff}';
    style.textContent += `
  .toggle-container {
    display: inline-flex;
    border: 1px solid #888;
    border-radius: 5px;
    overflow: hidden;
    position: absolute;
    top: 20px;
    left: 20px;
  }

  .toggle-container input[type="radio"] {
    display: none;
  }

  .toggle-container label {
    width: 20px;
    padding: 8px 8px;
    cursor: pointer;
    background: #eee;
    border-right: 1px solid #ccc;
  }

  .toggle-container label:last-child {
    border-right: none;
  }

  .toggle-container input[type="radio"]:checked + label {
    background: #fff;
    font-weight: bold;
    border-bottom: 2px solid #6c90f0;
  }

  #configButton {
    border: 1px solid #888;
    border-radius: 5px;
    background-color: #fff;
    width: 30px;
    height: 30px;
    cursor: pointer;
    position: absolute;
    top: 25px;
    left: 105px;
    padding: 4px 4px;
  }

  #modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: none;
    justify-content: center;
    align-items: center;
  }

  #modal {
    background: white;
    padding: 1em;
    border-radius: 8px;
    width: 300px;
    box-shadow: 0 0 10px #0006;
  }

  #modal input {
    width: 100%;
    padding: 0.5em;
    margin-top: 0.5em;
    box-sizing: border-box;
    border: 1px solid black;
  }

  #modal-buttons {
    margin-top: 1em;
    text-align: right;
  }
  #modal button {
    width: 6em;
    height: 2em;
  }
`;
    document.head.appendChild(style);
  }

  /**
   * @param param {Object}
   * @param param.type {String} // local|online
   * @param param.id {Srring} content1
   * @param param.header1 {String} // 順位(24h)
   * @param param.items {Array} // 
   */
  function renderRankingTable(param) {
    if (param.type === 'loading') {
      return '<table class="ranking-table" id="'+ param.id + '" style="display:none;"><tr><td><img src="image/loading.gif"></img></td></tr></table>';
    } else {
      var tableHtml = '<table class="ranking-table" id="'+ param.id + '" style="display:none;">';
        if (param.type === 'local') { tableHtml += '<thead><tr><th>'+ param.header1 +'</th><th>スコア</th><th>日時</th></tr></thead>'; }
        if (param.type === 'online') { tableHtml += '<thead><tr><th>'+ param.header1 +'</th><th>名前</th><th>スコア</th><th>日時</th></tr></thead>'; }
        tableHtml += '<tbody>';
        param.items.forEach(function(item, i){
          var rankClass = "";
          if (i < 3) rankClass = ' class="rank-' + (i+1) + '"';
          if (param.type === 'local') { tableHtml += '<tr><td' + rankClass + '>' + (i+1) + '位</td><td>' + item.score + '</td><td>' + item.time + '</td></tr>'; }
          if (param.type === 'online') { tableHtml += '<tr><td' + rankClass + '>' + (i+1) + '位</td><td>'+ item.name +'</td><td>' + item.score + '</td><td>' + item.time + '</td></tr>'; }
        });
        tableHtml += '</tbody></table>';
      return tableHtml;
    }
  };

  var labelHtml = '<div class="tabs"><div class="tab active" data-target="tab1">24時間</div><div class="tab" data-target="tab2">30日</div><div class="tab" data-target="tab3">総合</div></div>';

  var rankingToggleHtml = `
<div class="toggle-container">
  <input type="radio" id="toggle-local" name="rankingToggle" checked><label for="toggle-local">&#x1f408;</label>
  <input type="radio" id="toggle-online" name="rankingToggle"><label for="toggle-online">&#x1f310;</label>
</div>
<div>
  <button id="configButton"><img src="image/gear.png" height="20" width="20"></img></button>
</div>

<div id="modal-overlay">
  <div id="modal">
    <div>お名前</div>
    <input type="text" id="nameInput" maxlength="16" />
    <div id="modal-buttons">
      <button id="modal-button1">OK</button>
    </div>
  </div>
</div>
`;

  // 古いデータが見えないように初期レンダリングされる前に取得を試みる。かなり汚い。メンテ不可能。
  fetchOnlineRanking(rankingBoardMutex);
  // データ取得できたタイミングで再描画。
  rankingBoardMutex.callbacks.push(function(){
    if (document.getElementById("customAlert")) {
      document.getElementById("content4").outerHTML = renderRankingTable({ "id": "content4", "type": (rankingBoardMutex.isLoading ? "loading" : "online"), "header1": "順位(24h)", "items": rankingBoardMutex.ranking24h });
      document.getElementById("content5").outerHTML = renderRankingTable({ "id": "content5", "type": (rankingBoardMutex.isLoading ? "loading" : "online"), "header1": "順位(30d)", "items": rankingBoardMutex.ranking30d });
      document.getElementById("content6").outerHTML = renderRankingTable({ "id": "content6", "type": (rankingBoardMutex.isLoading ? "loading" : "online"), "header1": "順位(all)", "items": rankingBoardMutex.rankingAll });
      switchTableDisplay();
    }
  });

  // アラート用のdiv作成
  var alertDiv = document.createElement('div');
  alertDiv.id = 'customAlert';

  // 中身のHTMLを挿入（閉じるボタンも含む）
  var innerHtml = '<button id="closeCustomAlert1" style="align-self:flex-end;">閉じる</button>';
  innerHtml += rankingToggleHtml;
  innerHtml += labelHtml;
  innerHtml += renderRankingTable({ "id": "content1", "type": "local", "header1": "順位(24h)", "items": ranking24h });
  innerHtml += renderRankingTable({ "id": "content2", "type": "local", "header1": "順位(30d)", "items": ranking30d });
  innerHtml += renderRankingTable({ "id": "content3", "type": "local", "header1": "順位(all)", "items": rankingAll });
  innerHtml += renderRankingTable({ "id": "content4", "type": (rankingBoardMutex.isLoading ? "loading" : "online"), "header1": "順位(24h)", "items": rankingBoardMutex.ranking24h });
  innerHtml += renderRankingTable({ "id": "content5", "type": (rankingBoardMutex.isLoading ? "loading" : "online"), "header1": "順位(30d)", "items": rankingBoardMutex.ranking30d });
  innerHtml += renderRankingTable({ "id": "content6", "type": (rankingBoardMutex.isLoading ? "loading" : "online"), "header1": "順位(all)", "items": rankingBoardMutex.rankingAll });
  innerHtml += '<button id="closeCustomAlert2">閉じる</button>';

  alertDiv.innerHTML = innerHtml;
  
  // ドキュメントに追加
  document.body.appendChild(alertDiv);
  
  // 閉じるボタンにイベント追加
  document.getElementById('closeCustomAlert1').onclick = function(){ alertDiv.remove(); callback && callback(); };
  document.getElementById('closeCustomAlert2').onclick = function(){ alertDiv.remove(); callback && callback(); };
  
  // 設定ボタンにイベント追加
  document.getElementById('configButton').onclick = function(){
    document.getElementById("nameInput").value = localStorage.getItem("name");
    document.getElementById("modal-overlay").style.display = "flex";
    document.getElementById("nameInput").focus();
  };
  document.getElementById('modal-button1').onclick = function(){
    var name = document.getElementById("nameInput").value.trim();
    localStorage.setItem("name", name);
    document.getElementById("modal-overlay").style.display = "none";
  }
  
  // 状態
  var selectedTab = 'tab1';
  var selectedToggle = 'local';

  function switchTableDisplay() {
    document.getElementById("content1").style.display = 'none';
    document.getElementById("content2").style.display = 'none';
    document.getElementById("content3").style.display = 'none';
    document.getElementById("content4").style.display = 'none';
    document.getElementById("content5").style.display = 'none';
    document.getElementById("content6").style.display = 'none';
    var targetId = null;
    if (selectedTab === 'tab1' && selectedToggle === 'local') { targetId = 'content1'; }
    if (selectedTab === 'tab2' && selectedToggle === 'local') { targetId = 'content2'; }
    if (selectedTab === 'tab3' && selectedToggle === 'local') { targetId = 'content3'; }
    if (selectedTab === 'tab1' && selectedToggle === 'online') { targetId = 'content4'; }
    if (selectedTab === 'tab2' && selectedToggle === 'online') { targetId = 'content5'; }
    if (selectedTab === 'tab3' && selectedToggle === 'online') { targetId = 'content6'; }
    document.getElementById(targetId).style.display = null;
    
    if (selectedToggle === 'local') { document.getElementById("configButton").style.display = 'none'; }
    if (selectedToggle === 'online') { document.getElementById("configButton").style.display = null; }
  };

  // タブ切り替えイベント追加
  var tabs = document.querySelectorAll('.tab');
  tabs.forEach(function(tab){
    tab.addEventListener('click', function(){
      tabs.forEach(function(t){t.classList.remove('active')});
      tab.classList.add('active');
      selectedTab = tab.dataset.target;
      switchTableDisplay();
    });
  });

  // 自己べランキング・オンラインランキング切り替えスイッチにイベント追加
  document.getElementById("toggle-local").addEventListener("change", function(){
    selectedToggle = 'local';
    switchTableDisplay();
  });
  document.getElementById("toggle-online").addEventListener("change", function(){
    selectedToggle = 'online';
    switchTableDisplay();
  });

  // 初期表示のために一回実行
  switchTableDisplay();
}

/**
 * @param {Number} millis 
 * @param {Number} score 
 */
function setRecordToLocalScoreboard(millis, score, rankingBoardMutex) {
  migrateScoreStorage();
  var currentStr = localStorage.getItem("scores3");
  var current = [];
  if (currentStr) current = JSON.parse(currentStr);

  var item = {
    "id": util.generateUUIDWithWeightedChecksum(),
    "time": (millis / 1000)|0,
    "score": score
  };
  current.push(item);
  localStorage.setItem("scores3", JSON.stringify(current));
  submitScores({ 
    "name": localStorage.getItem("name") || "184",
    "scores": [item],
  }, rankingBoardMutex);
  return;
}

function migrateScoreStorage(){
  migrateScoreStorage1to2();
  migrateScoreStorage2to3();
}

function migrateScoreStorage1to2(){
  var v1str = localStorage.getItem("scores");
  if (!v1str) return;
  localStorage.removeItem("scores");
  var v1 = JSON.parse(v1str);

  var v2str = localStorage.getItem("scores2");
  var v2 = [];
  if (v2str) v2 = JSON.parse(v2str);
  v1.forEach(function(v1item){
    v2.push({
      "id": crypto.randomUUID(),
      "time": (util.parseDateString(v1item.time).getTime() / 1000)|0,
      "score": v1item.score,
    });
  });
  localStorage.setItem("scores2", JSON.stringify(v2));
}

function migrateScoreStorage2to3(){
  var v2str = localStorage.getItem("scores2");
  if (!v2str) return;
  localStorage.removeItem("scores2");
  var v2 = JSON.parse(v2str);

  var v3str = localStorage.getItem("scores3");
  var v3 = [];
  if (v3str) v3 = JSON.parse(v3str);
  v2.forEach(function(v2item){
    v3.push({
      "id": util.generateUUIDWithWeightedChecksum(),
      "time": v2item.time,
      "score": v2item.score,
    });
  });
  localStorage.setItem("scores3", JSON.stringify(v3));
}

const apiUrl = "https://script.google.com/macros/s/AKfycbzDVVaANuM5pMxvM9ZdiKDSsi6so29fLs9oqQt9_rW7lPZjNdZgmDqVBYb5EoG9OqLV/exec";

/** 
 * 
 * @param data {Object}
 * @param data.name {string}
 * @param data.scores {[ {id, time, score} ]}
 */
function submitScores(data, rankingBoardMutex){
  rankingBoardMutex.isLoading = true;
  fetch(apiUrl, {
    method: "POST",
    headers: {},
    body: JSON.stringify({
      name: data.name,
      scores: data.scores,
    }),
  })
  .then(function(response) { return response.json(); })
  .then(function(data){ 
    rankingBoardMutex.ranking24h = data["24h"];
    rankingBoardMutex.ranking30d = data["30d"];
    rankingBoardMutex.rankingAll = data["all"];
    rankingBoardMutex.isLoading = false;
    rankingBoardMutex.resolveCallbacks();
  })
  .catch(function(error){ 
    rankingBoardMutex.isLoading = false;
    console.error("まずいにゃ", error);
    rankingBoardMutex.resolveCallbacks();
  });
}

function fetchOnlineRanking(rankingBoardMutex) {
  if (rankingBoardMutex.isLoading) return;
  rankingBoardMutex.isLoading = true;
  fetch(apiUrl, {
    method: "GET"
  })
  .then(function(response) { return response.json(); })
  .then(function(data){ 
    rankingBoardMutex.ranking24h = data["24h"];
    rankingBoardMutex.ranking30d = data["30d"];
    rankingBoardMutex.rankingAll = data["all"];
    rankingBoardMutex.isLoading = false;
    rankingBoardMutex.resolveCallbacks();
  })
  .catch(function(error){ 
    rankingBoardMutex.isLoading = false;
    console.error("えらいこっちゃにゃ", error);
    rankingBoardMutex.resolveCallbacks();
  });

}

module.exports.create = create;
