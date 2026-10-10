/** ko 宣传页完整语言包。 */
import type { SiteMessages } from './types.js';

export const ko: SiteMessages = {
  title: 'Spine Resource Preview — Spine 리소스를 움직임으로 확인하세요',
  description:
    '웹과 VS Code에서 사용하는 로컬 Spine 애니메이션 뷰어. 내보낸 버전에 맞는 공식 런타임으로 리소스를 탐색하고 애니메이션을 재생하세요.',
  skip: '본문으로 이동',
  mainNavigation: '주요 탐색',
  resourceNavigation: '관련 리소스',
  navFeatures: '기능',
  navWorkflow: '사용 방법',
  navVersions: '호환성',
  navExtension: 'VS Code',
  getExtension: 'VS Code 확장 받기',
  language: '웹사이트 언어',
  open: '뷰어 열기',
  source: 'GitHub 소스 보기',
  eyebrow: '로컬 SPINE 애니메이션 뷰어',
  headline: 'Spine 리소스를,',
  headlineAccent: '움직임으로 확인하세요.',
  intro:
    '내보낸 폴더에서 필요한 애니메이션을 찾아보세요. 리소스를 탐색하고 동작을 전환하며, 버전에 맞는 공식 런타임으로 내보내기 결과를 확인할 수 있습니다.',
  support: 'Spine 3.7 · 3.8 · 4.0 · 4.1 · 4.2 · 4.3',
  privacy: '로컬에서 처리합니다. 업로드하지 않습니다.',
  platform: '웹과 VS Code 지원',
  viewerLabel: '뷰어',
  viewerFormat: 'Spine 4.2 · JSON · run',
  screenshotAlt:
    '공식 Spine 4.2 예제를 불러온 Spine Resource Preview 영어 화면. 리소스 8개와 애니메이션 11개가 표시되고 캔버스에서 Spineboy의 run 애니메이션이 재생됩니다.',
  screenshotCaption:
    '실제 실행 화면. 왼쪽에서 리소스를 탐색하고 캔버스에서 움직임을 확인하세요.',
  screenshotCredit: '공식 Spineboy 아트워크 © Esoteric Software.',
  assetLicense: '소재 라이선스',
  forLabel: '내보낸 리소스를 확인하는 작업을 위해',
  audience: '아티스트, 애니메이터, 게임 개발자를 위한 도구.',
  featuresEyebrow: '준비는 간단하게, 미리보기는 바로',
  featuresTitle: '내보내기를 확인하는 데\n필요한 기능을 한곳에.',
  featuresIntro:
    '애니메이션을 내보낸 뒤 게임에 적용하기 전, 리소스 확인에 집중할 수 있는 작업 공간을 제공합니다.',
  runtimeTitle: '맞는 런타임을 자동으로 선택합니다.',
  runtimeBody:
    '내보낸 버전에 맞는 공식 spine-ts 런타임을 사용합니다. 버전 정보가 항상 표시되며, 지원하지 않는 데이터에는 명확한 진단을 제공합니다.',
  localTitle: '파일은 로컬에 그대로 있습니다.',
  localBody:
    '파일을 선택하거나 폴더를 웹 앱으로 드롭하세요. 리소스는 기기에서 처리되며 런타임은 앱에 포함되어 있습니다.',
  animationTitle: '필요한 동작을 찾으세요.',
  animationBody:
    '애니메이션 탐색, 일시 정지, 다시 재생, 반복, 속도 조절을 지원합니다. 세부 내용을 확대하거나 캐릭터를 캔버스에 맞춰 보세요.',
  workflowEyebrow: '폴더에서 첫 프레임까지',
  workflowTitle: '열고, 선택하고, 재생하세요.',
  workflowIntro:
    '게임에 미리보기 장면을 만들 필요가 없습니다. 필요한 파일을 모두 준비하고 바로 시작하세요.',
  stepOne: '내보낸 파일 불러오기',
  stepOneBody:
    '폴더를 선택하거나 .json / .skel, .atlas와 모든 아틀라스 페이지 이미지를 함께 불러오세요.',
  stepTwo: '리소스 선택',
  stepTwoBody:
    '폴더에서 발견한 완전한 리소스를 탐색하세요. 누락된 의존 파일은 진단에 표시됩니다.',
  stepThree: '움직임 확인',
  stepThreeBody:
    '애니메이션을 선택해 재생하세요. 실제 크기로 확인하거나 큰 리소스를 캔버스에 맞출 수 있습니다.',
  extensionLabel: 'VS CODE 확장',
  extensionTitle: '프로젝트 옆에서 애니메이션을 확인하세요.',
  extensionBody:
    'Spine 사이드바를 열면 작업 영역의 리소스를 자동으로 찾습니다. VS Code 기본 목록에서 리소스와 동작을 선택하고 옆의 편집기 캔버스에서 재생하세요.',
  extensionStatus: 'Visual Studio Marketplace에서 제공',
  extensionPending: 'Marketplace 등록 상태 미확인 · VSIX로 설치 가능',
  extensionLink: '사용법 및 VSIX 설치 안내',
  extensionInstall: 'VS Code에 설치',
  extensionMarketplace: 'Marketplace에서 보기',
  extensionRequirements: 'VS Code {version}+',
  extensionVersion: '버전 {version}',
  extensionIdLabel: '확장 ID',
  extensionExplorer: 'SPINE 사이드바 사용 방법',
  extensionFolderTitle: '작업 영역의 리소스를 자동으로 찾습니다.',
  extensionFolderBody:
    '활동 표시줄의 Spine 아이콘을 클릭하면 열려 있는 모든 프로젝트 폴더를 재귀 검색합니다. 리소스와 애니메이션은 기본 사이드바에 표시되며, 리소스를 선택하면 캔버스가 열립니다.',
  extensionFileTitle: '한 리소스에 집중하고, 전체 프로젝트로 돌아가세요.',
  extensionFileBody:
    "폴더나 스켈레톤을 오른쪽 클릭해 목록 범위를 좁히세요. '리소스' 도구 모음에서 '작업 영역으로 돌아가기'를 선택하면 전체 프로젝트 폴더가 다시 표시됩니다.",
  extensionLiveTitle: '새 내보내기를 바로 확인하세요.',
  extensionLiveBody:
    '추가, 수정, 삭제된 리소스를 감지해 목록을 자동 갱신합니다. 다른 리소스의 변경은 재생을 중단하지 않습니다. 선택한 리소스가 바뀌면 다시 불러오며, 선택한 동작이 여전히 존재하면 유지합니다.',
  extensionReturnTitle: '전체 프로젝트로 돌아가기',
  extensionReturnBody:
    "탐색기에서 파일이나 폴더를 선택한 뒤 '리소스' 제목에 마우스를 올리고 '작업 영역으로 돌아가기'를 클릭하세요. 명령 팔레트에서도 실행할 수 있습니다.",
  extensionPreviewAlt:
    'VS Code의 Spine Resource Preview. 왼쪽에 기본 리소스 디렉터리 트리와 애니메이션 목록이 있으며, 오른쪽 편집기 캔버스에서 Spineboy의 run 애니메이션이 재생됩니다.',
  extensionPreviewCaption:
    '기본 사이드바에서 리소스와 동작을 탐색하고 편집기 캔버스에서 재생을 확인하세요.',
  extensionPlaybackTitle: '편집기 안에서도 동일한 재생 기능.',
  extensionPlaybackBody:
    '리소스와 동작 전환, 일시 정지, 다시 재생, 반복, 속도 조절을 지원합니다. 확대와 이동으로 캔버스를 살펴보세요.',
  extensionWorkflowOne: '프로젝트를 열고 활동 표시줄에서 Spine 아이콘을 클릭하세요.',
  extensionWorkflowTwo: "'리소스'에서 내보낸 파일을 선택해 편집기 미리보기를 여세요.",
  extensionWorkflowThree: "'애니메이션'에서 동작 이름을 클릭해 재생하세요.",
  extensionOffline: '런타임 포함. 로컬 리소스 사용. 개발 서버 불필요.',
  questionExtension: 'VS Code에서는 어떻게 사용하나요?',
  answerExtension:
    "확장을 설치하고 프로젝트를 연 뒤 활동 표시줄에서 Spine을 클릭하세요. '리소스'에서 파일을 선택하고 '애니메이션'에서 동작을 선택하면 됩니다. 내보내기 변경은 자동 갱신됩니다. 탐색기에서 오른쪽 클릭으로 범위를 좁히거나 '작업 영역으로 돌아가기'로 전체 프로젝트를 복원할 수 있습니다.",
  versionsEyebrow: '명확한 호환 범위',
  versionsTitle: '여섯 가지 버전.\n하나의 미리보기 작업 공간.',
  versionsIntro:
    '지원하는 주·부 버전마다 별도의 공식 런타임을 사용합니다. JSON과 바이너리 파일을 같은 인터페이스로 확인할 수 있습니다.',
  version: 'SPINE 버전',
  json: 'JSON',
  binary: '.SKEL',
  supported: '지원',
  jsonOnly: 'JSON만 지원',
  binaryNote:
    '3.7 바이너리는 지원하지 않습니다. 일부 오래된 3.8 바이너리는 호환 형식으로 다시 내보내야 합니다. 4.3 베타 호환성은 공식 런타임에 따라 달라집니다.',
  details: '호환성 자세히 보기',
  faqEyebrow: '시작 전에 알아두세요',
  faqTitle: '미리보기를 시작하기 전 궁금한 점.',
  questionFiles: '어떤 파일이 필요한가요?',
  answerFiles:
    'JSON 또는 지원되는 바이너리 스켈레톤, 해당 atlas, atlas에 나열된 모든 이미지가 필요합니다. 의존 파일이 올바르게 연결되도록 상대 폴더 구조를 유지하세요.',
  questionUpload: '리소스가 업로드되나요?',
  answerUpload:
    '아니요. 불러온 파일은 로컬에서 읽고 렌더링합니다. 웹 뷰어는 브라우저 안에서 실행되며 리소스를 서버로 보내지 않습니다.',
  questionLanguage: '화면 언어를 바꿀 수 있나요?',
  answerLanguage:
    '네. 웹사이트와 뷰어는 동일한 10개 언어를 지원합니다. 상단의 언어 메뉴에서 선택하세요. 각각의 언어 설정은 별도로 저장되며 기본 언어는 영어입니다.',
  questionLicense: '프로젝트의 라이선스는 무엇인가요?',
  answerLicense:
    '프로젝트 자체 코드는 MIT 라이선스입니다. 공식 Spine 런타임과 예제 아트워크는 적용되는 Spine Editor 라이선스 조건을 포함한 원래 라이선스를 따릅니다.',
  finalTitle: '다음 내보내기를,\n바로 확인하세요.',
  finalIntro: '뷰어를 열고 첫 리소스 폴더를 불러오세요.',
  footerTagline: 'Spine 애니메이션 리소스를 위한 로컬 미리보기 작업 공간.',
  documentation: '문서',
  projectLicense: 'MIT 라이선스',
  thirdParty: '타사 고지',
  affiliation:
    '독립적으로 유지 관리되며 Esoteric Software와 제휴하거나 보증받지 않습니다.',
};
