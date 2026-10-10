# 开发规则

- 项目使用 TypeScript 7、Vite、React、pnpm workspace，不引入 Turborepo。
- 运行时必须来自官方 spine-ts，对应导出数据的主、次版本，不静默转换或跨版本兜底。3.7 binary 明确不支持。
- 公共契约位于 packages/core/src/types.ts、packages/runtimes/src/types.ts、packages/viewer/src/types.ts，修改时同步各端调用；跨包通过公共入口访问。
- 所有自有导出 API、类型字段和关键逻辑使用独立的中文注释。第三方 vendor 文件保留原样及许可证。
- 统一使用项目 Prettier 配置。复杂逻辑按职责分模块，不掩盖结构和状态流问题。
- 首选真实资源验证；未知或没有验证的案例如实记录。失败、取消和切换都必须完成资源清理。
- 用户资源不上传，不加入公开产物；旧任务不能覆盖新任务状态。
