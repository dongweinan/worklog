<template>
  <view class="page">
    <!-- 月份切换 -->
    <view class="month-bar">
      <view
        class="month-arrow"
        :class="{ disabled: !canPrev }"
        @tap="changeMonth(-1)"
        >‹</view
      >
      <view class="month-title">{{ monthTitle }}</view>
      <view class="month-arrow" @tap="changeMonth(1)">›</view>
    </view>

    <!-- 列表 -->
    <view class="list" v-if="list.length">
      <view
        class="record-row"
        v-for="item in list"
        :key="item.date"
        @tap="openEdit(item)"
      >
        <view class="row-date-col">
          <view class="row-date">{{ dayNum(item.date) }}</view>
          <view class="row-week" :class="{ weekend: isWeekend(item.date) }">
            {{ weekOf(item.date) }}
          </view>
        </view>

        <view class="row-body">
          <view class="row-time">
            <text class="t">{{ formatTimeStr(item.onDutyTime) }}</text>
            <view class="dash"></view>
            <text class="t">{{ formatTimeStr(item.offDutyTime) }}</text>
          </view>
          <view class="row-note" v-if="item.attendance !== undefined">
            <text class="att-tag">{{ attText(item.attendance) }}</text>
            <text v-if="item.note">{{ item.note }}</text>
          </view>
        </view>

        <view class="row-hours" :class="{ met: Number(item.workHours) >= 8 }">
          <text class="num">{{ Number(item.workHours).toFixed(1) }}</text>
          <text class="unit">H</text>
        </view>
      </view>
    </view>

    <!-- 空状态 -->
    <view class="empty" v-else>
      <image
        class="empty-icon"
        src="/static/icons/calendar.png"
        mode="aspectFit"
      ></image>
      <view class="empty-text">本月还没有打卡记录</view>
      <view class="empty-sub">去打卡页记一笔吧</view>
    </view>

    <!-- 编辑弹层 -->
    <view class="mask" v-if="showEdit" @tap="closeEdit">
      <view class="edit-sheet" @tap.stop>
        <view class="edit-head">
          <text class="edit-title">编辑记录</text>
          <text class="edit-date">{{ editForm.date }}</text>
        </view>

        <view class="edit-row">
          <view class="edit-label-wrap">
            <image
              class="edit-icon"
              src="/static/icons/signin.png"
              mode="aspectFit"
            ></image>
            <text class="edit-label">上班时间</text>
          </view>
          <picker
            mode="time"
            :value="editForm.onDutyTime"
            @change="onEditTime('onDutyTime', $event)"
          >
            <text class="edit-value">{{ editForm.onDutyTime }}</text>
          </picker>
        </view>
        <view class="edit-row">
          <view class="edit-label-wrap">
            <image
              class="edit-icon"
              src="/static/icons/signout.png"
              mode="aspectFit"
            ></image>
            <text class="edit-label">下班时间</text>
          </view>
          <picker
            mode="time"
            :value="editForm.offDutyTime"
            @change="onEditTime('offDutyTime', $event)"
          >
            <text class="edit-value">{{ editForm.offDutyTime }}</text>
          </picker>
        </view>
        <view class="edit-row">
          <view class="edit-label-wrap">
            <image
              class="edit-icon"
              src="/static/icons/calendar-check.png"
              mode="aspectFit"
            ></image>
            <text class="edit-label">出勤天数</text>
          </view>
          <picker
            :range="attendanceOptions"
            :value="editAttendanceIndex"
            @change="onEditAttendance"
          >
            <text class="edit-value">{{ editAttendanceText }}</text>
          </picker>
        </view>

        <view class="edit-work">
          重算工时
          <text class="ew-num">{{ editWorkHours }}</text>
          小时
        </view>

        <view class="edit-actions">
          <view class="edit-btn danger" @tap="deleteEdit">删除</view>
          <view class="edit-btn primary" @tap="saveEdit">保存</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import {
  getMonthRecords,
  loadMonthRecords,
  getSettings,
  loadSettings,
  calcWorkHours,
  saveRecord,
  deleteRecord,
} from '@/utils/worklog.js'

