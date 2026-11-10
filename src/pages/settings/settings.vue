<template>
  <view class="page">
    <!-- 应出勤天数设置 -->
    <view class="glass-card">
      <view class="glass-head">
        <text class="glass-title">应出勤天数</text>
      </view>

      <view class="month-bar">
        <view class="month-arrow" @tap="changeMonth(-1)">‹</view>
        <view class="month-title">{{ monthTitle }}</view>
        <view class="month-arrow" @tap="changeMonth(1)">›</view>
      </view>

      <view class="due-block">
        <text class="due-big">{{ displayDue }}</text>
        <text class="due-mark" v-if="isOverridden">手动设置</text>
        <text class="due-mark auto" v-else>节假日自动</text>
      </view>

      <view class="btn-row">
        <view class="pill-btn" @tap="editDue">修改</view>
        <view class="pill-btn ghost" @tap="resetDue" v-if="isOverridden"
          >恢复自动</view
        >
      </view>
    </view>

    <!-- 标准工时设置 -->
    <view class="glass-card">
      <view class="glass-head">
        <text class="glass-title">每日标准工时</text>
      </view>
      <view class="std-block">
        <text class="std-value">{{ standardHours }}</text>
        <text class="std-unit">小时</text>
      </view>
      <view class="btn-row">
        <view class="pill-btn" @tap="editStdHours">修改</view>
      </view>
    </view>

    <!-- 达标工时设置 -->
    <view class="glass-card">
      <view class="glass-head">
        <text class="glass-title">每日达标工时</text>
      </view>
      <view class="goal-block">
        <text class="goal-value">{{ goalHours }}</text>
        <text class="goal-unit">小时/天</text>
      </view>
      <view class="btn-row">
        <view class="pill-btn" @tap="editGoal">修改</view>
      </view>
    </view>

    <!-- 午休扣除设置 -->
    <view class="glass-card">
      <view class="glass-head">
        <text class="glass-title">午休扣除</text>
        <text class="glass-sub">{{
          lunchHours > 0 ? '已开启' : '未扣除'
        }}</text>
      </view>
      <view class="lunch-desc" v-if="lunchHours > 0">
        全天班次从工时中扣除
        <text class="lunch-num">{{ lunchHours }}</text> 小时；半天、加班不扣
      </view>
      <view class="lunch-desc" v-else>不扣除午休时间</view>
      <view class="btn-row">
        <view class="pill-btn" @tap="editLunch">设置</view>
      </view>
    </view>
  </view>
</template>

<script>
import {
  getSettings,
  saveSettings,
  getDueOverride,
  setDueOverride,
  calcDueDays,
} from '@/utils/worklog.js'

export default {
  data() {
    const now = new Date()
    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      override: '',
      standardHours: 8,
      lunchHours: 1,
      goalHours: 10,
    }
  },
  computed: {
    monthTitle() {
      return `${this.year}年${this.month}月`
    },
    displayDue() {
      return this.override !== ''
        ? this.override
        : this.autoDue(this.year, this.month)
    },
    isOverridden() {
      return this.override !== ''
    },
  },
  onLoad() {
    this.standardHours = getSettings().standardHours || 8
    this.lunchHours = getSettings().lunchHours || 0
  },
  onShow() {
    this.load()
  },
  methods: {
    autoDue(y, m) {
      return calcDueDays(y, m)
    },
    load() {
      this.override = getDueOverride(this.year, this.month)
      const s = getSettings()
      this.standardHours = s.standardHours || 8
      this.lunchHours = s.lunchHours || 0
      this.goalHours = s.goalHours || 10
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
      this.year = y
      this.month = m
      this.load()
    },
    editDue() {
      const self = this
      uni.showModal({
        title: `${this.monthTitle}应出勤天数`,
        editable: true,
        placeholderText: '默认按国定节假日自动计算',
        content: String(this.displayDue),
        success(res) {
          if (!res.confirm) return
          const val = (res.content || '').trim()
          if (val === '') {
            setDueOverride(self.year, self.month, '')
          } else {
            const n = Number(val)
            if (isNaN(n) || n < 0) {
              uni.showToast({ title: '请输入有效数字', icon: 'none' })
              return
            }
            setDueOverride(self.year, self.month, n)
          }
          self.load()
        },
      })
    },
    resetDue() {
      setDueOverride(this.year, this.month, '')
      this.load()
      uni.showToast({ title: '已恢复自动计算', icon: 'none' })
    },
    editStdHours() {
      const self = this
      uni.showModal({
        title: '每日标准工时（小时）',
        editable: true,
        placeholderText: '如 8',
        content: String(this.standardHours),
        success(res) {
          if (!res.confirm) return
          const n = Number((res.content || '').trim())
          if (isNaN(n) || n <= 0) {
            uni.showToast({ title: '请输入有效数字', icon: 'none' })
            return
          }
          const settings = getSettings()
          settings.standardHours = n
          saveSettings(settings)
          self.standardHours = n
          uni.showToast({ title: '已保存', icon: 'none' })
        },
      })
    },
    editGoal() {
      const self = this
      uni.showModal({
        title: '每日达标工时（小时）',
        editable: true,
        placeholderText: '如 10',
        content: String(this.goalHours),
        success(res) {
          if (!res.confirm) return
          const n = Number((res.content || '').trim())
          if (isNaN(n) || n <= 0) {
            uni.showToast({ title: '请输入有效数字', icon: 'none' })
            return
          }
          const settings = getSettings()
          settings.goalHours = n
          saveSettings(settings)
          self.goalHours = n
          uni.showToast({ title: '已保存', icon: 'none' })
        },
      })
    },
    editLunch() {
      const self = this
      uni.showModal({
        title: '午休扣除（小时）',
        editable: true,
        placeholderText: '输入 0 表示不扣除',
        content: String(this.lunchHours),
        success(res) {
          if (!res.confirm) return
          const n = Number((res.content || '').trim())
          if (isNaN(n) || n < 0) {
            uni.showToast({ title: '请输入有效数字', icon: 'none' })
            return
          }
          const settings = getSettings()
          settings.lunchHours = n
          saveSettings(settings)
          self.lunchHours = n
          uni.showToast({ title: '已保存', icon: 'none' })
        },
      })
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
  margin-bottom: 12rpx;
}
.glass-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #2a333d;
  letter-spacing: 1rpx;
}

