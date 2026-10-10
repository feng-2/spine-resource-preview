# Spine Resource Preview

**Browse your Spine exports without leaving VS Code.**

A local animation viewer for artists, animators, and game developers. Right-click a resource folder, discover complete exports, and play their animations in a shared preview panel powered by version-matched official spine-ts WebGL runtimes.

## Features

- Recursive discovery from a directory, or immediate selection of a clicked skeleton file.
- A resource list and animation list with pause, replay, loop, and playback-speed controls.
- Transparent checkerboard, scroll-to-zoom, drag-to-pan, automatic fitting for oversized resources, and a centered 100% reset.
- Clear diagnostics for missing pages, ambiguous dependencies, unsupported versions, and runtime errors.
- Local resource processing with bundled runtimes; no runtime CDN or Vite server required.
- Ten interface languages: English, 简体中文, 繁體中文, 日本語, 한국어, Deutsch, Français, Español, Português (Brasil), and Русский.

## Use

1. In Explorer, right-click a folder or resource file.
2. Choose **Preview Spine Resources** (localized to your VS Code display language).
3. Select a resource and click an animation to play it.

A folder is scanned recursively. A file opens resources in its containing directory without recursively discovering skeletons in subdirectories. Referenced dependencies inside subdirectories can still be read. A selected skeleton is opened directly; an atlas/image selects its associated resource when the association is unique.

Include the complete **`.json` / `.skel` + `.atlas` + all atlas page images**. Preserve relative paths. Missing images are not replaced by another directory's same-named files.

The preview also provides native file/folder selection and refresh. Some platforms do not expose dragged file URIs to Webviews; use the context menu or selection buttons in that case.

## Compatibility

| Spine version         | JSON |                          Binary `.skel`                           |
| --------------------- | :--: | :---------------------------------------------------------------: |
| 3.7                   | Yes  |                                No                                 |
| 3.8                   | Yes  | Yes, except explicitly rejected historical exports such as 3.8.75 |
| 4.0 / 4.1 / 4.2 / 4.3 | Yes  |                                Yes                                |

Each export uses its matching major/minor official runtime. Patch compatibility is determined by that runtime. The 4.3 test samples are beta exports and do not establish support for all historical beta versions. Resources without animations show their setup pose.

Requires **VS Code 1.90+** and WebGL. Remote SSH, Dev Containers, VS Code Web, platform-specific Explorer drops, and real Webview GPU playback still need environment acceptance testing.

## Language and privacy

The viewer defaults to English and remembers explicit language choices when local storage is available. Native command titles, notifications, and dialogs follow VS Code's language independently. Resource names and original error details remain unchanged.

The application does not upload imported resources. File reads use the VS Code file API; images use authorized Webview URIs. Remote workspaces follow VS Code's remote file API.

## Installation from source

From the repository root, with Node.js 22.12+ and pnpm 10.20.0:

```sh
pnpm install --frozen-lockfile
pnpm package:vscode
```

Run **Extensions: Install from VSIX…** and select `apps/vscode/dist/spine-resource-preview.vsix`. The current identifier is `local-spine-preview.spine-resource-preview`; it is a development publisher and no Marketplace release is provided yet.

## License

Project-authored code is MIT; see the included `LICENSE`. Official Spine runtimes retain the **Spine Runtimes License Agreement**, including the applicable Spine Editor license conditions. React, React DOM, and Scheduler retain their MIT licenses. The extension includes `THIRD_PARTY_NOTICES.md` and original licenses under `dist/licenses`; preserve them when redistributing it.

This project is independently maintained and is not affiliated with or endorsed by Esoteric Software.
