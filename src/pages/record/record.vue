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
      <view class="record-row" v-for="item in list" :key="item.date">
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
          <view class="row-note" v-if="item.note">{{ item.note }}</view>
        </view>

        <view class="row-hours" :class="{ met: Number(item.workHours) >= 8 }">
          <text class="num">{{ Number(item.workHours).toFixed(1) }}</text>
          <text class="unit">H</text>
        </view>
      </view>
    </view>

    <!-- 空状态 -->
    <view class="empty" v-else>
      <view class="empty-line"></view>
      <view class="empty-text">本月还没有打卡记录</view>
      <view class="empty-sub">去打卡页记一笔吧</view>
    </view>
  </view>
</template>

<script>
import { getMonthRecords } from '@/utils/worklog.js'

export default {
  data() {
    const now = new Date()
    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      list: [],
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
  },
  onLoad() {
    this.load()
  },
  onShow() {
    this.load()
  },
  methods: {
    load() {
      this.list = getMonthRecords(this.year, this.month)
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
  padding-top: 180rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.empty-line {
  width: 2rpx;
  height: 90rpx;
  background: #d1d1db;
}
.empty-text {
  font-size: 27rpx;
  color: #5a6b7c;
  margin-top: 36rpx;
}
.empty-sub {
  font-size: 23rpx;
  color: #aeaeb2;
  margin-top: 12rpx;
}
</style>
