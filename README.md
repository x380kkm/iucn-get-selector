# IUCN GET Ecosystem Selector

基于 IUCN 全球生态系统分类法（Global Ecosystem Typology）的桌面选择工具。

## 功能特性

- **三步式选择流程**：Realm（生态域）→ Biome（生物群系）→ EFG（生态系统功能组）
- **多语言支持**：中文、日文、英文界面切换
- **详细信息展示**：悬停显示生态系统描述和参考图片
- **结果管理**：拖拽排序、删除条目
- **数据导出**：支持 JSON 和 CSV 格式导出

## 数据来源

本应用基于 **IUCN Global Ecosystem Typology (GET) Version 2.1**

- 官方网站：https://global-ecosystems.org/
- 数据结构：10 个 Realms，25 个 Biomes，110 个 Ecosystem Functional Groups
- 所有生态系统描述、图片及相关内容版权归 IUCN 及其贡献者所有

### 引用说明

如使用本工具进行研究或项目开发，请引用：

> Keith, D.A., Ferrer-Paris, J.R., Nicholson, E. et al. (2022). A function-based typology for Earth's ecosystems. *Nature* 610, 513–518. https://doi.org/10.1038/s41586-022-05318-4

### 版权声明

- 应用代码：MIT License
- IUCN GET 数据内容：版权归 IUCN 所有，本应用仅提供链接引用
- 图片资源：通过 URL 引用自 https://global-ecosystems.org/，版权归原作者所有

## 使用方法

1. 启动应用
2. 在 Step 1 中选择一个或多个 Realm
3. 确认后在 Step 2 中选择相关的 Biome
4. 确认后在 Step 3 中选择具体的 EFG
5. 在结果页面可以拖拽排序、删除条目
6. 导出 JSON 或 CSV 文件用于后续处理

## 技术栈

- Electron 28+
- 原生 JavaScript
- CSS3

## 许可证

MIT License - 详见 LICENSE 文件

---

**注意**：本工具仅供学习和研究使用。所有 IUCN GET 相关内容的使用需遵守 IUCN 官方使用条款。
