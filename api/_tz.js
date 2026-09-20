// タイムゾーン処理。出生時刻は出生地の現地時刻、「本日」は閲覧者の現地日付で扱う。
const tzLookup = require('tz-lookup');

const DEFAULT_ZONE = 'Asia/Tokyo';

function isValidZone(zone) {
  if (!zone || typeof zone !== 'string') return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone });
    return true;
  } catch (err) {
    return false;
  }
}

// 緯度経度 → IANA タイムゾーン名
function zoneForCoordinates(lat, lon) {
  try {
    return tzLookup(Number(lat), Number(lon));
  } catch (err) {
    return DEFAULT_ZONE;
  }
}

function partsIn(date, zone) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: zone, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
  const out = {};
  for (const p of fmt.formatToParts(date)) out[p.type] = p.value;
  return out;
}

// 指定ゾーンにおける date の UTC オフセット（分）
function offsetMinutes(date, zone) {
  const p = partsIn(date, zone);
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return Math.round((asUtc - date.getTime()) / 60000);
}

function pad(n) { return String(n).padStart(2, '0'); }

function formatOffset(minutes) {
  const sign = minutes < 0 ? '-' : '+';
  const abs = Math.abs(minutes);
  return `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

// 現地の暦日・時刻（YYYY-MM-DD, HH:mm[:ss]）を、そのゾーンのオフセット付き ISO8601 文字列にする
function localDateTimeToIso(dob, tob, zone) {
  const z = isValidZone(zone) ? zone : DEFAULT_ZONE;
  const time = tob && tob.length === 5 ? `${tob}:00` : (tob || '12:00:00');
  const [y, m, d] = dob.split('-').map(Number);
  const [hh, mm, ss] = time.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm, ss || 0);
  // 壁時計時刻→UTC は 2 回の反復でほぼ確定する（DST 切替日の境界も吸収）
  let off = offsetMinutes(new Date(guess), z);
  off = offsetMinutes(new Date(guess - off * 60000), z);
  return `${dob}T${time}${formatOffset(off)}`;
}

// 現在時刻を指定ゾーンのオフセット付き ISO8601 文字列にする
function nowIsoIn(zone, date = new Date()) {
  const z = isValidZone(zone) ? zone : DEFAULT_ZONE;
  const off = offsetMinutes(date, z);
  const p = partsIn(date, z);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}${formatOffset(off)}`;
}

// 指定ゾーンにおける今日の暦日（YYYY-MM-DD）
function todayIn(zone, date = new Date()) {
  return nowIsoIn(zone, date).slice(0, 10);
}

module.exports = { DEFAULT_ZONE, isValidZone, zoneForCoordinates, localDateTimeToIso, nowIsoIn, todayIn };
