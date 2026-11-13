// 工时打卡核心工具函数

import { RecordApi, SettingsApi, DueOverrideApi } from './api.js'

const ADJUST_KEY = 'worklog_adjust'

// ---------- 后端数据缓存（内存态，页面加载时由 api 拉取）----------
let recordsCache = {} // { 'YYYY-MM-DD': record }
let settingsCache = { standardHours: 8, lunchHours: 1, goalHours: 10 }
let dueOverrideCache = {} // { 'YYYY-MM': '21' }

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

// 读取某月手动覆盖的应出勤天数（从后端读取，返回 '' 表示无覆盖）
export async function loadDueOverride(year, month) {
  try {
    const key = `${year}-${month}`
    const res = await DueOverrideApi.get(year, month)
    dueOverrideCache[key] =
      res && (res.value || res.value === 0) ? res.value : ''
  } catch (e) {
    dueOverrideCache[`${year}-${month}`] = ''
  }
  return dueOverrideCache[`${year}-${month}`]
}

// 读取某月手动覆盖值（同步读缓存）
export function getDueOverride(year, month) {
  return dueOverrideCache[`${year}-${month}`] || ''
}

// 设置某月应出勤覆盖值（传空则清除覆盖，与后端 PUT 同步）
export async function setDueOverride(year, month, value) {
  const key = `${year}-${month}`
  const finalValue = value === '' || value == null ? '' : String(value)
  try {
    await DueOverrideApi.save(year, month, finalValue)
    if (finalValue === '') {
      delete dueOverrideCache[key]
    } else {
      dueOverrideCache[key] = finalValue
    }
  } catch (e) {
    uni.showToast({ title: '保存失败', icon: 'none' })
  }
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

// 读取全部打卡记录（内存缓存）
export function getAllRecords() {
  return { ...recordsCache }
}

// 获取某天记录（同步读缓存）
export function getRecord(dateStr) {
  return recordsCache[dateStr] || null
}

// 从后端拉取某月考勤记录，更新缓存并返回该月记录数组（倒序）
export async function loadMonthRecords(year, month) {
  const key = `${year}-${String(month).padStart(2, '0')}-`
  try {
    const res = await RecordApi.getByMonth(year, month)
    const map = res && res.records ? res.records : {}
    // 先清掉该月旧缓存，再并入本次结果
    Object.keys(recordsCache).forEach((k) => {
      if (k.startsWith(key)) delete recordsCache[k]
    })
    Object.assign(recordsCache, map)
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
  return getMonthRecords(year, month)
}

// 保存当天记录（新增、编辑均走此接口，按 date 覆盖）
export async function saveRecord(dateStr, record) {
  try {
    await RecordApi.save(dateStr, record)
    recordsCache[dateStr] = record
  } catch (e) {
    uni.showToast({ title: '保存失败', icon: 'none' })
  }
}

// 删除某天记录
export async function deleteRecord(dateStr) {
  try {
    await RecordApi.remove(dateStr)
    if (recordsCache[dateStr]) {
      delete recordsCache[dateStr]
    }
    return true
  } catch (e) {
    uni.showToast({ title: '删除失败', icon: 'none' })
    return false
  }
}

// 打卡动作（type: 'on' | 'off'）返回新记录
export async function punch(type, date = new Date()) {
  const dateStr = formatDate(date)
  const time = formatTime(date)
  let record = recordsCache[dateStr] || { onDutyTime: '', offDutyTime: '' }
  if (type === 'on') {
    record.onDutyTime = time
  } else {
    record.offDutyTime = time
  }
  record.workHours = calcWorkHours(record.onDutyTime, record.offDutyTime)
  await saveRecord(dateStr, record)
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

// 从后端拉取设置，更新缓存
export async function loadSettings() {
  try {
    const res = await SettingsApi.get()
    settingsCache = Object.assign(
      { standardHours: 8, lunchHours: 1, goalHours: 10 },
      res || {},
    )
  } catch (e) {
    settingsCache = { standardHours: 8, lunchHours: 1, goalHours: 10 }
  }
  return settingsCache
}

// 读取设置（同步读缓存）
export function getSettings() {
  return { ...settingsCache }
}

// 保存设置（与后端同步）
export async function saveSettings(settings) {
  const next = Object.assign(
    { standardHours: 8, lunchHours: 1, goalHours: 10 },
    settings,
  )
  try {
    await SettingsApi.save({
      standardHours: next.standardHours,
      lunchHours: next.lunchHours,
      goalHours: next.goalHours,
    })
    settingsCache = next
  } catch (e) {
    uni.showToast({ title: '保存失败', icon: 'none' })
  }
}

// 由月份得到当月有记录的日期列表（倒序，同步读缓存）
export function getMonthRecords(year, month) {
  const prefix = `${year}-${String(month).padStart(2, '0')}-`
  const result = []
  Object.keys(recordsCache).forEach((key) => {
    if (key.startsWith(prefix)) {
      result.push(Object.assign({ date: key }, recordsCache[key]))
    }
  })
  result.sort((a, b) => (a.date < b.date ? 1 : -1))
  return result
}
