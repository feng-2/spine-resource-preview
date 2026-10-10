# 官方 Spine 跨版本测试资源

这是独立的本地测试集合。全部资源通过网络从 [EsotericSoftware/spine-runtimes](https://github.com/EsotericSoftware/spine-runtimes) 的固定 commit 下载，没有复制用户游戏素材，也没有修改骨骼、atlas 或图片的内容。

在 Web 预览工具选择整个 `fixtures/official` 文件夹，或将它拖入画布。集合按版本和独立资源组划分，每组只包含一个相关 atlas；JSON 和 binary 使用与 atlas 一致的文件名。普通下载清单 JSON 会被资源核心跳过。

| 版本 | 原始导出版本 | 样本组 | JSON | binary | 可索引骨骼 |
| --- | --- | --- | ---: | ---: | ---: |
| 3.7 | 3.7.90 | spineboy、tank、raptor、spineboy-pma | 4 | 0 | 4 |
| 3.8 | 3.8.55 | 同上 | 4 | 4 | 8 |
| 4.0 | 4.0.31；raptor 为 4.0.61 | 同上 | 4 | 4 | 8 |
| 4.1 | 4.1.17 | 同上 | 4 | 4 | 8 |
| 4.2 | 4.2.22 | 同上 | 4 | 4 | 8 |
| 4.3 | 4.3.75-beta | 同上 | 4 | 4 | 8 |

合计 24 个独立资源组、44 个骨骼入口。原始下载内容约 14.29 MiB，包含许可证和单独的负例。运行 `pnpm fixtures:check` 检查完整性与资源发现结果。

## 测试范围

- `spineboy`：11 个动画，骨骼数据包含 mesh、clipping、IK 和变换约束。
- `tank`：`drive` / `shoot` 两个动画，包含 mesh、clipping、路径及其他约束。
- `raptor`：`gun-grab`、`gun-holster`、`jump`、`roar`、`walk`，包含 mesh 和 IK。
- `spineboy-pma`：与 spineboy 相同的骨骼数据，独立使用官方 PMA atlas 和图片，用于对照透明边缘及混合。

脚本按 atlas 实际页列表下载全部图片，不假设只有一张同名 PNG。当前这些官方样本实际均为单页；多页路径与缺页行为由 core 测试另外验证，不能将此集合当成真实多页渲染验证的证据。

3.7 / 3.8 的官方 PMA atlas 没有显式 `pma` 字段，保留其原始 `-pma` 文件名和下载清单中的 `premultipliedExample` 说明。4.x 的官方 PMA 页包含 `pma: true`。集合不会自行补写透明度标记。

4.3 的固定官方样本使用 beta 导出，核心保留版本并给出 8 条 beta 说明；不把它静默转换为稳定版。当前检查确认文件完整、版本识别和依赖索引正确，完整解析、播放与画面对照需要在同版本官方 runtime 中验证，索引通过不代表已经完成渲染验收。

## 负例

完整官方 3.7 binary 位于相邻的 `fixtures/negative/official-3.7-binary/spineboy.skel`，明确预期 `BINARY_37_UNSUPPORTED`。该目录位于正样本集合之外，整体导入 `official` 不会混入负例。

## 可复现下载与检查

安装项目开发依赖后，在项目根目录运行：

```sh
node scripts/fetch-fixtures.mjs
```

脚本固定六个官方 commit，下载原始 JSON、完整 binary、相关 atlas、全部实际页图片及每版许可证。只重命名骨骼文件以匹配 atlas stem，文件字节保持不变。JSON 和 binary 的完整导出版本必须一致。脚本最终调用真实 `discoverResources`，检查 44 个资源完整、六版数量正确，并确认 3.7 binary 负例被拒绝。

已有集合可离线复核，不再发起下载：

```sh
node scripts/fetch-fixtures.mjs --check
```

`download-manifest.json` 记录每组版本、完整导出版本、commit、格式、页名，以及每个文件的官方 URL、原始路径、SHA-256 和字节数。每版原始许可证位于对应版本目录的 `LICENSE`，负例目录也保留原始许可证。

本集合仅用于开发测试，不应复制进 Web 发布目录或 VSIX。官方资源仍受其原始许可证及 Spine 授权条款约束，不将其标记为项目自有素材。
