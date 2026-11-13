/**
 * 纯 Node 图标生成器（零第三方依赖）
 * 自绘几何图形 -> 多点采样抗锯齿 -> 编码 PNG
 * 输出到 src/static/icons/
 */
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

/* ---------------- PNG 编码 ---------------- */
function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
  }
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const t = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0)
  return Buffer.concat([len, t, data, crc])
}
function encodePNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  const raw = Buffer.alloc(height * (1 + width * 4))
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 4)] = 0 // filter none
    rgba.copy(raw, y * (1 + width * 4) + 1, y * width * 4, (y + 1) * width * 4)
  }
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/* ---------------- 几何测试 ---------------- */
const segDist = (px, py, x1, y1, x2, y2) => {
  const dx = x2 - x1
  const dy = y2 - y1
  const l2 = dx * dx + dy * dy
  let t = l2 ? ((px - x1) * dx + (py - y1) * dy) / l2 : 0
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy))
}
const inRRect = (px, py, x, y, w, h, rad) => {
  if (px < x || px > x + w || py < y || py > y + h) return false
  const rx = Math.min(rad, w / 2)
  const ry = Math.min(rad, h / 2)
  if (px >= x + rx && px <= x + w - rx) return true
  if (py >= y + ry && py <= y + h - ry) return true
  const cx = Math.min(Math.max(px, x + rx), x + w - rx)
  const cy = Math.min(Math.max(py, y + ry), y + h - ry)
  return (px - cx) * (px - cx) + (py - cy) * (py - cy) <= rx * rx
}
function inPoly(px, py, pts) {
  let inside = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i][0]
    const yi = pts[i][1]
    const xj = pts[j][0]
    const yj = pts[j][1]
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

/* ---------------- 图形基元（返回测试函数） ---------------- */
const capLine = (x1, y1, x2, y2, w) => (px, py) =>
  segDist(px, py, x1, y1, x2, y2) <= w / 2
const ring = (cx, cy, r, w) => (px, py) =>
  Math.abs(Math.hypot(px - cx, py - cy) - r) <= w / 2
const disc = (cx, cy, r) => (px, py) => Math.hypot(px - cx, py - cy) <= r
const rrectFill = (x, y, w, h, rad) => (px, py) =>
  inRRect(px, py, x, y, w, h, rad)
const rrectStroke = (x, y, w, h, rad, stroke) => (px, py) =>
  inRRect(px, py, x, y, w, h, rad) &&
  !inRRect(px, py, x + stroke, y + stroke, w - 2 * stroke, h - 2 * stroke, rad)
const polyFill = (pts) => (px, py) => inPoly(px, py, pts)
const arcBand = (cx, cy, r, w, a0, a1) => (px, py) => {
  const d = Math.hypot(px - cx, py - cy)
  if (Math.abs(d - r) > w / 2) return false
  let a0n = a0
  let a1n = a1 < a0 ? a1 + 2 * Math.PI : a1
  let a = Math.atan2(py - cy, px - cx)
  while (a < a0n) a += 2 * Math.PI
  return a <= a1n
}

const union =
  (...fns) =>
  (px, py) =>
    fns.some((f) => f(px, py))

/* ---------------- 图标定义（24×24 设计坐标） ---------------- */
const CALENDAR = () =>
  union(
    rrectStroke(2.5, 4.5, 19, 16, 2.4, 1.7),
    capLine(7, 1.8, 7, 5.5, 1.7),
    capLine(17, 1.8, 17, 5.5, 1.7),
    capLine(2.8, 9, 21.2, 9, 1.5),
    disc(7, 14, 1.2),
    disc(12, 14, 1.2),
    disc(17, 14, 1.2),
    disc(7, 17.5, 1.2),
    disc(12, 17.5, 1.2),
    disc(17, 17.5, 1.2),
  )
const CALENDAR_CHECK = () =>
  union(
    rrectStroke(2.5, 4.5, 19, 16, 2.4, 1.7),
    capLine(7, 1.8, 7, 5.5, 1.7),
    capLine(17, 1.8, 17, 5.5, 1.7),
    capLine(2.8, 9, 21.2, 9, 1.5),
    capLine(7, 13.5, 10.5, 17, 2.2),
    capLine(10.5, 17, 17.5, 9.2, 2.2),
  )
const CLOCK = () =>
  union(
    ring(12, 12, 9, 1.8),
    capLine(12, 12, 12, 6.3, 2),
    capLine(12, 12, 15.2, 12.8, 2),
    disc(12, 12, 1.3),
  )
const BOLT = () =>
  polyFill([
    [13.8, 2.8],
    [15.5, 3.5],
    [11.2, 14.2],
    [13, 14.2],
    [8.6, 21.2],
    [6.8, 20.4],
    [10.6, 9.6],
    [9.4, 9.6],
  ])
