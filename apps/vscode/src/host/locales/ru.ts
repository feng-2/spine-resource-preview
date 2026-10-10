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
};