export default {
  data() {
    const now = new Date()
    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      list: [],
      attendanceOptions: ['加班', '半天', '全天'],
      showEdit: false,
      editForm: {
        date: '',
        onDutyTime: '',
        offDutyTime: '',
      },
      editAttendanceIndex: 2,
      editStandard: 8,
    }
  },
  computed: {
    monthTitle() {
      return `${this.year}.${String(this.month).padStart(2, '0')}`
    },
    canPrev() {
      const now = new Date()
      return (
        this.year > now.getFullYear() ||
        (this.year === now.getFullYear() && this.month >= 1)
      )
    },
    editAttendanceText() {
      return this.attendanceOptions[this.editAttendanceIndex]
    },
    editWorkHours() {
      const att = [0, 0.5, 1][this.editAttendanceIndex]
      const fullDay = att === 1
      return calcWorkHours(
        this.editForm.onDutyTime,
        this.editForm.offDutyTime,
        fullDay,
      ).toFixed(1)
    },
  },
  onShow() {
    this.load()
  },
  methods: {
    async load() {
      await loadMonthRecords(this.year, this.month)
      await loadSettings()
      this.list = getMonthRecords(this.year, this.month)
      this.editStandard = getSettings().standardHours || 8
    },
    changeMonth(delta) {
      let m = this.month + delta
      let y = this.year
      if (m < 1) {
        m = 12
        y -= 1
      } else if (m > 12) {
        m = 1
        y += 1
      }
      // 不允许查看未来月份
      const now = new Date()
      if (
        y > now.getFullYear() ||
        (y === now.getFullYear() && m > now.getMonth() + 1)
      ) {
        return
      }
      this.year = y
      this.month = m
      this.load()
    },
    openEdit(item) {
      this.editForm.date = item.date
      this.editForm.onDutyTime = item.onDutyTime || '09:00'
      this.editForm.offDutyTime = item.offDutyTime || '18:00'
      const a = item.attendance
      if (a === 0) this.editAttendanceIndex = 0
      else if (a === 0.5) this.editAttendanceIndex = 1
      else this.editAttendanceIndex = 2
      this.showEdit = true
    },
    closeEdit() {
      this.showEdit = false
    },
    onEditTime(field, e) {
      this.editForm[field] = e.detail.value
    },
    onEditAttendance(e) {
      this.editAttendanceIndex = Number(e.detail.value)
    },
    async saveEdit() {
      const attendance = [0, 0.5, 1][this.editAttendanceIndex]
      const fullDay = attendance === 1
      const record = {
        onDutyTime: this.editForm.onDutyTime,
        offDutyTime: this.editForm.offDutyTime,
        attendance,
        workHours: calcWorkHours(
          this.editForm.onDutyTime,
          this.editForm.offDutyTime,
          fullDay,
        ),
        note: '',
      }
      await saveRecord(this.editForm.date, record)
      this.showEdit = false
      await this.load()
      uni.showToast({ title: '已保存', icon: 'success' })
    },
    async deleteEdit() {
      await deleteRecord(this.editForm.date)
      this.showEdit = false
      await this.load()
      uni.showToast({ title: '已删除', icon: 'success' })
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
    isWeekend(dateStr) {
      const [, m, d] = dateStr.split('-').map(Number)
      const date = new Date(this.year, m - 1, d)
      const day = date.getDay()
      return day === 0 || day === 6
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
  background: linear-gradient(180deg, #eef3fb 0%, #f7f8fb 36%, #eaf3f4 100%);
  padding: 24rpx 32rpx 60rpx;
  box-sizing: border-box;
  color: #111111;
  font-family:
    -apple-system, 'SF Pro Text', 'PingFang SC', 'Helvetica Neue', sans-serif;
}

/* 月份条 */
.month-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8rpx 12rpx 26rpx;
}
.month-arrow {
  font-size: 48rpx;
  color: #007aff;
  padding: 0 40rpx;
  line-height: 1;
}
.month-arrow.disabled {
  visibility: hidden;
}
.month-title {
  font-size: 34rpx;
  font-weight: 700;
  letter-spacing: 2rpx;
  color: #111111;
}

/* 记录行 */
.list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}
.record-row {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.82);
  border: 1rpx solid rgba(255, 255, 255, 0.9);
  border-radius: 20rpx;
  padding: 28rpx 30rpx;
  box-shadow: 0 6rpx 20rpx rgba(80, 120, 180, 0.08);
}
.row-date-col {
  width: 104rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  border-right: 0.5rpx solid #ececf0;
  margin-right: 30rpx;
  padding-right: 24rpx;
  flex-shrink: 0;
}
.row-date {
  font-size: 40rpx;
  font-weight: 600;
  color: #111111;
  letter-spacing: -1rpx;
}
.row-week {
  font-size: 22rpx;
  color: #c7c7cc;
  margin-top: 8rpx;
}
.row-week.weekend {
  color: #ff9500;
}
.row-body {
  flex: 1;
}
.row-time {
  display: flex;
  align-items: center;
  gap: 18rpx;
}
.row-time .t {
  font-size: 30rpx;
  font-weight: 500;
  color: #111111;
}
.dash {
  width: 30rpx;
  height: 2rpx;
  background: #d1d1db;
}
.row-note {
  font-size: 22rpx;
  color: #8e8e93;
  margin-top: 10rpx;
}
.row-hours {
  display: flex;
  align-items: baseline;
  min-width: 84rpx;
  justify-content: flex-end;
}
.row-hours .num {
  font-size: 36rpx;
  font-weight: 600;
  color: #007aff;
}
.row-hours .unit {
  font-size: 22rpx;
  color: #c7c7cc;
  margin-left: 4rpx;
}
.row-hours.met .num {
  color: #34c759;
}

