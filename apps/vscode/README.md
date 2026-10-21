# Spine Resource Preview

**Preview Spine animations right beside your project files.**

A local animation viewer for artists, animators, and game developers. Open the Spine sidebar, browse resources discovered across your workspace, and play animations using the official runtime for each supported export version.

[Install from Marketplace](https://marketplace.visualstudio.com/items?itemName=cceevv.spine-resource-preview) · [Product website](https://feng-2.github.io/spine-resource-preview/) · [Report an issue](https://github.com/feng-2/spine-resource-preview/issues)

## Preview

![Spine Resource Preview with the native resource directory tree and animation list beside the editor canvas](assets/preview.jpg)

Captured from the actual extension in a local VS Code browser host (code-server). The Spine sidebar keeps the **Resources** directory tree and **Animations** list on the left, while Spineboy plays `run` in the editor preview. Artwork © Esoteric Software; its original license is included under `dist/licenses/example-assets/LICENSE`.

## What you can do

- Browse complete resource sets across your workspace in the native Spine sidebar.
- Keep resource and animation lists beside an editor preview, with automatic updates when exports change.
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

1. Open a project folder in VS Code, then click the **Spine** icon in the Activity Bar.
2. The **Resources** view scans your workspace recursively. Multiple workspace folders are grouped separately.
3. Click a resource to open the editor preview, then choose an action in the **Animations** view.

Opening the sidebar discovers resources without opening a preview tab. The preview opens when you select a resource and is reused for subsequent selections. Animation names in binary exports become available after the resource loads.

Right-click a resource or directory in the **Resources** view and choose **Reveal in Explorer** to select it in VS Code's Explorer, or **Reveal in System File Manager** to open it in Finder, File Explorer, or your platform's file manager.

You can also right-click a folder or file in **Explorer** and choose **Preview Spine Resources**. Command names follow VS Code's display language; in Simplified Chinese this command is **预览 Spine 资源**.

| What you select              | What the extension opens                                                                                                   |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| A folder                     | Complete resources in that folder and all subfolders.                                                                      |
| A `.json` / `.skel` skeleton | The selected resource, plus other skeletons in its containing directory. Skeletons in subdirectories are not scanned.      |
| An atlas or image            | Its associated resource when the association is unique. Multiple associations are reported so you can choose the resource. |

Explorer commands temporarily narrow the sidebar to that source. Dependencies referenced inside subdirectories can still be read when a skeleton file is selected. Native file/folder selection remains available in the preview.

## Return to the full project

After opening a specific file or folder from Explorer:

1. Hover over the **Resources** heading in the Spine sidebar.
2. Click the root-folder icon labelled **Return to Workspace**.
3. All open workspace folders are scanned recursively and appear in the resource list again.

The button appears while the sidebar is showing an Explorer or imported-file scope. You can also open the Command Palette (`Ctrl+Shift+P`, or `Cmd+Shift+P` on macOS) and run **Spine: Return to Workspace**. In Simplified Chinese, the command is **Spine: 返回工作区**.

Returning to the workspace keeps the current preview playing when that resource is still available. **Refresh Resources** rescans the current scope; it does not switch back to the workspace.

## Keep resources up to date

The extension watches the active source for added, changed, moved, and deleted exports, including atlases and page images. Nearby changes are combined into one refresh, so saving a multi-file export does not trigger a separate scan for every file.

- Changes to other resources update the list without restarting the current animation.
- Changes to the selected export reload its preview and preserve the chosen animation when that animation still exists.
- Deleting the selected resource clears the preview. Adding missing dependencies makes a previously incomplete export available.
- Use **Refresh resources** in the Resources toolbar if a file-system event was missed or you want to rescan manually.

Generated directories such as `node_modules`, `.git`, `dist`, and `build` are excluded from discovery. A resource must have its skeleton, atlas, and page images available before it appears as a complete export; diagnostics explain missing dependencies.

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

The preview language menu supports **English, 简体中文, 繁體中文, 日本語, 한국어, Deutsch, Français, Español, Português (Brasil), and Русский**. Your explicit choice is saved locally when storage is available. Native resource and animation views, command titles, and dialogs independently follow VS Code's language. Resource names, animation names, and paths stay unchanged.

Imported files are read through the VS Code file API and rendered locally in the preview Webview. The extension does not upload your resources. Remote workspaces use VS Code's remote file API.

## When a preview needs attention

Check **Resource diagnostics** in the Resources tree for discovery or missing-dependency problems. The preview panel shows loading and rendering errors. Include the full export and preserve its relative paths. Unexpected transparency may require checking atlas PMA metadata and the exported images.

If drag-and-drop does not expose a file URI on your platform, use the Explorer context menu or native selection buttons. If the WebGL context is lost, reload or reselect the resource.

Remote SSH, Dev Containers, VS Code Web, platform-specific Explorer drops, and real VS Code Webview GPU playback have not completed environment acceptance testing. Use a local desktop workspace for the currently documented workflow.

For problems, [open an issue](https://github.com/feng-2/spine-resource-preview/issues) with your extension and VS Code versions, operating system, full Spine export version, JSON/binary format, reproduction steps, and diagnostic text. Share a minimal resource only when you have permission to distribute it.

## License

Project-authored code is MIT. Official Spine runtimes and example artwork retain their upstream licenses, including the applicable Spine Editor license conditions. React, React DOM, and Scheduler retain their MIT licenses. Original notices are included in `LICENSE`, `THIRD_PARTY_NOTICES.md`, and `dist/licenses`.

This project is independently maintained and is not affiliated with or endorsed by Esoteric Software.
