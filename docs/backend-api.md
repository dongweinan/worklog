# 工时打卡小程序 - 后端接口与建表文档

> 本文件供后端项目（Next.js）创建数据表和实现接口时使用。
> 请严格按照本文档的字段名、类型、格式实现，前端依赖这些约定。

---

## 一、项目背景

这是一个「工时打卡统计」微信小程序（uni-app + Vue3）。
核心功能：每日上班/下班打卡，自动计算工时，月度统计，应出勤天数（含节假日调休），达标工时等。

当前数据完全存储在小程序本地缓存，现需改为后端存储，实现数据云端备份与多端同步。

---

## 二、鉴权方案（微信静默登录）

小程序端无需用户登录界面，使用微信静默登录：

```
小程序 uni.login() 获取临时 code
        ↓ POST /api/auth/login
后端用 AppID + AppSecret 调微信接口 code2session 换取 openid
        ↓
后端为 openid 自动创建用户（首次）
        ↓
返回 token（后续请求鉴权用）
```

后续所有受保护接口，请求头携带：
```
Authorization: Bearer <token>
```

后端根据 token 解析出当前用户（user_id / openid），所有数据按用户隔离。

---

## 三、数据库表结构

### 1. users（用户表）
| 字段 | 类型 | 约束 | 说明 |
| ---- | ---- | ---- | ---- |
| id | BIGINT | 主键，自增 | 用户ID |
| openid | VARCHAR(64) | 唯一，非空 | 微信用户唯一标识 |
| created_at | DATETIME | 默认当前时间 | 注册时间 |

> 无用户名/密码字段，静默注册。

### 2. records（考勤记录表，一行 = 用户某一天）
| 字段 | 类型 | 约束 | 说明 |
| ---- | ---- | ---- | ---- |
| id | BIGINT | 主键，自增 | 记录ID |
| user_id | BIGINT | 索引 | 归属用户（关联 users.id） |
| date | VARCHAR(10) | 非空 | 日期，格式 `YYYY-MM-DD` |
| on_duty_time | VARCHAR(5) | 默认 `''` | 上班时间，格式 `HH:mm`，未打卡为空串 |
| off_duty_time | VARCHAR(5) | 默认 `''` | 下班时间，格式 `HH:mm`，未打卡为空串 |
| attendance | TINYINT | 非空 | 出勤类型：0=加班，0.5=半天，1=全天 |
| work_hours | DECIMAL(5,1) | 非空 | 当日工时（小时，已扣午休），如 8.0 |
| note | VARCHAR(255) | 默认 `''` | 备注（可选） |
| created_at | DATETIME | 默认当前时间 | 创建时间 |
| updated_at | DATETIME | 更新时间 | 更新时间 |

> 唯一约束：`(user_id, date)` —— 同一用户同一天只有一条记录。
> attendance 存入 0 / 0.5 / 1 三个数值（0.5 用 DECIMAL 或存 0.5）。

### 3. settings（设置表，每用户一行）
| 字段 | 类型 | 约束 | 说明 |
| ---- | ---- | ---- | ---- |
| user_id | BIGINT | 主键 | 归属用户 |
| standard_hours | DECIMAL(5,1) | 默认 8 | 每日标准工时 |
| lunch_hours | DECIMAL(5,1) | 默认 1 | 午休扣除小时，0=不扣 |
| goal_hours | DECIMAL(5,1) | 默认 10 | 每日达标工时 |
| updated_at | DATETIME | 更新时间 | 更新时间 |

### 4. due_override（应出勤天数覆盖表）
| 字段 | 类型 | 约束 | 说明 |
| ---- | ---- | ---- | ---- |
| user_id | BIGINT | 索引 | 归属用户 |
| month | VARCHAR(7) | 非空 | 月份，格式 `YYYY-MM` |
| value | VARCHAR(10) | 非空 | 应出勤天数（字符串，如 `'21'`） |
| source | VARCHAR(10) | 默认 `'manual'` | `manual`=用户手动设置；`auto`=前端节假日表自动兜底 |
| created_at | DATETIME | 默认当前时间 | 创建时间 |
| updated_at | DATETIME | 更新时间 | 更新时间 |

