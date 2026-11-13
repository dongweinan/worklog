<template>
  <view class="page">
    <!-- 本月概况 -->
    <view class="glass-card">
      <view class="glass-head">
        <text class="glass-title">本月概况</text>
        <text class="glass-month">{{ monthTitle }}</text>
      </view>
      <view class="overview-grid">
        <view class="overview-cell">
          <view class="overview-cell-inner">
            <image
              class="ov-icon"
              src="/static/icons/calendar.png"
              mode="aspectFit"
            ></image>
            <text class="ov-value">{{ dueDays }}</text>
            <text class="ov-label">应出勤天数</text>
          </view>
        </view>

        <view class="overview-cell">
          <view class="overview-cell-inner">
            <image
              class="ov-icon"
              src="/static/icons/calendar-check.png"
              mode="aspectFit"
            ></image>
            <text class="ov-value">{{ days }}</text>
            <text class="ov-label">实际出勤</text>
          </view>
        </view>

        <view class="overview-cell">
          <view class="overview-cell-inner">
            <image
              class="ov-icon"
              src="/static/icons/clock.png"
              mode="aspectFit"
            ></image>
            <text class="ov-value">{{ totalHours }}</text>
            <text class="ov-label">累计工时</text>
          </view>
        </view>
        <view class="overview-cell">
          <view class="overview-cell-inner">
            <image
              class="ov-icon"
              src="/static/icons/bolt.png"
              mode="aspectFit"
            ></image>
            <text class="ov-value">{{ overtimeText }}</text>
            <text class="ov-label">加班总时长</text>
          </view>
        </view>
        <view class="overview-cell">
          <view class="overview-cell-inner">
            <image
              class="ov-icon"
              src="/static/icons/gauge.png"
              mode="aspectFit"
            ></image>
            <text class="ov-value">{{ avgHours }}</text>
            <text class="ov-label">平均工时</text>
          </view>
        </view>
        <view class="overview-cell">
          <view class="overview-cell-inner">
            <image
              class="ov-icon"
              src="/static/icons/target.png"
              mode="aspectFit"
            ></image>
            <text class="ov-value">{{ needHours }}</text>
            <text class="ov-label">达标需补工时</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 添加考勤记录 -->
    <view class="glass-card">
      <text class="glass-title">添加考勤记录</text>
      <view class="add-row">
        <view class="add-label-wrap">
          <image
            class="add-icon"
            src="/static/icons/calendar.png"
            mode="aspectFit"
          ></image>
          <text class="add-label">日期</text>
        </view>
        <picker mode="date" :value="form.date" @change="onDateChange">
          <text class="add-value">{{ form.date }}</text>
        </picker>
      </view>
      <view class="add-row">
        <view class="add-label-wrap">
          <image
            class="add-icon"
            src="/static/icons/signin.png"
            mode="aspectFit"
          ></image>
          <text class="add-label">上班时间</text>
        </view>
        <picker
          mode="time"
          :value="form.onDutyTime"
          @change="onTimeChange('onDutyTime', $event)"
        >
          <text class="add-value">{{ form.onDutyTime }}</text>
        </picker>
      </view>
      <view class="add-row">
        <view class="add-label-wrap">
          <image
            class="add-icon"
            src="/static/icons/signout.png"
            mode="aspectFit"
          ></image>
          <text class="add-label">下班时间</text>
        </view>
        <picker
          mode="time"
          :value="form.offDutyTime"
          @change="onTimeChange('offDutyTime', $event)"
        >
          <text class="add-value">{{ form.offDutyTime }}</text>
        </picker>
      </view>
      <view class="add-row">
        <view class="add-label-wrap">
          <image
            class="add-icon"
            src="/static/icons/calendar-check.png"
            mode="aspectFit"
          ></image>
          <text class="add-label">出勤天数</text>
        </view>
        <picker
          :range="attendanceOptions"
          :value="attendanceIndex"
          @change="onAttendanceChange"
        >
          <text class="add-value">{{ currentAttendance }}</text>
        </picker>
      </view>
      <button class="add-btn" @tap="saveEntry">保存记录</button>
    </view>

    <!-- 考勤记录 -->
    <view class="glass-card">
      <view class="glass-head">
        <text class="glass-title">考勤记录</text>
        <view class="head-right">
          <text class="glass-more" @tap="goRecord">查看更多 ›</text>
        </view>
      </view>
      <view class="entry-list" v-if="displayList.length">
        <view class="entry-row" v-for="item in displayList" :key="item.date">
          <view class="entry-date-col">
            <text class="entry-date">{{ dayNum(item.date) }}</text>
            <text class="entry-week">{{ weekOf(item.date) }}</text>
          </view>
          <view class="entry-body">
            <view class="entry-time">
              <text class="t">{{ formatTimeStr(item.onDutyTime) }}</text>
              <text class="t">-</text>
              <text class="t">{{ formatTimeStr(item.offDutyTime) }}</text>
            </view>
            <view class="entry-note" v-if="item.workHours > 0">
              <text class="entry-att-btn">{{ attText(item.attendance) }}</text>
              当日工时 {{ Number(item.workHours).toFixed(2) }} 小时
            </view>
          </view>
          <view class="entry-hours">
            <text class="num">{{ Number(item.workHours).toFixed(1) }}</text>
            <text class="unit">H</text>
          </view>
        </view>
      </view>
      <view class="entry-empty" v-else>本月还没有考勤记录</view>
    </view>
  </view>
