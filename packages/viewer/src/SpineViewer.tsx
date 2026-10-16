import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { Diagnostic } from '@spine-preview/core';
import { createPreviewController } from '@spine-preview/runtimes';
import type { PreviewController, PreviewState } from '@spine-preview/runtimes';
import { PreviewLifecycle } from './lifecycle.js';
import { Header } from './components/Header.js';
import { ResourceList } from './components/ResourceList.js';
import { AnimationList } from './components/AnimationList.js';
import { SidebarResizeHandle } from './components/SidebarResizeHandle.js';
import { ImportEmpty } from './components/ImportEmpty.js';
import { PreviewToolbar } from './components/PreviewToolbar.js';
import { PlaybackControls } from './components/PlaybackControls.js';
import { StatusBar } from './components/StatusBar.js';
import {
  createTranslator,
  formatDiagnostic,
  formatSourceStatus,
  isInformationalSourceStatus,
  readLocale,
  saveLocale,
  translate,
  type Locale,
} from './i18n.js';
import type { ViewerCommand, ViewerProps, ViewerSnapshot } from './types.js';

const EMPTY: ViewerSnapshot = {
  revision: -1,
  label: '',
  provider: null,
  result: { resources: [], diagnostics: [] },
  loading: false,
  message: '',
};
const INITIAL: PreviewState = { zoom: 1, fitted: false, paused: false };

