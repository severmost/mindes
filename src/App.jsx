import { useEffect, useRef, useState, useCallback, lazy, Suspense } from "react";
import { useLocale } from "./i18n.jsx";
import { watchAuth, signOut } from "./auth";
import { useFirestoreSync } from "./sync";
import { useTheme, useNodeShape } from "./theme";
import { useBackground } from "./background";
import { useWindowWidth } from "./hooks";
import { collectTasksWithReminders, scheduleReminder, cancelReminder } from "./notifications";
import { findNode } from "./utils";
import Login from "./Login";
import NotFound from "./NotFound";
import InstallPrompt from "./InstallPrompt";
import BackgroundPanel from "./BackgroundPanel";
import { useOnboarding } from "./Onboarding";

// Тяжёлые компоненты грузятся только когда нужны
const Mindmap      = lazy(() => import("./Mindmap"));
const ProjectsHome = lazy(() => import("./ProjectsHome"));

// Зарезервированные пути (не являются project ID)
const RESERVED = new Set(["archive", "immediate", "notfound"]);

function decodeRoutePart(part) {
  try { return decodeURIComponent(part); }
  catch { return null; }
}

// ── URL-роутер ──────────────────────────────────────────────────────────────
function useRouter() {
  const [path, setPath] = useState(() => {
    const p = window.location.pathname;
    history.replaceState({ page: p }, "", p);
    return p;
  });

  useEffect(() => {
    const onPop = () => {
      const p = window.location.pathname;
      setPath(prev => (prev !== p ? p : prev));
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const push = useCallback((newPath) => {
    history.pushState({ page: newPath }, "", newPath);
    setPath(newPath);
  }, []);

  return { path, push };
}

// ── App ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser]           = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const { path, push }            = useRouter();
  const themeApi                  = useTheme();
  const shapeApi                  = useNodeShape();
  const { theme }                 = themeApi;
  const [showBgPanel, setShowBgPanel] = useState(false);
  const onboarding = useOnboarding();
  const { t, locale } = useLocale();
  const winW     = useWindowWidth();
  const isMobile = winW < 768;

  useEffect(() => {
    const unsub = watchAuth(u => { setUser(u); setAuthReady(true); });
    return () => unsub?.();
  }, []);

  const sync = useFirestoreSync(user);
  const { bgUrl } = useBackground(user?.uid);

  // Напоминания
  const lastReminderIdsRef = useRef(new Set());
  useEffect(() => {
    const nextIds = new Set();
    for (const m of sync.maps || []) {
      if (!m?.tree) continue;
      const tasks = collectTasksWithReminders(m.tree);
      for (const task of tasks) {
        const fireAt = new Date(new Date(task.deadline).getTime() - task.remindBefore * 60_000);
        if (!Number.isFinite(fireAt.getTime()) || fireAt.getTime() <= Date.now()) continue;
        nextIds.add(task.id);
        scheduleReminder({
          taskId: task.id, title: task.text || t("notification.task"),
          body: t("notification.due", { date: new Date(task.deadline).toLocaleString(locale) }), fireAt,
        });
      }
    }
    for (const id of lastReminderIdsRef.current) {
      if (!nextIds.has(id)) cancelReminder(id);
    }
    lastReminderIdsRef.current = nextIds;
  }, [sync.maps, locale, t]);

  // ── Парсим маршрут ──
  // /           → ProjectsHome
  // /archive    → ProjectsHome, initialOverlay="archive"
  // /immediate  → ProjectsHome, initialOverlay="today"
  // /:pid       → Mindmap (корень)
  // /:pid/:tid  → Mindmap (задача)
  const isArchive   = path === "/archive";
  const isImmediate = path === "/immediate";

  // /:pid/:tid
  const taskPathMatch = !isArchive && !isImmediate
    ? path.match(/^\/([^/]+)\/([^/]+)$/)
    : null;
  // /:pid
  const mapPathMatch  = !isArchive && !isImmediate && !taskPathMatch
    ? path.match(/^\/([^/]+)$/)
    : null;

  const routePid = taskPathMatch ? decodeRoutePart(taskPathMatch[1])
                 : mapPathMatch  ? decodeRoutePart(mapPathMatch[1])
                 : null;
  const routeTid = taskPathMatch ? decodeRoutePart(taskPathMatch[2]) : null;

  // Показываем Mindmap только если pid — не зарезервированное слово
  const showMindmap = !!routePid && !RESERVED.has(routePid);

  // 404 — путь не подходит ни под один известный шаблон
  const isHome    = path === "/";
  const is404     = path === "/notfound";
  const routeMap = routePid ? sync.maps.find(m => m.id === routePid) : null;
  const invalidMapRoute = (taskPathMatch || mapPathMatch) &&
    (!routePid || RESERVED.has(routePid) || (taskPathMatch && !routeTid) ||
      (!sync.loading && (!routeMap || (routeTid && !findNode(routeMap.tree, routeTid)))));
  const show404 = !is404 && (invalidMapRoute ||
    (!isHome && !isArchive && !isImmediate && !taskPathMatch && !mapPathMatch));

  // Синхронизируем activeMapId с маршрутом
  useEffect(() => {
    if (routeMap && !invalidMapRoute && sync.activeMapId !== routePid) {
      sync.selectMap(routePid);
    }
  }, [routePid, routeMap, invalidMapRoute, sync.activeMapId]); // eslint-disable-line

  const openMap = useCallback((mapId) => {
    push(`/${encodeURIComponent(mapId)}`);
  }, [push]);

  const goHome = useCallback(() => push("/"), [push]);

  const startOnboarding = useCallback(() => {
    onboarding.restart();
    push("/");
  }, [onboarding, push]);

  const navigateTask = useCallback((pid, tid) => {
    push(`/${encodeURIComponent(pid)}/${encodeURIComponent(tid)}`);
  }, [push]);

  const navigateMap = useCallback((pid) => {
    push(`/${encodeURIComponent(pid)}`);
  }, [push]);

  const splash = label => (
    <div style={{
      width: "100%", height: "100vh", background: theme.appBg,
      display: "flex", alignItems: "center", justifyContent: "center",
      color: theme.textMuted, fontFamily: "'Inter',sans-serif", fontSize: 14,
    }}>{label}</div>
  );

  if (!authReady)   return splash(t("app.loading"));
  if (!user)        return <><Login theme={theme} themeName={themeApi.name} onToggleTheme={themeApi.toggle} /><InstallPrompt theme={theme} /></>;
  if (sync.loading) return splash(t("app.syncing"));

  if (show404) return <NotFound theme={theme} onGoHome={goHome} />;
  if (is404)   return <NotFound theme={theme} onGoHome={goHome} />;

  const bgLayer = bgUrl ? (
    <div style={{
      position: "fixed", inset: 0, zIndex: 0,
      backgroundImage: `url(${bgUrl})`,
      backgroundSize: "cover", backgroundPosition: "center",
      backgroundAttachment: "fixed",
      pointerEvents: "none",
    }} />
  ) : null;

  const syncErrorBanner = sync.error ? (
    <div role="alert" title={sync.error.message} style={{
      position: "fixed", top: "calc(12px + env(safe-area-inset-top))", left: "50%",
      transform: "translateX(-50%)", zIndex: 1000, maxWidth: "min(92vw, 540px)",
      padding: "10px 14px", borderRadius: 10, background: "#9F2424", color: "#fff",
      boxShadow: "0 4px 20px rgba(0,0,0,0.25)", fontSize: 13,
    }}>{t("sync.saveError")}</div>
  ) : null;

  const bgPanel = showBgPanel && user ? (
    <BackgroundPanel
      theme={theme}
      uid={user.uid}
      bgUrl={bgUrl}
      isMobile={isMobile}
      onClose={() => setShowBgPanel(false)}
    />
  ) : null;

  // ── Mindmap view ──
  if (showMindmap) {
    const activeId = sync.activeMapId || routePid;
    return (
      <Suspense fallback={splash(t("app.loading"))}>
        {bgLayer}
        <Mindmap
          user={user}
          theme={theme} themeName={themeApi.name} onToggleTheme={themeApi.toggle}
          nodeShape={shapeApi.shape} onToggleShape={shapeApi.toggle}
          maps={sync.maps} activeMapId={activeId}
          taskId={routeTid}
          onSelectMap={id => push(`/${encodeURIComponent(id)}`)}
          onAddMap={sync.addMap} onDeleteMap={sync.deleteMap}
          onUpdateTree={sync.updateTree}
          onSignOut={signOut} onGoHome={goHome}
          onNavigateTask={navigateTask}
          onNavigateMap={navigateMap}
          bgUrl={bgUrl}
          onOpenBgPanel={() => setShowBgPanel(true)}
          onboarding={onboarding}
          onStartOnboarding={startOnboarding}
        />
        {bgPanel}
        {syncErrorBanner}
        <InstallPrompt theme={theme} />
      </Suspense>
    );
  }

  // ── Home / Archive / Immediate view ──
  return (
    <Suspense fallback={splash(t("app.loading"))}>
      {bgLayer}
      <ProjectsHome
        maps={sync.maps}
        theme={theme} themeName={themeApi.name} onToggleTheme={themeApi.toggle}
        onOpenMap={openMap} onGoHome={goHome}
        onAddMap={sync.addMap} onDeleteMap={sync.deleteMap}
        onSaveMapDetails={sync.saveMapDetails} onUpdateTree={sync.updateTree}
        user={user} onSignOut={signOut}
        onNavigateTask={navigateTask}
        initialOverlay={isArchive ? "archive" : isImmediate ? "today" : null}
        onOverlayClose={goHome}
        bgUrl={bgUrl}
        onOpenBgPanel={() => setShowBgPanel(true)}
        onboarding={onboarding}
        onStartOnboarding={startOnboarding}
      />
      {bgPanel}
      {syncErrorBanner}
      <InstallPrompt theme={theme} />
    </Suspense>
  );
}