</template>

<script>
import {
  formatDate,
  getRecord,
  getMonthRecords,
  loadMonthRecords,
  getSettings,
  loadSettings,
  calcDueDays,
  getDueOverride,
  loadDueOverride,
  calcWorkHours,
  saveRecord,
} from '@/utils/worklog.js'

export default {
  data() {
    const now = new Date()
    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      list: [],
      dueOverride: '',
      attendanceOptions: ['加班', '半天', '全天'],
      attendanceIndex: 2,
      form: {
        date: formatDate(now),
        onDutyTime: '09:00',
        offDutyTime: '18:00',
      },
      standardHours: 8,
      goalHours: 10,
    }
  },
  computed: {
    monthTitle() {
      return `${this.year}年${this.month}月`
    },
    currentAttendance() {
      return this.attendanceOptions[this.attendanceIndex]
    },
    // 首页考勤记录仅展示最近 3 条（list 已按日期倒序）
    displayList() {
      return this.list.slice(0, 3)
    },
    dueDays() {
      return this.dueOverride !== ''
        ? this.dueOverride
        : calcDueDays(this.year, this.month)
    },
    days() {
      return this.list.reduce((sum, r) => {
        const a = r.attendance
        // 加班/半天按比例，全天为 1；无字段的历史记录按 1 天算
        if (a === 0) return sum
        if (a === 0.5) return sum + 0.5
        return sum + (r.onDutyTime ? 1 : 0)
      }, 0)
    },
    totalHours() {
      return this.list
        .reduce((sum, r) => sum + Number(r.workHours || 0), 0)
        .toFixed(1)
    },
    totalHoursNum() {
      return this.list.reduce((sum, r) => sum + Number(r.workHours || 0), 0)
    },
    avgHours() {
      const daysNum = Number(this.days) || 0
      if (daysNum <= 0) return '0.0'
      return (this.totalHoursNum / daysNum).toFixed(1)
    },
    needHours() {
      // 每日需补加班 = 达标工时 - 标准工时
      // 本月应补加班 = 每日需补 × 应出勤天数 - 已加班总时长
      const due = Number(this.dueDays) || 0
      const goal = this.goalHours || 10
      const std = this.standardHours || 8
      if (goal <= std) {
        // 达标不高于标准工时，无需补加班
        return '已达标'
      }
      const need = due * (goal - std) - this.overTimeNum
      return need > 0 ? need.toFixed(1) : '0.0'
    },
    overTimeNum() {
      let total = 0
      this.list.forEach((r) => {
        const h = Number(r.workHours || 0)
        // 出勤类型为「加班」时，当天全部工时均计入加班时长
        if (r.attendance === 0) {
          total += h
        } else if (h > this.standardHours) {
          total += h - this.standardHours
        }
      })
      return total
    },
    overtimeText() {
      return this.overTimeNum.toFixed(1)
    },
  },
  onLoad() {
    this.standardHours = getSettings().standardHours || 8
    this.goalHours = getSettings().goalHours || 10
  },
  async onShow() {
    await loadSettings()
    this.standardHours = getSettings().standardHours || 8
    this.goalHours = getSettings().goalHours || 10
    await this.refresh()
  },
  methods: {
    goRecord() {
      // 记录页是 tabBar 页面，需用 switchTab 跳转
      uni.switchTab({ url: '/pages/record/record' })
    },
    async refresh() {
      await loadMonthRecords(this.year, this.month)
      await loadDueOverride(this.year, this.month)
      this.list = getMonthRecords(this.year, this.month)
      this.dueOverride = getDueOverride(this.year, this.month)
    },
    onDateChange(e) {
      this.form.date = e.detail.value
      this.applyRecordToForm()
    },
    onTimeChange(field, e) {
      this.form[field] = e.detail.value
    },
    onAttendanceChange(e) {
      this.attendanceIndex = Number(e.detail.value)
    },
    applyRecordToForm() {
      const r = getRecord(this.form.date)
      this.form.onDutyTime = r && r.onDutyTime ? r.onDutyTime : '09:00'
      this.form.offDutyTime = r && r.offDutyTime ? r.offDutyTime : '18:00'
      if (r && r.attendance === 0) this.attendanceIndex = 0
      else if (r && r.attendance === 0.5) this.attendanceIndex = 1
      else this.attendanceIndex = 2
    },
    async saveEntry() {
      const attendance = [0, 0.5, 1][this.attendanceIndex]
      const fullDay = attendance === 1
      const record = {
        onDutyTime: this.form.onDutyTime,
        offDutyTime: this.form.offDutyTime,
        attendance,
        workHours: calcWorkHours(
          this.form.onDutyTime,
          this.form.offDutyTime,
          fullDay,
        ),
        note: '',
      }
      await saveRecord(this.form.date, record)
      this.form.date = formatDate()
      this.applyRecordToForm()
      await this.refresh()
      uni.showToast({ title: '已保存', icon: 'success' })
    },
    dayNum(dateStr) {
      return Number(dateStr.split('-')[2])
    },
    weekOf(dateStr) {
      const [, m, d] = dateStr.split('-').map(Number)
      const date = new Date(this.year, m - 1, d)
      const week = ['日', '一', '二', '三', '四', '五', '六']
      return '周' + week[date.getDay()]
    },
    formatTimeStr(t) {
      return t || '--:--'
    },
    attText(a) {
      if (a === 0) return '加班'
      if (a === 0.5) return '半天'
      return '全天'
    },
  },
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: linear-gradient(180deg, #eef3fb 0%, #f5f7fb 40%, #eaf3f5 100%);
  padding: 40rpx 32rpx 60rpx;
  box-sizing: border-box;
  color: #2a333d;
  font-family:
    -apple-system, 'SF Pro Text', 'PingFang SC', 'Helvetica Neue', sans-serif;
}

