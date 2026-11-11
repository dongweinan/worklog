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

    <!-- 月度概况 -->
    <view class="glass-card">
      <view class="glass-head">
        <text class="glass-title">月度概况</text>
        <text class="glass-sub">{{ days }} 天出勤</text>
      </view>
      <view class="stats-grid">
        <view class="stats-cell">
          <text class="st-value">{{ totalHours }}</text>
          <text class="st-label">累计工时</text>
        </view>
        <view class="stats-cell">
          <text class="st-value">{{ avgHours }}</text>
          <text class="st-label">日均工时</text>
        </view>
        <view class="stats-cell">
          <text class="st-value">{{ overtimeText }}</text>
          <text class="st-label">加班</text>
        </view>
      </view>
    </view>

    <!-- 柱状图 -->
    <view class="glass-card">
      <text class="glass-title">每日工时分布</text>
      <view class="chart" v-if="list.length">
        <view class="bar-col" v-for="item in barList" :key="item.key">
          <view class="bar-shell">
            <view
              class="bar-fill"
              :style="{ height: item.percent + '%', background: item.color }"
            ></view>
          </view>
          <text class="bar-day" :class="{ weekend: item.weekend }">{{
            item.day
          }}</text>
        </view>
      </view>
      <view class="chart-empty" v-else>本月暂无数据</view>
    </view>
  </view>
</template>

<script>
import { getMonthRecords, getSettings } from '@/utils/worklog.js'

export default {
  data() {
    const now = new Date()
    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      list: [],
      standardHours: 8,
    }
  },
  computed: {
    monthTitle() {
      return `${this.year}年${this.month}月`
    },
    canPrev() {
      const now = new Date()
      return (
        this.year > now.getFullYear() ||
        (this.year === now.getFullYear() && this.month >= 1)
      )
    },
    days() {
      // 加班（attendance===0）不算出勤
      return this.list.filter((r) => r.onDutyTime && r.attendance !== 0).length
    },
    totalHours() {
      return this.list
        .reduce((sum, r) => sum + Number(r.workHours || 0), 0)
        .toFixed(1)
    },
    avgHours() {
      const d = this.days || 1
      return (Number(this.totalHours) / d).toFixed(1)
    },
    overtimeText() {
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
      return total.toFixed(1)
    },
    barList() {
      if (!this.list.length) return []
      const max = Math.max(
        ...this.list.map((r) => Number(r.workHours || 0)),
        this.standardHours,
      )
      return this.list
        .map((r) => {
          const [, m, d] = r.date.split('-').map(Number)
          const w = new Date(this.year, m - 1, d).getDay()
          const hours = Number(r.workHours || 0)
          return {
            key: r.date,
            day: d,
            weekend: w === 0 || w === 6,
            hours,
            percent: Math.max(Number((hours / max).toFixed(2)) * 100, 4),
            color: hours >= this.standardHours ? '#9db8e0' : '#d5daea',
          }
        })
        .reverse()
    },
  },
  onLoad() {
    this.standardHours = getSettings().standardHours || 8
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
  },
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: linear-gradient(180deg, #eef3fb 0%, #f5f7fb 40%, #eaf3f5 100%);
  padding: 24rpx 32rpx 60rpx;
  box-sizing: border-box;
  color: #2a333d;
  font-family:
    -apple-system, 'SF Pro Text', 'PingFang SC', 'Helvetica Neue', sans-serif;
}

.month-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8rpx 12rpx 26rpx;
}
.month-arrow {
  font-size: 48rpx;
  color: #7a95c0;
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
  color: #2a333d;
}

/* 毛玻璃卡 */
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
.glass-sub {
  font-size: 23rpx;
  color: #8b94a3;
}

/* 月度概况 */
.stats-grid {
  display: flex;
}
.stats-cell {
  flex: 1;
  text-align: center;
}
.stats-cell + .stats-cell {
  border-left: 0.5rpx solid rgba(180, 190, 210, 0.4);
}
.st-value {
  display: block;
  font-size: 46rpx;
  font-weight: 600;
  color: #2a333d;
  letter-spacing: -1rpx;
}
.st-label {
  display: block;
  font-size: 22rpx;
  color: #8b94a3;
  margin-top: 8rpx;
}

/* 柱状图 */
.chart {
  display: flex;
  align-items: flex-end;
  gap: 12rpx;
  height: 240rpx;
}
.bar-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
}
.bar-shell {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.bar-fill {
  width: 46%;
  background: #d5daea;
  border-radius: 4rpx 4rpx 0 0;
  min-height: 6rpx;
}
.bar-day {
  font-size: 18rpx;
  color: #8b94a3;
  margin-top: 10rpx;
  width: 100%;
  text-align: center;
}
.bar-day.weekend {
  color: #a88aa8;
}
.chart-empty {
  text-align: center;
  color: #8b94a3;
  font-size: 24rpx;
  padding: 60rpx 0;
}
</style>