const GAUGE = () =>
  union(
    rrectFill(4.4, 10, 3.8, 9, 1.1),
    rrectFill(10.1, 6.5, 3.8, 12.5, 1.1),
    rrectFill(15.8, 8.5, 3.8, 10.5, 1.1),
  )
const TARGET = () =>
  union(ring(12, 12, 8, 1.7), ring(12, 12, 4.8, 1.5), disc(12, 12, 1.8))
const SIGNIN = () =>
  union(
    capLine(17, 5, 17, 19, 1.8),
    capLine(7, 12, 13, 12, 1.8),
    polyFill([
      [13.2, 8.8],
      [13.2, 15.2],
      [17.4, 12],
    ]),
  )
const SIGNOUT = () =>
  union(
    capLine(7, 5, 7, 19, 1.8),
    capLine(17, 12, 11, 12, 1.8),
    polyFill([
      [10.8, 8.8],
      [10.8, 15.2],
      [6.6, 12],
    ]),
  )
const CHECK = () =>
  union(capLine(6, 12.5, 10.5, 17, 2.6), capLine(10.5, 17, 17.8, 8, 2.6))
const LIST = () =>
  union(
    capLine(5, 7, 19, 7, 1.9),
    capLine(5, 12, 19, 12, 1.9),
    capLine(5, 17, 19, 17, 1.9),
  )
const SLIDERS = () =>
  union(
    capLine(4, 7, 19, 7, 1.7),
    disc(15, 7, 2.6),
    capLine(4, 12, 19, 12, 1.7),
    disc(9, 12, 2.6),
    capLine(4, 17, 19, 17, 1.7),
    disc(13.5, 17, 2.6),
  )
const COFFEE = () =>
  union(
    rrectStroke(4, 9.5, 11.5, 8.5, 2, 1.7),
    arcBand(15.6, 13, 3.6, 1.7, -0.4, 0.4),
    capLine(8.5, 7.8, 8, 5.2, 1.6),
    capLine(12, 7.8, 12.5, 5.2, 1.6),
  )

/* ---------------- 渲染 ---------------- */
function render(fn, size, [r, g, b]) {
  const scale = size / 24
  const S = 4 // 4x4 超采样
  const rgba = Buffer.alloc(size * size * 4)
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let hit = 0
      for (let sy = 0; sy < S; sy++) {
        for (let sx = 0; sx < S; sx++) {
          const dx = (px + (sx + 0.5) / S) / scale
          const dy = (py + (sy + 0.5) / S) / scale
          if (fn(dx, dy)) hit++
        }
      }
      const a = hit / (S * S)
      const o = (py * size + px) * 4
      rgba[o] = Math.round(r + (255 - r) * (1 - a))
      rgba[o + 1] = Math.round(g + (255 - g) * (1 - a))
      rgba[o + 2] = Math.round(b + (255 - b) * (1 - a))
      rgba[o + 3] = Math.round(255 * a)
    }
  }
  return encodePNG(size, size, rgba)
}

/* ---------------- 输出 ---------------- */
const outDir = path.join(__dirname, '..', 'src', 'static', 'icons')
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

const INK = [0x6d, 0x8c, 0xbf] // 页面内图标主色（柔和蓝）
const TAB_OFF = [0x9b, 0xb4, 0xcf] // tabBar 未选中
const TAB_ON = [0x2e, 0x80, 0xd4] // tabBar 选中

const icons = {
  calendar: CALENDAR,
  'calendar-check': CALENDAR_CHECK,
  clock: CLOCK,
  bolt: BOLT,
  gauge: GAUGE,
  target: TARGET,
  signin: SIGNIN,
  signout: SIGNOUT,
  check: CHECK,
  list: LIST,
  sliders: SLIDERS,
  coffee: COFFEE,
}

// 页面内图标：128px
for (const [name, fn] of Object.entries(icons)) {
  fs.writeFileSync(path.join(outDir, `${name}.png`), render(fn(), 128, INK))
  console.log('✓', name + '.png')
}

// tabBar 图标：81px（选中 / 未选中）
const tab = {
  check: CHECK,
  list: LIST,
  sliders: SLIDERS,
}
for (const [name, fn] of Object.entries(tab)) {
  fs.writeFileSync(
    path.join(outDir, `tab-${name}-off.png`),
    render(fn(), 81, TAB_OFF),
  )
  fs.writeFileSync(
    path.join(outDir, `tab-${name}-on.png`),
    render(fn(), 81, TAB_ON),
  )
  console.log('✓ tab-' + name + ' (off/on)')
}
console.log('done')
