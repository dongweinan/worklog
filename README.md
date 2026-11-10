# 工时打卡统计小程序

一个基于 uni-app + Vue 3 的微信小程序，用于记录每日上下班时间，自动计算当日、当月工时，并统计加班与达标需补情况。所有数据均保存在本地，无需后端服务。

## 功能特性

- **每日打卡**：记录上下班时间，支持班次类型（全天 / 半天 / 纯加班）
- **工时计算**：自动计算单日工时，全天班次可扣除午休（默认 1 小时）
- **本月概况**：应出勤天数、实际出勤、累计工时、加班总时长、平均工时、达标需补工时
- **应出勤天数**：内置 2026 年国定节假日与调休规则自动计算，支持在设置中按月手动覆盖
- **达标管理**：设置每日达标工时（默认 10 小时），自动计算还需补足的加班工时
- **历史记录**：按月查看打卡记录，支持月份切换

## 技术栈

- [uni-app](https://uniapp.dcloud.net.cn/)（Vue 3）
- 微信小程序 (`mp-weixin`)
- 本地存储：`uni.setStorage` / `uni.getStorage`

## 页面结构

| Tab | 页面 | 说明 |
| --- | ---- | ---- |
| 打卡 | `pages/index/index` | 本月概况 + 添加考勤记录 + 近期记录 |
| 记录 | `pages/record/record` | 按月的打卡记录 |
| 设置 | `pages/settings/settings` | 应出勤、标准/达标工时、午休扣除等 |

核心逻辑集中在 [src/utils/worklog.js](src/utils/worklog.js)，包含工时、应出勤、达标需补等计算函数。

## 本地开发

```bash
# 安装依赖
npm install

# 启动微信小程序开发模式，然后用微信开发者工具导入 dist/dev/mp-weixin
npm run dev:mp-weixin

# 构建微信小程序产物
npm run build:mp-weixin
```

## 构建 / 打包

```bash
# H5
npm run dev:h5
npm run build:h5

# 各平台小程序（以微信为例）
npm run dev:mp-weixin
npm run build:mp-weixin
```

## 目录结构

```
worklog/
├── src/
│   ├── pages/          # 页面（index / record / settings / stats）
│   ├── utils/          # 核心计算逻辑 worklog.js
│   ├── static/         # 静态资源
│   ├── App.vue         # 应用入口
│   ├── main.js         # 启动入口
│   ├── pages.json      # 页面路由与 TabBar 配置
│   ├── manifest.json   # 项目配置（appid 等）
│   └── uni.scss        # 全局样式变量
├── .gitignore
├── package.json
└── README.md
```

## 说明

- 打卡记录与设置均存储在本地缓存中，卸载或清空小程序缓存会导致数据丢失。
- 2026 年节假日调休表为内置数据，跨年度需在 `src/utils/worklog.js` 中更新相应年份的国家法定节假日安排，或改用设置里的「手动修正应出勤天数」。