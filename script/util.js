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

/**
 * @param {Date} date
 */
module.exports.formatDate = function (date) {
  function pad(n) { return n.toString().padStart(2, '0'); }

  var year = date.getFullYear();
  var month = pad(date.getMonth() + 1); // 0〜11 → 1〜12
  var day = pad(date.getDate());
  var hour = pad(date.getHours());
  var minute = pad(date.getMinutes());
  var second = pad(date.getSeconds());
  return "" + year + "/" + month + "/" + day + " " + hour + ":" + minute + ":" + second
}

/**
 * @param {string} str 例: 2025/06/10 08:33:20 
 */
module.exports.parseDateString = function (str) {
  var datePart = str.split(' ')[0];
  var timePart = str.split(' ')[1];
  var ymd = datePart.split('/').map(Number);
  var hms = timePart.split(':').map(Number);
  return new Date(ymd[0], ymd[1] - 1, ymd[2], hms[0], hms[1], hms[2]);
}

module.exports.generateUUIDWithWeightedChecksum = function() {
  var bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant
  var weightedSum = 0;
  for (var i = 0; i < 14; i++) { weightedSum += (i + 1) * bytes[i]; }
  var checksum = weightedSum % 256;
  bytes[14] = checksum;
  bytes[15] = 0xff ^ checksum;
  // UUID風に整形
  var hex = Array.from(bytes).map(function(b){return b.toString(16).padStart(2, '0')}).join('');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20)
  ].join('-');
}

module.exports.validateUUIDWithWeightedChecksum = function(uuid) {
  var hex = uuid.replace(/-/g, '');
  if (hex.length !== 32) return false;
  var bytes = new Uint8Array(hex.match(/../g).map(function(h){ return parseInt(h, 16); }));
  var weightedSum = 0;
  for (var i = 0; i < 14; i++) { weightedSum += (i + 1) * bytes[i]; }
  var checksum = weightedSum % 256;
  return bytes[14] === checksum && bytes[15] === (0xff ^ checksum);
}