.month-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 10rpx 8rpx;
}
.month-arrow {
  font-size: 44rpx;
  color: #7a95c0;
  padding: 0 30rpx;
  line-height: 1;
}
.month-title {
  font-size: 32rpx;
  font-weight: 700;
  letter-spacing: 2rpx;
  color: #2a333d;
}

.due-block {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  padding: 24rpx 0 30rpx;
}
.due-big {
  font-size: 64rpx;
  font-weight: 700;
  color: #2a333d;
  letter-spacing: -2rpx;
  line-height: 1.1;
}
.due-mark {
  margin-top: 10rpx;
  font-size: 20rpx;
  color: #8aa4c9;
  background: #e8eef7;
  border-radius: 8rpx;
  padding: 4rpx 14rpx;
}
.due-mark.auto {
  color: #9aa5b4;
  background: #eef1f6;
}

/* 标准工时 */
.std-block {
  display: flex;
  align-items: baseline;
  justify-content: center;
  padding: 24rpx 0 30rpx;
}
.std-value {
  font-size: 64rpx;
  font-weight: 700;
  color: #2a333d;
  letter-spacing: -2rpx;
  line-height: 1.1;
}
.std-unit {
  font-size: 26rpx;
  color: #8b94a3;
  margin-left: 12rpx;
}

/* 达标工时 */
.goal-block {
  display: flex;
  align-items: baseline;
  justify-content: center;
  padding: 24rpx 0 30rpx;
}
.goal-value {
  font-size: 64rpx;
  font-weight: 700;
  color: #2a333d;
  letter-spacing: -2rpx;
  line-height: 1.1;
}
.goal-unit {
  font-size: 26rpx;
  color: #8b94a3;
  margin-left: 12rpx;
}

/* 午休扣除 */
.lunch-desc {
  font-size: 24rpx;
  color: #5b6572;
  text-align: center;
  padding: 30rpx 0 34rpx;
  line-height: 1.6;
}
.lunch-num {
  font-size: 34rpx;
  font-weight: 700;
  color: #2a333d;
  padding: 0 6rpx;
}
.glass-sub {
  font-size: 23rpx;
  color: #8b94a3;
}

.btn-row {
  display: flex;
  justify-content: center;
  gap: 18rpx;
}
.pill-btn {
  min-width: 200rpx;
  height: 76rpx;
  line-height: 76rpx;
  text-align: center;
  border-radius: 38rpx;
  background: rgba(120, 150, 200, 0.9);
  color: #ffffff;
  font-size: 28rpx;
  font-weight: 600;
}
.pill-btn.ghost {
  background: transparent;
  color: #7a95c0;
  border: 1rpx solid rgba(122, 149, 192, 0.4);
}
</style>
