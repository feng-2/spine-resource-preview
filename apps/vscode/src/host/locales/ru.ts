import type { en } from './en.js';

/** 俄语宿主原生界面文案。 */
export const ru: { [Key in keyof typeof en]: string } = {
  panelTitle: 'Просмотр ресурсов Spine',
  scanTitle: 'Поиск ресурсов Spine',
  scanStarting: 'Поиск в {target}…',
  filesIndexed: 'Проиндексировано файлов: {count}',
  cancelled: 'Поиск отменён. Обновите, чтобы повторить попытку.',
  scanFailed: 'Ошибка поиска: {reason}',
  preparing: 'Подготовка просмотра…',
  initial:
    'Щёлкните правой кнопкой по файлу или папке ресурсов либо выберите локальные ресурсы.',
  localUriOnly: 'Выберите локальные файлы ресурсов или URI удалённых файлов VS Code.',
  sameFilesystem: 'Файлы одного импорта должны принадлежать одной файловой системе.',
  selectedFiles: 'Файлы и папки: {count}',
  chooseFiles: 'Импортировать ресурсы Spine',
  resourceFilter: 'Ресурсы Spine',
  chooseFolder: 'Импортировать папку ресурсов',
  error: 'Просмотр ресурсов Spine: {reason}',
  resourcesTitle: 'Ресурсы',
  animationsTitle: 'Анимации',
  refreshTitle: 'Обновить ресурсы',
  workspaceTitle: 'Вернуться в рабочую область',
  treeScanning: 'Поиск ресурсов…',
  treeEmpty:
    'Ресурсы Spine не найдены. Нажмите правой кнопкой мыши на папку для предпросмотра.',
  animationsSelect: 'Выберите ресурс, чтобы увидеть его анимации.',
  animationsEmpty: 'В этом ресурсе нет анимаций.',
  diagnosticsTitle: 'Диагностика ресурсов',
  resourceCount: 'Ресурсов: {count}',
  resourceDiagnostic: 'Диагностика ресурса: {code}',
  diagnosticAtlasMissing: 'Соответствующий атлас отсутствует.',
  diagnosticPageMissing: 'Отсутствует изображение страницы атласа.',
  diagnosticDependencyAmbiguous:
    'Зависимости соответствует несколько файлов. Импортируйте папку с сохранением структуры каталогов.',
  diagnosticBinary37Unsupported:
    'Бинарный формат Spine 3.7 не поддерживается. Используйте экспорт JSON версии 3.7.',
  diagnosticVersionPrerelease:
    'Ресурс экспортирован бета-версией. Соответствующая среда выполнения проверит данные.',
  diagnosticPreferredAmbiguous:
    'Выбранный файл относится к нескольким скелетам. Выберите ресурс из списка.',
  diagnosticPreferredUnassociated: 'Выбранный файл не связан с полным ресурсом Spine.',
};