/* 毛玻璃卡通用 */
.glass-card {
  background: rgba(255, 255, 255, 0.72);
  border: 1rpx solid rgba(255, 255, 255, 0.95);
  border-radius: 28rpx;
  padding: 36rpx 34rpx;
  box-shadow: 0 8rpx 28rpx rgba(96, 120, 160, 0.1);
  backdrop-filter: blur(20rpx);
  -webkit-backdrop-filter: blur(20rpx);
  margin-bottom: 26rpx;
}
.glass-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 28rpx;
}
.glass-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #2a333d;
  letter-spacing: 1rpx;
}
.glass-month {
  font-size: 24rpx;
  color: #8b94a3;
}
.head-right {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.glass-more {
  font-size: 24rpx;
  color: #7a95c0;
  font-weight: 600;
  padding: 8rpx 0 8rpx 8rpx;
}

/* 本月概况 */
.overview-grid {
  display: flex;
  flex-wrap: wrap;
  margin: -4rpx;
}
.overview-cell {
  width: 33.33%;
  box-sizing: border-box;
  padding: 4rpx;
}
.overview-cell-inner {
  background: rgba(242, 246, 252, 0.8);
  border-radius: 18rpx;
  padding: 18rpx 8rpx 16rpx;
  text-align: center;
}
.ov-icon {
  display: block;
  width: 44rpx;
  height: 44rpx;
  margin: 0 auto 10rpx;
}
.ov-value {
  display: block;
  font-size: 40rpx;
  font-weight: 700;
  color: #2a333d;
  letter-spacing: -2rpx;
  line-height: 1.1;
}
.ov-label {
  display: block;
  font-size: 21rpx;
  color: #8b94a3;
  margin-top: 8rpx;
  letter-spacing: 0.5rpx;
}

/* 添加考勤 */
.add-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 26rpx 4rpx;
  border-bottom: 0.5rpx solid rgba(180, 190, 210, 0.3);
}
.add-label-wrap {
  display: flex;
  align-items: center;
}
.add-icon {
  width: 34rpx;
  height: 34rpx;
  margin-right: 12rpx;
}
.add-label {
  font-size: 26rpx;
  color: #5b6572;
}
.add-value {
  font-size: 26rpx;
  color: #2a333d;
  font-weight: 500;
}
.add-btn {
  margin-top: 34rpx;
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  border-radius: 44rpx;
  background: rgba(120, 150, 200, 0.9);
  color: #ffffff;
  font-size: 30rpx;
  font-weight: 600;
  border: none;
}
.add-btn::after {
  border: none;
}

