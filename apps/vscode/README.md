# Spine Resource Preview

**Preview Spine animations right beside your project files.**

A local animation viewer for artists, animators, and game developers. Open a folder from VS Code Explorer, browse its Spine resources, and play animations using the official runtime for each supported export version.

[Install from Marketplace](https://marketplace.visualstudio.com/items?itemName=cceevv.spine-resource-preview) · [Product website](https://feng-2.github.io/spine-resource-preview/) · [Report an issue](https://github.com/feng-2/spine-resource-preview/issues)

## Preview

![Shared preview interface with imported Spine resources and the Spineboy run animation playing](assets/preview.jpg)

The extension shares this preview interface with the web viewer. This screenshot was captured in the web version using the official Spine 4.2 Spineboy example. Artwork © Esoteric Software; its original license is included under `dist/licenses/example-assets/LICENSE`.

## What you can do

- Browse complete resource sets in a folder and its subfolders.
- Open a specific skeleton directly from Explorer.
- Select animations, pause, replay, loop, and adjust playback speed.
- Inspect details with scroll-to-zoom and drag-to-pan, or fit the resource to the canvas.
- Preview transparency against a checkerboard background.
- Read diagnostics for missing files, ambiguous dependencies, unsupported versions, and runtime errors.
- Choose from ten interface languages, with English as the default.

## Install

Install **Spine Resource Preview** from [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=cceevv.spine-resource-preview), or search for `cceevv.spine-resource-preview` in VS Code's Extensions view.

Requires **VS Code 1.90 or later** and **WebGL** support. The runtimes are bundled with the extension; you do not need Node.js, a development server, or a runtime CDN to use it.

## Open your resources

1. In **Explorer**, right-click a resource folder or skeleton file.
2. Choose **Preview Spine Resources**. The command name follows VS Code's display language; in Simplified Chinese it is **预览 Spine 资源**.
3. Select a resource in the preview panel, then click an animation to start playback.

| What you select              | What the extension opens                                                                                                   |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| A folder                     | Complete resources in that folder and all subfolders.                                                                      |
| A `.json` / `.skel` skeleton | The selected resource, plus other skeletons in its containing directory. Skeletons in subdirectories are not scanned.      |
| An atlas or image            | Its associated resource when the association is unique. Multiple associations are reported so you can choose the resource. |

Dependencies referenced inside subdirectories can still be read when a skeleton file is selected. You can also use the panel's native file/folder selection buttons and **Refresh resources** to rescan the current source.

## Include the complete export

Import the skeleton, its atlas, and **every page image referenced by the atlas**:

```text
hero/
├── hero.json              # or a supported hero.skel
├── hero.atlas
├── page-1.png
└── page-2.png             # include all referenced pages
```

Keep relative paths and subfolders intact. Image names come from the atlas and do not have to match the skeleton filename. Missing pages are not substituted with same-named images from another directory.

## Playback and canvas controls

| Control                      | Action                                                 |
| ---------------------------- | ------------------------------------------------------ |
| Animation list               | Start the selected animation from the beginning.       |
| Pause / Resume               | Stop or continue playback.                             |
| Replay                       | Restart the current animation.                         |
| Loop                         | Repeat the current animation.                          |
| Speed                        | Adjust playback speed.                                 |
| Mouse wheel / zoom slider    | Zoom in or out.                                        |
| Drag the canvas              | Pan the view.                                          |
| Fit to canvas / Restore view | Fit the current pose, or restore a centered 100% view. |

Large resources automatically fit when first opened; resources that fit already display at actual size. Resources without animations show their setup pose. Fitting uses the current pose bounds, so an action with a larger motion range may need fitting again.

## Supported Spine versions

| Export version        | JSON | Binary `.skel` |
| --------------------- | :--: | :------------: |
| 3.7                   | Yes  |       No       |
| 3.8                   | Yes  |      Yes¹      |
| 4.0 / 4.1 / 4.2 / 4.3 | Yes  |      Yes²      |

¹ Some historical 3.8 binaries, including 3.8.75, require a compatible re-export and are explicitly rejected.

² The checked-in 4.3 examples are beta exports. They do not establish compatibility with every historical beta version.

Each export is loaded with its matching major/minor official Spine runtime. Export and runtime versions are visible in the panel. Unsupported or damaged data produces diagnostics rather than a silent conversion.

## Language and local processing

The preview language menu supports **English, 简体中文, 繁體中文, 日本語, 한국어, Deutsch, Français, Español, Português (Brasil), and Русский**. Your explicit choice is saved locally when storage is available. Command titles and native dialogs independently follow VS Code's language. Resource names, animation names, and paths stay unchanged.

Imported files are read through the VS Code file API and rendered locally in the preview Webview. The extension does not upload your resources. Remote workspaces use VS Code's remote file API.

## When a preview needs attention

Check the panel's diagnostics if a resource is missing or fails to load. Include the full export and preserve its relative paths. Unexpected transparency may require checking atlas PMA metadata and the exported images.

If drag-and-drop does not expose a file URI on your platform, use the Explorer context menu or native selection buttons. If the WebGL context is lost, reload or reselect the resource.

Remote SSH, Dev Containers, VS Code Web, platform-specific Explorer drops, and real VS Code Webview GPU playback have not completed environment acceptance testing. Use a local desktop workspace for the currently documented workflow.

For problems, [open an issue](https://github.com/feng-2/spine-resource-preview/issues) with your extension and VS Code versions, operating system, full Spine export version, JSON/binary format, reproduction steps, and diagnostic text. Share a minimal resource only when you have permission to distribute it.

## License

Project-authored code is MIT. Official Spine runtimes and example artwork retain their upstream licenses, including the applicable Spine Editor license conditions. React, React DOM, and Scheduler retain their MIT licenses. Original notices are included in `LICENSE`, `THIRD_PARTY_NOTICES.md`, and `dist/licenses`.

This project is independently maintained and is not affiliated with or endorsed by Esoteric Software.
