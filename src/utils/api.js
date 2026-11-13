// 后端接口封装（与 docs/backend-api.md 一致）
// 统一前缀 /api，除登录外均需 Authorization: Bearer <token>

const BASE_URL = 'http://47.94.237.203:8899'
const TOKEN_KEY = 'worklog_token'

let loginPromise = null

function getToken() {
  return uni.getStorageSync(TOKEN_KEY)
}

function setToken(token) {
  uni.setStorageSync(TOKEN_KEY, token || '')
}

// 微信静默登录：uni.login 取 code -> POST /api/auth/login 换取 token
function doLogin() {
  return new Promise((resolve, reject) => {
    uni.login({
      provider: 'weixin',
      success: (res) => {
        uni.request({
          url: BASE_URL + '/api/auth/login',
          method: 'POST',
          data: { code: res.code },
          success: (r) => {
            if (
              r.statusCode >= 200 &&
              r.statusCode < 300 &&
              r.data &&
              r.data.token
            ) {
              setToken(r.data.token)
              resolve(r.data)
            } else {
              reject(new Error('登录失败'))
            }
          },
          fail: reject,
        })
      },
      fail: reject,
    })
  })
}

// 保证并发请求只触发一次登录
export function login() {
  if (!loginPromise) {
    loginPromise = doLogin()
      .catch((err) => {
        setToken('')
        throw err
      })
      .finally(() => {
        loginPromise = null
      })
  }
  return loginPromise
}

// 通用请求封装：自动附带 token，401 时重新登录后重试
export function request(method, path, data = {}) {
  return new Promise((resolve, reject) => {
    const send = () => {
      uni.request({
        url: BASE_URL + path,
        method,
        data,
        header: {
          'Content-Type': 'application/json',
          ...(getToken() ? { Authorization: 'Bearer ' + getToken() } : {}),
        },
        success: (res) => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(res.data)
          } else if (res.statusCode === 401) {
            setToken('')
            login()
              .then(() => request(method, path, data))
              .then(resolve)
              .catch(reject)
          } else {
            reject(res)
          }
        },
        fail: reject,
      })
    }
    send()
  })
}

// ---------- 接口分组 ----------

export const AuthApi = {
  login,
}

// 考勤记录
export const RecordApi = {
  // GET /api/records?year=2026&month=11 -> { records: { '2026-11-10': {...} } }
  getByMonth: (year, month) =>
    request('GET', `/api/records?year=${year}&month=${month}`),
  // PUT /api/records/:date
  save: (date, record) => request('PUT', `/api/records/${date}`, record),
  // DELETE /api/records/:date
  remove: (date) => request('DELETE', `/api/records/${date}`),
}

// 设置
export const SettingsApi = {
  // GET /api/settings -> { standardHours, lunchHours, goalHours }
  get: () => request('GET', '/api/settings'),
  // PUT /api/settings
  save: (settings) => request('PUT', '/api/settings', settings),
}

// 应出勤天数手动覆盖
export const DueOverrideApi = {
  // GET /api/due-override?year=2026&month=11 -> { value: '21' | null }
  get: (year, month) =>
    request('GET', `/api/due-override?year=${year}&month=${month}`),
  // PUT /api/due-override?year=2026&month=11 { value }
  save: (year, month, value) =>
    request('PUT', `/api/due-override?year=${year}&month=${month}`, { value }),
}
