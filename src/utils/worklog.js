// 工时打卡核心工具函数

const STORAGE_KEY = 'worklog_records'
const SETTINGS_KEY = 'worklog_settings'
const ADJUST_KEY = 'worklog_adjust'
const DUE_OVERRIDE_KEY = 'worklog_due_override'

// ---------- 调休配置 ----------
// 内置国定节假日表（依据国务院办公厅《关于2026年部分节假日安排的通知》）
// makeups: 补班日出勤（原本周末但需上班）
// rests:   调休休息日（原本工作日但休息）
const ADJUST_VERSION = 'holiday-2026'
const BUILTIN_ADJUST = {
  version: ADJUST_VERSION,
  makeups: [
    '2026-01-04',
    '2026-02-14',
    '2026-02-28',
    '2026-05-09',
    '2026-09-20',
    '2026-10-10',
  ],
  rests: [
    '2026-01-01',
    '2026-01-02',
    '2026-02-16',
    '2026-02-17',
    '2026-02-18',
    '2026-02-19',
    '2026-02-20',
    '2026-02-23',
    '2026-04-06',
    '2026-05-01',
    '2026-05-04',
    '2026-05-05',
    '2026-06-19',
    '2026-09-25',
    '2026-10-01',
    '2026-10-02',
    '2026-10-05',
    '2026-10-06',
    '2026-10-07',
  ],
}

// 读取调休配置；本年度数据版本过期时自动重置为内置表
export function getAdjust() {
  const stored = uni.getStorageSync(ADJUST_KEY)
  if (!stored || stored.version !== ADJUST_VERSION) {
    return {
      version: ADJUST_VERSION,
      makeups: [...BUILTIN_ADJUST.makeups],
      rests: [...BUILTIN_ADJUST.rests],
    }
  }
  return stored
}

// 保存调休配置
export function saveAdjust(adjust) {
  uni.setStorageSync(
    ADJUST_KEY,
    Object.assign({ version: ADJUST_VERSION }, adjust),
  )
}

// 判断某天是否周末（0=周日 6=周六）
function isWeekend(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const day = new Date(y, m - 1, d).getDay()
  return day === 0 || day === 6
}

// 计算某月应出勤天数
// 应出勤 = 工作日（周一~周五）- 调休休息日 + 补班日
export function calcDueDays(year, month) {
  const daysInMonth = new Date(year, month, 0).getDate()
  const adjust = getAdjust()
  const makeupSet = new Set(adjust.makeups || [])
  const restSet = new Set(adjust.rests || [])
  let due = 0
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    if (makeupSet.has(ds)) {
      due++
      continue
    }
    if (isWeekend(ds)) continue
    if (restSet.has(ds)) continue
    due++
  }
  return due
}

// 读取某月手动覆盖的应出勤天数（无覆盖返回空字符串）
export function getDueOverride(year, month) {
  const map = uni.getStorageSync(DUE_OVERRIDE_KEY) || {}
  return map[`${year}-${month}`] || ''
}

// 设置某月应出勤覆盖值（传空则清除覆盖）
export function setDueOverride(year, month, value) {
  const map = uni.getStorageSync(DUE_OVERRIDE_KEY) || {}
  const key = `${year}-${month}`
  if (value === '' || value == null) {
    delete map[key]
  } else {
    map[key] = String(value)
  }
  uni.setStorageSync(DUE_OVERRIDE_KEY, map)
}

// 格式化日期为 YYYY-MM-DD
export function formatDate(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// 格式化时间为 HH:mm
export function formatTime(date = new Date()) {
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${h}:${min}`
}

// 获取星期文案
export function weekdayText(date = new Date()) {
  const week = ['日', '一', '二', '三', '四', '五', '六']
  return '星期' + week[date.getDay()]
}

// 读取全部打卡记录 { '2026-11-10': {...}, ... }
export function getAllRecords() {
  const data = uni.getStorageSync(STORAGE_KEY)
  return data || {}
}

// 保存全部记录
function saveRecords(records) {
  uni.setStorageSync(STORAGE_KEY, records)
}

// 获取某天记录
export function getRecord(dateStr) {
  return getAllRecords()[dateStr] || null
}

// 保存当天记录
export function saveRecord(dateStr, record) {
  const records = getAllRecords()
  records[dateStr] = record
  saveRecords(records)
}

// 打卡动作（type: 'on' | 'off'）返回新记录
export function punch(type, date = new Date()) {
  const dateStr = formatDate(date)
  const time = formatTime(date)
  let record = getRecord(dateStr) || { onDutyTime: '', offDutyTime: '' }
  if (type === 'on') {
    record.onDutyTime = time
  } else {
    record.offDutyTime = time
  }
  record.workHours = calcWorkHours(record.onDutyTime, record.offDutyTime)
  saveRecord(dateStr, record)
  return record
}

// 计算工时（小时），仅全天（fullDay=true）扣除午休时长
// 午休扣除时长 lunchHours 在设置中可配，0 表示不扣
export function calcWorkHours(onTime, offTime, fullDay = true) {
  if (!onTime || !offTime) return 0
  const [ohn, omin] = onTime.split(':').map(Number)
  const [offh, offmin] = offTime.split(':').map(Number)
  const onMinutes = ohn * 60 + omin
  let offMinutes = offh * 60 + offmin
  // 处理跨天（下午打卡到次日凌晨）
  if (offMinutes < onMinutes) offMinutes += 24 * 60
  let minutes = offMinutes - onMinutes

  // 午休扣除（仅全天班次）
  if (fullDay) {
    minutes -= (getSettings().lunchHours || 0) * 60
  }

  return Math.max(minutes / 60, 0)
}

// 读取设置
export function getSettings() {
  const data = uni.getStorageSync(SETTINGS_KEY)
  return Object.assign({ standardHours: 8, lunchHours: 1, goalHours: 10 }, data)
}

// 保存设置
export function saveSettings(settings) {
  uni.setStorageSync(SETTINGS_KEY, settings)
}

// 由月份得到当月有记录的日期列表（倒序）
export function getMonthRecords(year, month) {
  const records = getAllRecords()
  const prefix = `${year}-${String(month).padStart(2, '0')}-`
  const result = []
  Object.keys(records).forEach((key) => {
    if (key.startsWith(prefix)) {
      result.push(Object.assign({ date: key }, records[key]))
    }
  })
  result.sort((a, b) => (a.date < b.date ? 1 : -1))
  return result
}
