# Third-party notices

Spine Resource Preview's project-authored code is covered by the root `LICENSE` (MIT). That license does not relicense the third-party software or example assets listed below. Original upstream license texts and copyright notices take precedence over this inventory.

## Spine runtimes

- **Upstream:** [EsotericSoftware/spine-runtimes](https://github.com/EsotericSoftware/spine-runtimes)
- **Copyright:** Esoteric Software LLC
- **License:** Spine Runtimes License Agreement, as included with each pinned version

| Component                          | Source in this repository                          | License/provenance                             |
| ---------------------------------- | -------------------------------------------------- | ---------------------------------------------- |
| spine-ts WebGL 3.7                 | `vendor/3.7/spine-webgl.mjs`                       | `vendor/3.7/LICENSE`, `vendor/3.7/source.json` |
| spine-ts WebGL 3.8                 | `vendor/3.8/spine-webgl.mjs`                       | `vendor/3.8/LICENSE`, `vendor/3.8/source.json` |
| spine-webgl and spine-core 4.0.31  | npm alias `spine-webgl-40` and its core dependency | Original package `LICENSE` files               |
| spine-webgl and spine-core 4.1.55  | npm alias `spine-webgl-41` and its core dependency | Original package `LICENSE` files               |
| spine-webgl and spine-core 4.2.120 | npm alias `spine-webgl-42` and its core dependency | Original package `LICENSE` files               |
| spine-webgl and spine-core 4.3.13  | npm alias `spine-webgl-43` and its core dependency | Original package `LICENSE` files               |

Modern dependency versions are pinned in `pnpm-lock.yaml`. The 3.7/3.8 modules retain upstream runtime code, with an isolated ESM wrapper and a removed external source-map reference. Their provenance records include the fixed upstream commit, original hash, module hash, and transformation description.

The Spine licenses govern integration, derivative works, and redistribution. They refer to Section 2 of the [Spine Editor License Agreement](https://esotericsoftware.com/spine-editor-license) and include an alternative condition requiring each user of a product to obtain their own Spine Editor license. Redistributed products must include the applicable original license and copyright notice. Consult the complete bundled text for the terms that apply to your use; the project's MIT license does not override them.

## React, React DOM, and Scheduler

- **Upstream:** [facebook/react](https://github.com/facebook/react)
- **Copyright:** Meta Platforms, Inc. and affiliates, as stated in the original license files
- **License:** MIT

React and React DOM provide the shared user interface; React DOM also bundles Scheduler. Exact versions are recorded in `pnpm-lock.yaml`. Builds retain the original `LICENSE` for each package, including Scheduler.

## Official test resources

`fixtures/official`, `fixtures/regression`, and `fixtures/negative` contain examples from fixed commits of the official Spine runtimes repository. The files retain upstream licensing; they are not project-authored MIT assets.

- `fixtures/official/download-manifest.json` records original URLs, commits, export versions, byte sizes, and SHA-256 hashes. Version directories retain the original `LICENSE` files.
- `fixtures/regression/SOURCES.json` records distinct historical samples and references to shared official files. Each version retains its original `LICENSE`.
- `fixtures/negative/official-3.7-binary` retains the full unsupported binary sample and its original `LICENSE`; provenance is also recorded in the official download manifest.

These files are included for development and regression testing and are excluded from Web and VSIX builds. This designation does not waive any upstream terms when sharing the source repository. User-imported resources are not copied into these directories or into public build artifacts.

## Documentation screenshots

Images under `assets/screenshots` show the web viewer and the actual VS Code extension displaying official Spine examples. The extension screenshot was captured in a local code-server host and includes the native resource and animation trees beside the editor Webview. Screenshot provenance is recorded in `assets/screenshots/README.md`. The depicted example artwork is copyrighted by Esoteric Software LLC and retains the upstream asset terms recorded in `fixtures/official/4.2/LICENSE`. The project MIT license does not relicense that artwork. The standalone Web application does not bundle documentation screenshots. The product website displays both English screenshots and includes the example-asset license under `licenses/example-assets/LICENSE`. The VSIX includes the extension screenshot as `apps/vscode/assets/preview.jpg` in the source tree and `assets/preview.jpg` in the package, and preserves the example-asset license under `dist/licenses/example-assets/LICENSE`.

## Distribution contents

Both build targets use `scripts/copy-licenses.mjs` to retain the same license inventory:

- `licenses/LICENSE`: the project MIT license.
- `licenses/NOTICE.md`: this third-party inventory.
- `licenses/spine-3.7` and `licenses/spine-3.8`: original licenses and pinned provenance records.
- `licenses/spine-webgl-{40,41,42,43}` and `licenses/spine-core-{40,41,42,43}`: original modern runtime licenses.
- `licenses/react`, `licenses/react-dom`, and `licenses/scheduler`: original MIT license files.

The combined product website preserves the same license inventory at the site root and under `app/licenses/`, with a separate example-artwork license for its screenshot. In the standalone Web build, `licenses/` is at the deployment root. In the VSIX, it is under `dist/`; the extension also includes a root `LICENSE` and `THIRD_PARTY_NOTICES.md`. Keep these files with redistributed builds. Development-only tools are governed by their package licenses and are not distributed as application runtime code.

## Affiliation

Spine Resource Preview is independently maintained. It is not affiliated with or endorsed by Esoteric Software. Product and organization names identify their respective upstream projects and owners.
