# VocabMaster-Extension

VocabMaster 是一款面向长期学习的英语词汇管理 Chrome 插件：在阅读中即时捕捉生词，支持批注与复习节奏管理，并提供生词本管理页与可视化统计，帮助你把零散输入沉淀为可积累的语言资产。

> Own Your Words.

## 亮点功能
- **网页划词 / 双击取词**：快速记录单词、短语与语境
- **生词本管理页（Manager）**：筛选、排序、批量操作、状态切换
- **学习进度与统计**：基础图表与学习状态统计（可扩展）
- **数据导入/导出**：JSON 备份，便于迁移与长期保存
- **隐私优先**：默认本地存储；如接入第三方翻译/大模型接口，可选择 BYOK（自带 Key）的方式（按你的实现为准）

## 安装（开发版）
1. 打开 Chrome：进入 `chrome://extensions/`
2. 右上角开启「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择本项目文件夹（包含 `manifest.json` 的目录）

## 使用
- 在网页中划选/双击单词：弹出释义/操作入口（以实际实现为准）
- 打开插件 Popup：查看快捷入口与最近记录
- 打开 Manager 页面：进行生词本管理与可视化查看

## 项目结构（按现有文件）
- `manifest.json`：扩展清单（MV3）
- `content.js`：页面侧逻辑（划词/弹窗注入等）
- `background.js`：后台逻辑（消息转发、存储、接口调用等）
- `popup.html / popup.js`：插件弹窗
- `options.html / options.js`：设置页
- `manager.html / manager.js / manager.css`：生词本管理页
- `styles.css`：弹窗/页面样式
- `charts.js`：统计图表逻辑
- `PRIVACY.md`：隐私政策
- `DATA_DISCLOSURE.md`：数据披露说明
- `CHANGELOG.md`：变更记录

## 截图（建议）
把截图放在 `assets/screenshots/`，并在这里展示（你准备好截图后替换）：
- `assets/screenshots/popup.png`
- `assets/screenshots/manager.png`
- `assets/screenshots/selection.png`

## Roadmap（可选）
- [ ] 更稳定的取词与多语言页面兼容
- [ ] 生词复习：自定义每日数量、按状态/标签出题
- [ ] BYOK：Options 中配置多个翻译/LLM 提供方并自动降级
- [ ] 数据同步：导入/导出增强，支持云端备份（可选）

## 许可
本项目采用 MIT License（如仓库中包含 LICENSE 文件，以其为准）。
