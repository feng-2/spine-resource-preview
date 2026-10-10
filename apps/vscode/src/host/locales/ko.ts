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
};