/** 把任意错误转换成用户可以理解的说明，保留 runtime 原始原因。 */
function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Web 与 VS Code 共享的资源、动作和 WebGL 预览工作台。 */
export function SpineViewer({ source }: ViewerProps) {
  const [locale, setLocale] = useState<Locale>(readLocale);
  const t = createTranslator(locale);
  const sidebarId = useId();
  const [snapshot, setSnapshot] = useState<ViewerSnapshot>(EMPTY);
  const [selection, setSelection] = useState<{ revision: number; id: string } | null>(
    null,
  );
  const [animations, setAnimations] = useState<readonly string[]>([]);
  const [animation, setAnimation] = useState<string | undefined>();
  const [ready, setReady] = useState(false);
  const [view, setView] = useState(INITIAL);
  const [loop, setLoop] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState<Diagnostic | null>(null);
  const [retry, setRetry] = useState(0);
  const [actionError, setActionError] = useState('');
  const [dragging, setDragging] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  const controller = useRef<PreviewController | null>(null);
  const lifecycle = useRef<PreviewLifecycle | null>(null);
  const dragDepth = useRef(0);
  const sourceGeneration = useRef(0);
  const latestSnapshot = useRef(EMPTY);
  const rememberedAnimation = useRef<{ resourceId: string; animation?: string } | null>(
    null,
  );
  const controllerIdentity = useRef<{ resourceId: string; revision: number } | null>(
    null,
  );
  const queuedCommand = useRef<ViewerCommand | null>(null);
  const commandHandler = useRef<(command: ViewerCommand) => void>(() => {});
  if (!lifecycle.current)
    lifecycle.current = new PreviewLifecycle(createPreviewController);

  useEffect(() => {
    document.title = translate(locale, 'appTitle');
    document.documentElement.lang = locale;
    host.current
      ?.querySelector('canvas')
      ?.setAttribute('aria-label', translate(locale, 'canvasAria'));
  }, [locale, ready]);

  useEffect(() => {
    const generation = ++sourceGeneration.current;
    latestSnapshot.current = EMPTY;
    setSnapshot(EMPTY);
    setSelection(null);
    rememberedAnimation.current = null;
    queuedCommand.current = null;
    setActionError('');
    const unsubscribe = source.subscribe((next) => {
      if (generation === sourceGeneration.current) {
        latestSnapshot.current = next;
        setSnapshot(next);
        setActionError('');
      }
    });
    return () => {
      ++sourceGeneration.current;
      unsubscribe();
    };
  }, [source]);

  const resources = snapshot.result.resources;
  const selected =
    resources.find(
      (resource) =>
        resource.id ===
        (selection?.revision === snapshot.revision
          ? selection.id
          : snapshot.result.preferredResourceId),
    ) ?? resources[0];
  const activeResource = snapshot.loading ? undefined : selected;

  useEffect(() => {
    controller.current = null;
    controllerIdentity.current = null;
    setReady(false);
    setAnimations([]);
    setAnimation(undefined);
    setView(INITIAL);
    setLoop(true);
    setSpeed(1);
    setFailure(null);
    setLoading(Boolean(activeResource && snapshot.provider));
    if (!activeResource || !snapshot.provider || !host.current) {
      if (!snapshot.loading && !activeResource) {
        rememberedAnimation.current = null;
        queuedCommand.current = null;
      }
      void lifecycle.current!.replace(null);
      return;
    }
    const resource = activeResource;
    void lifecycle.current!.replace({
      host: host.current,
      resource,
      provider: snapshot.provider,
      options: {
        onChange: setView,
        onError: (error) => {
          source.reportPreviewState?.({
            revision: snapshot.revision,
            resourceId: resource.id,
            animations: [...(controller.current?.animations ?? [])],
            ...(rememberedAnimation.current?.animation !== undefined
              ? { animation: rememberedAnimation.current.animation }
              : {}),
            error: errorText(error),
          });
          setFailure({
            code: 'RENDER_FAILED',
            stage: 'render',
            path: resource.skeleton.path,
            message: errorText(error),
          });
        },
      },
      ready: (next) => {
        controller.current = next;
        controllerIdentity.current = {
          resourceId: resource.id,
          revision: snapshot.revision,
        };
        // 热重载优先保留有效动作；加载期间的显式播放请求具有更高优先级。
        const pending = queuedCommand.current;
        const previous = rememberedAnimation.current;
        const preferred =
          pending?.resourceId === resource.id
            ? pending.animation
            : source.externalNavigation && previous?.resourceId === resource.id
              ? previous.animation
              : undefined;
        const chosen =
          preferred !== undefined && next.animations.includes(preferred)
            ? preferred
            : next.animations[0];
        queuedCommand.current = null;
        if (chosen !== undefined && chosen !== next.animations[0])
          next.play(chosen, true);
        rememberedAnimation.current = {
          resourceId: resource.id,
          ...(chosen !== undefined ? { animation: chosen } : {}),
        };
        setAnimations(next.animations);
        setAnimation(chosen);
        setReady(true);
        setLoading(false);
        source.reportPreviewState?.({
          revision: snapshot.revision,
          resourceId: resource.id,
          animations: [...next.animations],
          ...(chosen !== undefined ? { animation: chosen } : {}),
        });
      },
      failed: (error) => {
        controller.current = null;
        controllerIdentity.current = null;
        setLoading(false);
        source.reportPreviewState?.({
          revision: snapshot.revision,
          resourceId: resource.id,
          animations: [],
          error: errorText(error),
        });
        setFailure({
          code: 'PREVIEW_LOAD_FAILED',
          stage: 'load',
          path: resource.skeleton.path,
          message: errorText(error),
        });
      },
    });
    return () => {
      controller.current = null;
      controllerIdentity.current = null;
      void lifecycle.current!.replace(null);
    };
  }, [activeResource, snapshot.provider, snapshot.revision, retry, source]);

  // 来源操作也带代际；旧导入的晚到拒绝不能盖住新来源状态。
  const run = useCallback(
    (action: () => void | Promise<void>) => {
      const generation = sourceGeneration.current;
      const revision = snapshot.revision;
      setActionError('');
      try {
        Promise.resolve(action()).catch((error: unknown) => {
          if (
            generation === sourceGeneration.current &&
            latestSnapshot.current.revision === revision
          )
            setActionError(errorText(error));
        });
      } catch (error) {
        setActionError(errorText(error));
      }
    },
    [snapshot.revision],
  );
  const control = useCallback(
    (action: (current: PreviewController) => void) => {
      const current = controller.current;
      if (current) run(() => action(current));
    },
    [run],
  );
  const play = useCallback(
    (name: string) =>
      control((current) => {
        try {
          current.play(name, loop);
        } catch (error) {
          if (activeResource)
            source.reportPreviewState?.({
              revision: snapshot.revision,
              resourceId: activeResource.id,
              animations: [...current.animations],
              ...(animation !== undefined ? { animation } : {}),
              error: errorText(error),
            });
          throw error;
        }
        setAnimation(name);
        if (activeResource) {
          rememberedAnimation.current = {
            resourceId: activeResource.id,
            animation: name,
          };
          source.reportPreviewState?.({
            revision: snapshot.revision,
            resourceId: activeResource.id,
            animations: [...current.animations],
            animation: name,
          });
        }
      }),
    [control, loop, activeResource, snapshot.revision, source, animation],
  );
  const selectResource = useCallback(
    (id: string) => {
      if (selected?.id === id && failure) setRetry((current) => current + 1);
      else setSelection({ revision: snapshot.revision, id });
    },
    [selected?.id, failure, snapshot.revision],
  );
  commandHandler.current = (command) => {
    const latest = latestSnapshot.current;
    if (!latest.result.resources.some((resource) => resource.id === command.resourceId))
      return;
    const identity = controllerIdentity.current;
    if (
      !controller.current ||
      identity?.resourceId !== command.resourceId ||
      identity.revision !== latest.revision
    ) {
      queuedCommand.current = command;
      return;
    }
    if (controller.current.animations.includes(command.animation))
      play(command.animation);
  };
  useEffect(
    () => source.subscribeCommands?.((command) => commandHandler.current(command)),
    [source],
  );
  const diagnostics = [...snapshot.result.diagnostics, ...(failure ? [failure] : [])];
  const busy = snapshot.loading || loading;
  const discoveryFailure = !resources.length && snapshot.result.diagnostics[0];
  // 来源错误可能只有宿主消息，没有诊断对象；未知消息不能被正常播放状态吞掉。
  const sourceNotice =
    !snapshot.loading && !isInformationalSourceStatus(snapshot.message)
      ? formatSourceStatus(locale, snapshot.message)
      : '';
  const status =
    actionError ||
    (failure ? formatDiagnostic(locale, failure) : '') ||
    sourceNotice ||
    (snapshot.loading
      ? t('scanning')
      : loading
        ? t('loadingResource', { name: selected?.name ?? t('fallbackResource') })
        : ready
          ? t('loadedResource', {
              name: selected?.name ?? t('fallbackResource'),
              count: animations.length,
            })
          : discoveryFailure
            ? formatDiagnostic(locale, discoveryFailure)
            : resources.length
              ? t('foundResources', { count: resources.length })
              : formatSourceStatus(locale, snapshot.message) ||
                (snapshot.revision > 0 ? t('noResources') : t('welcome')));

  return (
    <div
      lang={locale}
      className={`spine-viewer${dragging ? ' dragging' : ''}`}
      onDragEnter={(event) => {
        event.preventDefault();
        if (source.drop) {
          dragDepth.current++;
          setDragging(true);
        }
      }}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = source.drop ? 'copy' : 'none';
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        if (--dragDepth.current <= 0) {
          dragDepth.current = 0;
          setDragging(false);
        }
      }}
      onDrop={(event) => {
        event.preventDefault();
        dragDepth.current = 0;
        setDragging(false);
        // 必须同步调用来源入口，浏览器会在事件结束后撤回目录条目权限。
        if (source.drop) run(() => source.drop!(event.dataTransfer));
      }}
    >
      <Header
        locale={locale}
        loading={snapshot.loading}
        ready={ready}
        fitted={view.fitted}
        onToggleFit={() => control((current) => current.toggleFit())}
        onRefresh={source.refresh ? () => run(() => source.refresh!()) : undefined}
        onLanguageChange={(value) => {
          setLocale(value);
          saveLocale(value);
        }}
      />
      <main
        className={`workspace${source.externalNavigation ? ' external-navigation' : ''}`}
      >
        {!source.externalNavigation && (
          <aside
            id={sidebarId}
            className="sidebar"
            aria-label={t('resourceAndAnimation')}
          >
            <ResourceList
              locale={locale}
              resources={resources}
              selectedId={selected?.id}
              loading={snapshot.loading}
              onSelect={selectResource}
            />
            <SidebarResizeHandle locale={locale} sidebarId={sidebarId} axis="height" />
            <AnimationList
              locale={locale}
              animations={animations}
              animation={animation}
              ready={ready}
              onPlay={play}
            />
          </aside>
        )}
        {!source.externalNavigation && (
          <SidebarResizeHandle locale={locale} sidebarId={sidebarId} />
        )}
        <section className="preview-panel" aria-label={t('preview')}>
          <div className="canvas-area" aria-busy={busy}>
            <div className="canvas-host" ref={host} />
            <PreviewToolbar locale={locale} resource={selected} />
            <span className="canvas-hint">{t('canvasHint')}</span>
            {!ready && (
              <ImportEmpty
                locale={locale}
                busy={busy}
                failed={Boolean(failure)}
                canDrop={Boolean(source.drop)}
                onFiles={
                  source.chooseFiles ? () => run(() => source.chooseFiles!()) : undefined
                }
                onFolder={
                  source.chooseFolder
                    ? () => run(() => source.chooseFolder!())
                    : undefined
                }
                onReload={source.refresh ? () => run(() => source.refresh!()) : undefined}
              />
            )}
          </div>
          <PlaybackControls
            locale={locale}
            ready={ready}
            hasAnimations={Boolean(animations.length)}
            animation={animation}
            view={view}
            loop={loop}
            speed={speed}
            onPause={() => control((current) => current.setPaused(!view.paused))}
            onReplay={() => animation !== undefined && play(animation)}
            onLoop={(value) => {
              setLoop(value);
              if (animation !== undefined)
                control((current) => current.play(animation, value));
            }}
            onSpeed={(value) => {
              setSpeed(value);
              control((current) => current.setSpeed(value));
            }}
            onZoom={(value) => control((current) => current.setZoom(value))}
          />
          <StatusBar
            locale={locale}
            animation={animation}
            ready={ready}
            view={view}
            status={status}
            error={Boolean(actionError || failure || discoveryFailure || sourceNotice)}
            diagnostics={diagnostics}
            revision={snapshot.revision}
            open={!resources.length || Boolean(failure)}
            onRetry={failure ? () => setRetry((current) => current + 1) : undefined}
          />
        </section>
      </main>
    </div>
  );
}