> 唯一约束：`(user_id, month)` —— 每用户每月一条。
> 应出勤天数分两种情况：用户手动设置时 `source='manual'`；用户从未设置时，前端会用节假日表自动算出结果回写一行 `source='auto'`，保证后端每月都有基准可供统计。前后端统一以后端 value 为准。

---

## 四、接口清单

所有接口统一前缀 `/api`，除登录外均需鉴权。

### 1. 登录
```
POST /api/auth/login
Content-Type: application/json

req:
{
  "code": "wx.login 获取的临时凭证"
}

res 200:
{
  "token": "xxxxx",          // 后续请求带 Authorization: Bearer token
  "openid": "xxxxx",
  "isNew": true               // 是否首次注册
}
```

### 2. 获取某月考勤记录
```
GET /api/records?year=2026&month=11

res 200:
{
  "records": {
    "2026-11-10": {
      "onDutyTime": "09:00",
      "offDutyTime": "18:00",
      "attendance": 1,
      "workHours": 8.0,
      "note": ""
    }
  }
}
```

> 注意：返回的是「以日期为 key 的对象 map」，不是数组。这是前端现有数据结构，务必保持此形态，前端改动最小。

### 3. 保存某天考勤记录（新增、编辑均走此接口，按 date 覆盖）
> 首页「添加考勤记录」与记录页「编辑记录」复用的是同一个前端逻辑，对应同一个接口。
> 编辑场景下前端会把当天完整卡片重算后整体覆盖(upsert)。
```
PUT /api/records/:date
Content-Type: application/json
:date 形如 2026-11-10

req:
{
  "onDutyTime": "09:00",
  "offDutyTime": "18:00",
  "attendance": 1,
  "workHours": 8.0,
  "note": ""
}

res 200:
{ "ok": true }
```

### 4. 删除某天考勤记录（记录页「删除」按钮调用）
```
DELETE /api/records/:date
res 200:
{ "ok": true }
```

### 5. 获取设置
```
GET /api/settings

res 200:
{
  "standardHours": 8,
  "lunchHours": 1,
  "goalHours": 10
}
```

### 6. 保存设置
```
PUT /api/settings
Content-Type: application/json

req:
{
  "standardHours": 8,
  "lunchHours": 1,
  "goalHours": 10
}

res 200:
{ "ok": true }
```

### 7. 获取某月应出勤覆盖值
```
GET /api/due-override?year=2026&month=11

res 200:
{ "value": "21", "source": "manual" }   // value 空串 "" 或 null 表示无记录；source 为 manual | auto | ""
```

### 8. 保存应出勤覆盖值
```
PUT /api/due-override?year=2026&month=11
Content-Type: application/json

req:
{ "value": "21", "source": "manual" }
// value 传空串 "" 或 null 表示清除覆盖，应删除该行
// source 可选：'manual'（用户手动）默认；省略或非 'manual' 时按 'auto' 处理（前端节假日表自动兜底）

res 200:
{ "ok": true }
```

---

## 五、字段命名映射说明

### 数据库列名 → 前端字段名

| 数据库列 | 前端字段名 |
| ---- | ---- |
| on_duty_time | onDutyTime |
| off_duty_time | offDutyTime |
| attendance | attendance |
| work_hours | workHours |
| note | note |
| standard_hours | standardHours |
| lunch_hours | lunchHours |
| goal_hours | goalHours |

> 数据库用 snake_case，接口 DTO 用 camelCase。后端在返回数据时，需将 snake_case 转为 camelCase 字段名返回。

---

## 六、实现要点

1. **数据形状**：`GET /api/records` 返回以日期为 key 的 map，与前端 `getAllRecords()` 对齐。
2. **唯一约束**：records 表 `(user_id, date)` 唯一；due_override 表 `(user_id, month)` 唯一。
3. **应出勤自动计算**：节假日调休表 / 应出勤天数算法在前端（`calcDueDays`），后端只存手动覆盖值，不用实现节假日逻辑。
4. **数据隔离**：所有查询务必按当前用户的 user_id 过滤，禁止跨用户读取。
5. **workHours 计算**：由前端算好传入，后端仅存不重算，避免两端逻辑不一致。
6. **必填校验**：attendance 必须是 0 / 0.5 / 1；date 格式 `YYYY-MM-DD`；on_duty_time / off_duty_time 格式 `HH:mm` 或空串。