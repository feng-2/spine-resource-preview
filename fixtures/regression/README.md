# 旧版回归样本

这里保留与 `fixtures/official` 不同的官方历史样本，用于检查精简导出和同一主、次版本内不同导出号的兼容性。

| 目录               | 骨骼       | 导出版本 | 图片模式          |
| ------------------ | ---------- | -------- | ----------------- |
| `3.7/spineboy-ess` | ESS JSON   | 3.7.90   | 普通 atlas / 图片 |
| `3.8/spineboy-ess` | ESS JSON   | 3.8.99   | 普通 atlas / 图片 |
| `3.8/spineboy-pro` | PRO binary | 3.8.99   | PMA atlas / 图片  |

每组是可独立导入的完整目录，只放一份 atlas 及其对应图片。可以整体导入 `regression`，也可以选择任意单组目录。文件字节保持上游原样。

3.7 ESS 的 atlas / 图片与 `official/3.7/spineboy` 共用上游来源，在这里保留两份必要副本，使目录选择和拖放不依赖跨目录推断。重复的 PRO JSON 仍由测试直接引用 `fixtures/official`。

`SOURCES.json` 保留原始 URL、完整导出版本和 SHA-256，`file` 相对于本目录；以 `../official/` 开头的记录指向共用样本，`copiedFrom` 标明必要副本的标准来源。每版原始许可证位于对应版本目录的 `LICENSE`。这些样本仅用于开发测试，不随 Web 或 VSIX 发布。

`pnpm fixtures:check` 同时验证回归样本哈希和整个 `fixtures` 的资源发现。整体导入 `fixtures` 应发现 47 个可用骨骼，仅产生 8 条 4.3 beta 说明及 1 条刻意保留的 3.7 binary 拒绝诊断；单独导入 `regression` 应发现 3 个骨骼且无诊断。
