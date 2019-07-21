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


var dict = {
  '0': '０',
  '1': '１',
  '2': '２',
  '3': '３',
  '4': '４',
  '5': '５',
  '6': '６',
  '7': '７',
  '8': '８',
  '9': '９'
};
module.exports.toZenkaku = function(s) {
  var res = "";
  for (var i = 0; i < s.length; i++) {
    var newChar = (s[i] in dict) ? dict[s[i]] : s[i];
    res += newChar;
  }
  return res;
};