/* 考勤记录 */
.entry-list {
  display: flex;
  flex-direction: column;
  margin-top: 8rpx;
}
.entry-row {
  display: flex;
  align-items: center;
  padding: 24rpx 0rpx;
  border-bottom: 0.5rpx solid rgba(180, 190, 210, 0.28);
}
.entry-row:last-child {
  border-bottom: none;
}
.entry-date-col {
  width: 92rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  margin-right: 24rpx;
}
.entry-date {
  font-size: 40rpx;
  font-weight: 600;
  color: #2a333d;
}
.entry-week {
  font-size: 21rpx;
  color: #8b94a3;
  margin-top: 4rpx;
}
.entry-body {
  flex: 1;
}
.entry-time {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.entry-time .t {
  font-size: 28rpx;
  color: #2a333d;
  font-weight: 500;
}
.entry-note {
  font-size: 21rpx;
  color: #8b94a3;
  margin-top: 6rpx;
}
.entry-att-btn {
  font-size: 19rpx;
  color: #6d8cbf;
  background: #e8eef7;
  border-radius: 8rpx;
  padding: 2rpx 10rpx;
  margin-right: 10rpx;
}
.entry-hours {
  display: flex;
  align-items: baseline;
  justify-content: flex-end;
  min-width: 84rpx;
}
.entry-hours .num {
  font-size: 34rpx;
  font-weight: 600;
  color: #2a333d;
}
.entry-hours .unit {
  font-size: 21rpx;
  color: #8b94a3;
  margin-left: 4rpx;
}
.entry-empty {
  text-align: center;
  color: #8b94a3;
  font-size: 24rpx;
  padding: 50rpx 0 20rpx;
}
</style>
