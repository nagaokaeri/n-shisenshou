"use strict";

var cmn = require("./Common");
var util = require("./util");
var speaker = require("./speaker");

/** NOTE: このファイルで唯一の export 関数 */
function create() {
  var scene = new g.Scene({
    game: g.game,
    // このシーンで利用するアセットのIDを列挙し、シーンに通知します
    assetIds: ["version", "manzu", "pinzu", "souzu", "jihai1", "jihai2", "font16_1", "font16_1_glyph","restart","search","ranking",
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
  // ゲームスコアの初期化
  g.game.vars.gameState = {
    score: 0
  };
  var SCORE_BOARD_ID = 1; // ボードIDとして固定で1を指定
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

  scene.loaded.add(function () {

    // ここからゲーム内容を記述します

    // 背景色を設定します。
    var background1 = new g.FilledRect({
      scene: scene,
      cssColor: "pink",
      width: g.game.width,
      height: g.game.height
    });
    scene.append(background1);
    var background2 = new g.FilledRect({
      scene: scene,
      cssColor: "thistle",
      x: g.game.width / 2,
      y: g.game.height / 2,
      width: 0,
      height: 0
    });
    scene.append(background2);


    // フォントを読込みます。
    // BitmapFont を生成
    var glyph = JSON.parse(scene.assets["font16_1_glyph"].data);
    var font = new g.BitmapFont({
      src: scene.assets["font16_1"],
      map: glyph.map,
      defaultGlyphWidth: glyph.width,
      defaultGlyphHeight: glyph.height,
      missingGlyph: glyph.missingGlyph
    });

    // バージョン表記のラベル
    var versionText = "ver " + scene.assets["version"].data.replace(/[\r\n]/g,"");
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
      setOperable(true);
      scene.pointUpCapture.remove(goOvertime);

      // ヒントボタンを追加
      var hintButton = new g.Sprite({
        scene: scene,
        src: scene.assets["search"],
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
      scene.append(hintButton);

      // ランキングボード表示ボタン
      var rankingButton = new g.Sprite({
        scene: scene,
        src: scene.assets["ranking"],
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
          window.RPGAtsumaru.experimental.scoreboards.display(SCORE_BOARD_ID);
        }
      });
      scene.append(rankingButton);
    }

    // =======================================================
    // ※ RPG アツマールで別タブを表示すると時計が止まるチート対策
    // ※ 新市場対応にするときは修正の必要あり。
    // =======================================================
    var startTimeMillis = new Date().getTime();
    var millisPerFrame = 1000 / g.game.fps;
    function updateFrameCount() {
      var currentTimeMillis = new Date().getTime();
      frameCount = Math.floor((currentTimeMillis - startTimeMillis)/millisPerFrame);
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
            SCORE_BOARD_ID,
            g.game.vars.gameState.score // スコアを送信
          ).then(function () {
            // ok
            // スコアボードを表示
            window.RPGAtsumaru.experimental.scoreboards.display(SCORE_BOARD_ID);
          }).catch(function (e) {
            // ng
          });

        }

        scene.pointUpCapture.add(goOvertime);

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

        var img = createHaiImage(scene, t[row][col].label);
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
                  speaker.playHaiSelectZ4(scene, g.game.random);
                else
                  speaker.playHaiErase(scene, g.game.random);

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
                for (i = 0; i + 1 < path.length; i++) {
                  var p1 = path[i];
                  var p2 = path[i+1];
                  var y1 = toY(p1.row) + cmn.HAI_DISPLAY_HEIGHT/2;
                  var x1 = toX(p1.col) + cmn.HAI_DISPLAY_WIDTH/2;
                  var y2 = toY(p2.row) + cmn.HAI_DISPLAY_HEIGHT/2;
                  var x2 = toX(p2.col) + cmn.HAI_DISPLAY_WIDTH/2;
                  var rect = new g.FilledRect({
                    scene: scene,
                    x: Math.min(x1, x2) - 5,
                    y: Math.min(y1, y2) - 5,
                    width: (Math.max(x1, x2) - Math.min(x1, x2)) + 5,
                    height: (Math.max(y1, y2) - Math.min(y1, y2)) + 5,
                    cssColor: "orange"
                  });
                  shiningRoad.append(rect);
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
                      speaker.playHaiAllClear(scene, g.game.random);
                      cnt--;
                      if (cnt <= 0) {
                        scene.clearInterval(aciid);
                      }
                    }, 700);
                  }
                } else if (countErasable(scene, t, false) == 0) {
                  t = shuffleBoard(scene, t, haiContainer, setOperable);
                  // countErasable(scene, t, false);
                  speaker.playHaiShuffle(scene, g.game.random);
                }

              } else {
                // 消せない
                // 減点する
                if (remainTimeDecisec() > 0) { // 延長戦では点数を動かさないために残り時間を判定
                  g.game.vars.gameState.score = Math.max(0, g.game.vars.gameState.score - 1);
                  updateScoreLabel();
                }

                // 失敗音を鳴らす
                speaker.playHaiMiss(scene, g.game.random);

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
              speaker.playHaiSelectZ4(scene, g.game.random);
            else
              speaker.playHaiSelect(scene, g.game.random);

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
    scene.append(cover);

    var resetButton = new g.Sprite({
      scene: scene,
      src: scene.assets["restart"],
      x: g.game.width - 65,
      y: g.game.height - 100,
      width: 64,
      height:  64,
      touchable: true
    });
    resetButton.pointUp.add(function(ev) {
      if (remainTimeDecisec() > 0) {
        speaker.playRestart1(scene, g.game.random);
      } else {
        speaker.playRestart2(scene, g.game.random);
      }
      g.game.replaceScene(create());
    });
    scene.append(resetButton);



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
function createHaiImage(scene, s) {

  if (s[0] === 'm') {
    var n = Number(s[1]);
    var m = new g.Sprite({
      scene: scene,
      src: scene.assets["manzu"],
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
      src: scene.assets["pinzu"],
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
      src: scene.assets["souzu"],
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
        src: scene.assets["jihai1"],
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
        src: scene.assets["jihai2"],
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

module.exports.create = create;
