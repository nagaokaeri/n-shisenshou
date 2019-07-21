"use strict";

var cmn = require("./Common");
var util = require("./util");
var speaker = require("./speaker");

/** NOTE: このファイルで唯一の export 関数 */
function create(assetsScene) {
  var scene = new g.Scene({ game: g.game });
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
      }
    }
    function remainTimeDecisec() {
      return Math.floor(cmn.data.gameTimeLimit * 10 - cmn.data.frameCount / g.game.fps * 10);
    }

    function updateFrameCount() {
      ++cmn.data.frameCount;
    }
    function updateHandler() {

      updateFrameCount();

      if (remainTimeDecisec() <= 0) {
        // 終了時処理

        setOperable(false);
        countErasable(scene, t, true); // ゲーム終了後、消せる場所を表示

        scene.update.remove(updateHandler); // タイムアウトになったら毎フレーム処理自体を止める

        // 結果画面を表示
        displayResult(scene, assetsScene);

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

    // デバッグ用
    // for (var i = 0; i < 8*17; i++) list.push('z5');
    // list[0] = 'm1';
    // list[1] = 'z2';
    // list[17] = 'z2';
    // list[18] = 'm1';

    var t = util.createArray(cmn.BOARD_HEIGHT, cmn.BOARD_WIDTH);
    for (var i = 0; i < cmn.BOARD_HEIGHT; i++) {
      for (var j = 0; j < cmn.BOARD_WIDTH; j++) {
        t[i][j] = {
          label: undefined,
          ref: undefined,
          overlay: undefined, // truthly のときその牌が選択状態であることを表す
          help: undefined
        }
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
        img.local = true;
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
            if (ti.overlay) {
              // 同一の牌をもういちど選択したら、選択解除
              ti.overlay.destroy(); ti.overlay = undefined;
              t.selectedPos = undefined;
            } else {
              // 異なる２つの牌を選択した

              // 消せるか判定
              var path = calcPath(t, t.selectedPos, {row:thisImg.tag.row, col:thisImg.tag.col});
              if (path.length > 0) {
                // 消せた。
                g.game.raiseEvent(new g.MessageEvent({
                  type: 'haiErase',
                  pos1: { row: si.ref.tag.row, col: si.ref.tag.col },
                  pos2: { row: ti.ref.tag.row, col: ti.ref.tag.col },
                  path: path
                }));

              } else {
                // 消せない
                // 失敗音を鳴らす
                speaker.playHaiMiss(assetsScene, cmn.data.localRandom);
                // 選択解除する
                si.overlay.destroy(); si.overlay = undefined;
                t.selectedPos = undefined;
              }
            }
          } else {
            // 1牌目を選択した
            speaker.playHaiSelect(assetsScene, cmn.data.localRandom);
            var rect = new g.FilledRect({
              scene: scene,
              x: thisImg.x,
              y: thisImg.y - cmn.HAI_DISPLAY_MARGIN_Y,
              width: thisImg.width,
              height:  thisImg.height + cmn.HAI_DISPLAY_MARGIN_Y,
              local: true,
              opacity: 0.25,
              cssColor: "green"
            });
            scene.append(rect);
            ti.overlay = rect;
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

    setOperable(false); // 最初は操作不可
    scene.setTimeout(function() {
      t = shuffleBoard(scene, t, haiContainer, setOperable);
      // countErasable(scene, t, false);
    }, 600);

    function eraseHai(pos1, pos2, path)  {

      var ti = t[pos2.row][pos2.col]; // 今クリックされた牌
      var si = t[pos1.row][pos1.col]; // ひとつ前にクリックされた牌

      if (ti.overlay) { ti.overlay.destroy(); ti.overlay = undefined; }
      if (ti.ref) { ti.ref.destroy(); ti.ref = undefined; }
      ti.label = undefined;

      if (si.overlay) { si.overlay.destroy(); si.overlay = undefined; }
      if (si.ref) { si.ref.destroy(); si.ref = undefined; }
      si.label = undefined;

      t.selectedPos = undefined;

      eraseCount++;
      if (remainTimeDecisec() > 0) { // 延長戦では点数を動かさないために残り時間を判定
        g.game.vars.gameState.score += 100 * (1 + Math.floor(eraseCount/5));
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
        // 時間がある間ゲームを最初から繰り返す
        speaker.playHaiAllClear(assetsScene, cmn.data.random);
        g.game.replaceScene(create(assetsScene));

      } else if (countErasable(scene, t, false) == 0) {
        var new_t = shuffleBoard(scene, t, haiContainer, setOperable);
        return new_t;
        // countErasable(scene, t, false);
      }
      return t;
    }

    scene.message.add(function(msg) {
      if (msg.data && msg.data.type === 'haiErase') {
        if (!(msg.player.id in cmn.data.playerScore)) {
          cmn.data.playerScore[msg.player.id] = 0;
          cmn.data.playerName[msg.player.id] = msg.player.name;
        }
        cmn.data.playerScore[msg.player.id] += 1;
        speaker.playHaiErase(assetsScene, cmn.data.random);
        t = eraseHai(msg.data.pos1, msg.data.pos2, msg.data.path);
      }
    });

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

  var old_pos, new_t;
  for (var iter = 0; iter < 100; iter++) { // 無限ループはしないはずだが念のため一定回数で抜ける。
    var list = [];
    old_pos = util.createArray(cmn.BOARD_HEIGHT, cmn.BOARD_WIDTH);
    new_t = util.createArray(cmn.BOARD_HEIGHT, cmn.BOARD_WIDTH);

    t.selectedPos = undefined;
    new_t.selectedPos = undefined;

    for (var row = 0; row < cmn.BOARD_HEIGHT; row++) {
      for (var col = 0; col < cmn.BOARD_WIDTH; col++) {
        var ti = t[row][col];
        if (ti.label) {
          list.push({row: row, col: col});
          if (ti.overlay) { ti.overlay.destroy(); ti.overlay = undefined; }
          if (ti.hint) { util.destroyAll(ti.hint); ti.hint = []; }
        } else {
          new_t[row][col] = t[row][col];
        }
      }
    }
    if (list.length === 0) break;
    util.shuffle(list, cmn.data.random);
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

    if (countErasable(null, new_t, false) > 0) break;
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

function displayResult(scene, assetsScene) {

  scene.append(new g.FilledRect({
    scene: scene,
    cssColor: "black",
    opacity: 0.7,
    width: g.game.width,
    height: g.game.height,
    x: 0,
    y: 0
  }));

  // BitmapFont を生成
  var glyph = JSON.parse(assetsScene.assets["mplus1c_regular_jis1_glyph"].data);
  var font = new g.BitmapFont({
    src: assetsScene.assets["mplus1c_regular_jis1"],
    map: glyph.map,
    defaultGlyphWidth: glyph.width,
    defaultGlyphHeight: glyph.height,
    missingGlyph: glyph.missingGlyph
  });

  var scoreLabel = new g.Label({
    scene: scene,
    font: font,
    textColor: "white",
    fontSize: 40,
    x: 10,
    y: 10,
    text: util.toZenkaku("スコア：" + g.game.vars.gameState.score),
  });

  var yourScoreLabel = new g.Label({
    scene: scene,
    font: font,
    textColor: "white",
    fontSize: 40,
    x: g.game.width / 2 - 200,
    y: g.game.height - 50,
    text: util.toZenkaku("あなたが消した回数：" + (cmn.data.playerScore[g.game.selfId] || 0)),
  });

  var scores = [];
  for (var playerId in cmn.data.playerScore) {
    if (cmn.data.playerScore[playerId] > 0) {
      scores.push({
        id: playerId,
        score: cmn.data.playerScore[playerId],
        name: cmn.data.playerName[playerId] || playerId
      });
    }
  }
  scores.sort(function(a,b){ return -(a.score - b.score); });
  for (var i = 0; i < 5; i++) {
    var text = '';
    if (i < scores.length && scores[i].score > 0) {
      text = (i+1)+"位："+ scores[i].score +"回　" + scores[i].name + "さん";
    }

    scene.append(new g.Label({
      scene: scene,
      font: font,
      textColor: "white",
      fontSize: 40,
      x: 30,
      y: 70 + 50 * (i),
      text: util.toZenkaku(text)
    }));
  }


  scene.append(scoreLabel);
  scene.append(yourScoreLabel);

}


module.exports.create = create;
