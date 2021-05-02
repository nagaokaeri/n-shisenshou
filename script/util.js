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
  '0': '０', '1': '１', '2': '２', '3': '３', '4': '４', '5': '５', '6': '６', '7': '７', '8': '８', '9': '９',
  'A': 'Ａ', 'B': 'Ｂ', 'C': 'Ｃ', 'D': 'Ｄ', 'E': 'Ｅ', 'F': 'Ｆ', 'G': 'Ｇ', 'H': 'Ｈ', 'I': 'Ｉ', 'J': 'Ｊ', 'K': 'Ｋ', 'L': 'Ｌ', 'M': 'Ｍ', 'N': 'Ｎ', 'O': 'Ｏ', 'P': 'Ｐ', 'Q': 'Ｑ', 'R': 'Ｒ', 'S': 'Ｓ', 'T': 'Ｔ', 'U': 'Ｕ', 'V': 'Ｖ', 'W': 'Ｗ', 'X': 'Ｘ', 'Y': 'Ｙ', 'Z': 'Ｚ',
  'a': 'ａ', 'b': 'ｂ', 'c': 'ｃ', 'd': 'ｄ', 'e': 'ｅ', 'f': 'ｆ', 'g': 'ｇ', 'h': 'ｈ', 'i': 'ｉ', 'j': 'ｊ', 'k': 'ｋ', 'l': 'ｌ', 'm': 'ｍ', 'n': 'ｎ', 'o': 'ｏ', 'p': 'ｐ', 'q': 'ｑ', 'r': 'ｒ', 's': 'ｓ', 't': 'ｔ', 'u': 'ｕ', 'v': 'ｖ', 'w': 'ｗ', 'x': 'ｘ', 'y': 'ｙ', 'z': 'ｚ',
  ' ': '　', '!': '！', '"': '”', '#': '＃', '$': '＄', '%': '％', '&': '＆', '\'': '’', '(': '（', ')': '）',
  '*': '＊', '+': '＋', ',': '，', '-': '―', '.': '．', '/': '／', ':': '：', ';': '；',
  '<': '＜', '=': '＝', '>': '＞', '?': '？', '@': '＠', '[': '［', '\\': '＼', ']': '］', '^': '＾'
};
module.exports.toZenkaku = function(s) {
  s = "" + s;
  var res = "";
  for (var i = 0; i < s.length; i++) {
    var newChar = (s[i] in dict) ? dict[s[i]] : s[i];
    res += newChar;
  }
  return res;
};

module.exports.nullToDefault = function(val, defaultValue) {
  if (val === null || val === undefined) return defaultValue;
  return val;
}

module.exports.paddingLeft = function(s, len, ch) {
  s = String(s);
  while (s.length < len) s = ch + s;
  return s;
}

var alphabets = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
module.exports.trip = function(s) {
  s = String(s);
  var h = 0;
  for (var i = 0; i < s.length; i++) {
    h = (h * 10007 + 1 + s.charCodeAt(i)) % 2147483648;
  }
  var rnd = new g.XorshiftRandomGenerator(h);
  var t = '◆';
  for (var i = 0; i < 6; i++) {
    t += alphabets[ rnd.get(0, alphabets.length - 1) ];
  }
  return t;
};
