# Product screenshots

Both screenshots were captured from the current application on October 16, 2026, at 1280 × 720 with the English interface and the official Spine 4.2 examples. Spineboy is playing `run` in both views.

- `preview-en.jpg`: the web viewer, showing the resource directory tree, animation copy buttons, the draggable height divider between the two lists, and the single status row with fixed integer animation dimensions, duration, and FPS. The sidebar has been resized to 340 pixels, and its resource panel uses the default 42% height proportion.
- `vscode-preview-en.jpg`: the current extension running in an isolated desktop VS Code 1.139.1 (arm64) development host on macOS. It shows the native Resources and Animations TreeViews beside the editor Webview. The image is a direct screenshot of the workbench viewport.

Both images use official Spine example artwork © Esoteric Software. The artwork's original license is retained in `fixtures/official/4.2/LICENSE` and included in website and VSIX builds.

The canonical screenshots live in this directory. The extension build synchronizes `vscode-preview-en.jpg` to `apps/vscode/assets/preview.jpg`; the website imports the same source and includes an image copy for its downloadable extension README.