/* 空状态 */
.empty {
  padding-top: 160rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.empty-icon {
  width: 96rpx;
  height: 96rpx;
  opacity: 0.45;
}
.empty-text {
  font-size: 27rpx;
  color: #5a6b7c;
  margin-top: 16rpx;
}
.empty-sub {
  font-size: 23rpx;
  color: #aeaeb2;
  margin-top: 12rpx;
}

/* 出勤类型标签 */
.att-tag {
  display: inline-block;
  font-size: 19rpx;
  color: #007aff;
  background: rgba(0, 122, 255, 0.1);
  border-radius: 8rpx;
  padding: 2rpx 12rpx;
  margin-right: 12rpx;
}

/* 编辑弹层 */
.mask {
  position: fixed;
  inset: 0;
  background: rgba(20, 30, 50, 0.4);
  z-index: 100;
  display: flex;
  align-items: flex-end;
}
.edit-sheet {
  width: 100%;
  background: #f7f8fb;
  border-radius: 32rpx 32rpx 0 0;
  padding: 40rpx 40rpx 48rpx;
  box-sizing: border-box;
}
.edit-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 30rpx;
}
.edit-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #111111;
}
.edit-date {
  font-size: 26rpx;
  color: #8e8e93;
}
.edit-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 16rpx;
  padding: 26rpx 26rpx;
  margin-bottom: 18rpx;
}
.edit-label {
  font-size: 27rpx;
  color: #5a6b7c;
}
.edit-label-wrap {
  display: flex;
  align-items: center;
}
.edit-icon {
  width: 34rpx;
  height: 34rpx;
  margin-right: 12rpx;
}
.edit-value {
  font-size: 28rpx;
  font-weight: 600;
  color: #007aff;
}
.edit-work {
  text-align: center;
  font-size: 24rpx;
  color: #8e8e93;
  padding: 16rpx 0 26rpx;
}
.ew-num {
  font-size: 36rpx;
  font-weight: 700;
  color: #111111;
  margin: 0 10rpx;
}
.edit-actions {
  display: flex;
  gap: 20rpx;
}
.edit-btn {
  flex: 1;
  text-align: center;
  font-size: 30rpx;
  font-weight: 600;
  border-radius: 18rpx;
  padding: 24rpx 0;
}
.edit-btn.primary {
  background: #007aff;
  color: #ffffff;
}
.edit-btn.danger {
  background: rgba(255, 59, 48, 0.12);
  color: #ff3b30;
}
</style>
