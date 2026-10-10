/** 英语宿主原生界面文案。 */
export const en = {
  panelTitle: 'Spine Resource Preview',
  scanTitle: 'Scanning Spine resources',
  scanStarting: 'Scanning {target}…',
  filesIndexed: '{count} files indexed',
  cancelled: 'Scan cancelled. Refresh to try again.',
  scanFailed: 'Scan failed: {reason}',
  preparing: 'Preparing the resource index…',
  initial: 'Right-click a resource file or folder, or choose local resources.',
  localUriOnly: 'Choose local resource files or VS Code remote file URIs.',
  sameFilesystem: 'Files in one import must belong to the same file system.',
  selectedFiles: '{count} files and folders',
  chooseFiles: 'Import Spine resources',
  resourceFilter: 'Spine resources',
  chooseFolder: 'Import resource folder',
  error: 'Spine resource preview: {reason}',
  resourcesTitle: 'Resources',
  animationsTitle: 'Animations',
  refreshTitle: 'Refresh Resources',
  workspaceTitle: 'Return to Workspace',
  treeScanning: 'Scanning resources…',
  treeEmpty: 'No Spine resources found. Right-click a folder to preview its resources.',
  animationsSelect: 'Select a resource to see its animations.',
  animationsEmpty: 'No animations in this resource.',
  diagnosticsTitle: 'Resource diagnostics',
  resourceCount: '{count} resources',
  resourceDiagnostic: 'The resource has a diagnostic: {code}',
  diagnosticAtlasMissing: 'The matching atlas is missing.',
  diagnosticPageMissing: 'An atlas page image is missing.',
  diagnosticDependencyAmbiguous:
    'Multiple files match a dependency. Import a folder preserving its directory structure.',
  diagnosticBinary37Unsupported:
    'Spine 3.7 binary is not supported. Use a 3.7 JSON export.',
  diagnosticVersionPrerelease:
    'This resource uses a beta export; the matching runtime will validate it.',
  diagnosticPreferredAmbiguous:
    'The selected file belongs to multiple skeletons. Select a resource from the list.',
  diagnosticPreferredUnassociated:
    'The selected file is not associated with a complete Spine resource.',
} as const;
