import type { en } from './en.js';

/** 韩语宿主原生界面文案。 */
export const ko: { [Key in keyof typeof en]: string } = {
  panelTitle: 'Spine 리소스 미리 보기',
  scanTitle: 'Spine 리소스 검색',
  scanStarting: '{target} 검색 중…',
  filesIndexed: '파일 {count}개 등록됨',
  cancelled: '검색이 취소되었습니다. 새로 고침하여 다시 시도하세요.',
  scanFailed: '검색 실패: {reason}',
  preparing: '미리 보기 준비 중…',
  initial:
    '리소스 파일이나 폴더를 마우스 오른쪽 버튼으로 클릭하거나 로컬 리소스를 선택하세요.',
  localUriOnly: '로컬 리소스 파일 또는 VS Code 원격 파일 URI를 선택하세요.',
  sameFilesystem: '한 번에 가져오는 파일은 같은 파일 시스템에 있어야 합니다.',
  selectedFiles: '파일 및 폴더 {count}개',
  chooseFiles: 'Spine 리소스 가져오기',
  resourceFilter: 'Spine 리소스',
  chooseFolder: '리소스 폴더 가져오기',
  error: 'Spine 리소스 미리 보기: {reason}',
  resourcesTitle: '리소스',
  animationsTitle: '애니메이션',
  refreshTitle: '리소스 새로 고침',
  workspaceTitle: '작업 영역으로 돌아가기',
  treeScanning: '리소스 검색 중…',
  treeEmpty:
    'Spine 리소스를 찾을 수 없습니다. 폴더를 마우스 오른쪽 버튼으로 클릭하여 미리 보세요.',
  animationsSelect: '리소스를 선택하여 애니메이션을 확인하세요.',
  animationsEmpty: '이 리소스에는 애니메이션이 없습니다.',
  diagnosticsTitle: '리소스 진단',
  resourceCount: '리소스 {count}개',
  resourceDiagnostic: '리소스 진단: {code}',
  diagnosticAtlasMissing: '일치하는 atlas가 없습니다.',
  diagnosticPageMissing: 'atlas에서 참조하는 페이지 이미지가 없습니다.',
  diagnosticDependencyAmbiguous:
    '종속 파일에 여러 후보가 있습니다. 디렉터리 구조를 유지한 폴더를 가져오세요.',
  diagnosticBinary37Unsupported:
    'Spine 3.7 바이너리는 지원되지 않습니다. 3.7 JSON 내보내기를 사용하세요.',
  diagnosticVersionPrerelease:
    '베타 버전으로 내보낸 리소스입니다. 해당 런타임이 데이터를 검사합니다.',
  diagnosticPreferredAmbiguous:
    '선택한 파일은 여러 스켈레톤에 연결되어 있습니다. 목록에서 리소스를 선택하세요.',
  diagnosticPreferredUnassociated:
    '선택한 파일이 완전한 Spine 리소스에 연결되어 있지 않습니다.',
};
