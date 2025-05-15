window.gLocalAssetContainer["util"] = function(g) { (function(exports, require, module, __filename, __dirname) {
module.exports.createArray = function(n, m) {
  var i = 0, a = [];
  for (i = 0; i < n; i++) a.push(new Array(m));
  return a;
};

module.exports.shuffle = function(a, random) {
  var i, j, tmp;
  if (a && a.length >= 2) {
    for (i = a.length - 1; i >= 1; i--) {
      j = random.get(0, i);
      tmp = a[i];
      a[i] = a[j];
      a[j] = tmp;
    }
  }
  return a;
};

/** リストの要素をランダムにひとつ選択する */
module.exports.choice = function(a, random) {
  return a[random.get(0, a.length-1)];
};

module.exports.destroyAll = function(a) {
  if (a && a.length > 0) for (var i = 0; i < a.length; i++) a[i].destroy();
};


})(g.module.exports, g.module.require, g.module, g.filename, g.dirname);
}