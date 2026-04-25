# 抽奖系统（设置台 + 大屏）

这是一个双页面的前端抽奖系统：

- `settings.html`：独立设置页面（奖项与人员名单配置、备份导入导出）
- `screen.html`：大屏抽奖页面（仅抽奖流程：选择奖项、开始/停止、显示本轮结果）

## 核心流程

1. 在 `settings.html` 配置奖项：
   - 奖项名称
   - 总名额
   - 每轮抽取人数
2. 导入参与者名单（每行一个）
3. 切到 `screen.html`，选择奖项，点击“开始”再“停止”
4. 系统按该奖项“每轮抽取人数”给出本轮结果，直到该奖项抽完

> 默认全局不重复中奖（一个人只会中一次）。

## 运行方式

```bash
python3 -m http.server 8080
```

访问：

- `http://localhost:8080/settings.html`
- `http://localhost:8080/screen.html`

## 文件结构

```text
.
├── common.js
├── settings.html
├── settings.js
├── screen.html
├── screen.js
├── styles.css
├── index.html
└── README.md
```
