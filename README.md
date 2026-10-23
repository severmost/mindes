# Mindes

A hierarchical task manager built as a PWA + Android app. Designed for personal use — fast, offline-capable, and mobile-first.

## Features

- **Projects** — each project is a card with color, description, deadline and priority
- **Task tree** — unlimited nesting: navigate into any task and see its subtasks
- **Branch stats** — desktop sidebar shows progress, priority breakdown and upcoming deadlines
- **Today / Archive overlays** — quickly see overdue, today's and this-week's tasks across all projects
- **Repeat tasks** — daily, weekly, monthly or custom intervals; deadline auto-advances on completion
- **Checklists** — per-task sub-items with progress bar
- **Reminders** — Android local notifications; browser notifications while the tab is open
- **Background image** — set a custom background via URL
- **Dark / Light theme** — persisted, flash-free on load
- **PWA** — installable, works offline, service worker with stale-while-revalidate caching
- **Android** — packaged with Capacitor

## Tech stack

| Layer | Choice |
|---|---|
| UI | React 18 + Vite |
| Data | Firebase Firestore (offline persistence) |
| Auth | Firebase Auth (Google) |
| PWA | Custom service worker |
| Android | Capacitor 6 |
| Hosting | Firebase Hosting |

## Project structure

```
src/
  App.jsx              # Router + auth shell
  Mindmap.jsx          # Task tree view (main feature)
  ProjectsHome.jsx     # Projects grid + overlays
  BackgroundPanel.jsx  # Background picker
  utils.js             # Pure functions & tree helpers
  hooks.js             # Shared React hooks
  background.js        # Background URL persistence
  sync.js              # Firestore real-time sync
  auth.js              # Firebase Auth wrapper
  theme.js             # Dark/light theme + hook
  notifications.js     # Android local and open-tab browser reminders
  firebase.js          # Firebase init
```

## Getting started

```bash
# 1. Clone and install
git clone https://github.com/severmost/mindes.git
cd mindes
npm ci

# 2. Set up Firebase
cp .env.example .env.local
# Fill in your Firebase project keys

# 3. Run dev server
npm run dev

# 4. Build for web
npm run build
```

## Notes

- Developed locally as a personal productivity tool; repository created after reaching a stable MVP
- Firebase Storage intentionally not used — background images stored as URLs in Firestore (stays on free tier)
- Firestore security rules restrict every user to their own data only
- Web publishing: `npm run build`, then `firebase deploy --only hosting --project mindes-15db2`. The `public/` directory is copied to the live site, so keep private files out of it.
- Android: `npm run apk` builds a debug APK in `android/app/build/outputs/apk/debug/`. Publishing to Google Play requires a separate release signing key and Play Console access.

---

# Mindes (на русском)

Иерархический менеджер задач в виде PWA + Android-приложения. Создан для личного использования — быстрый, работает офлайн, ориентирован на мобильные устройства.

## Возможности

- **Проекты** — каждый проект это карточка с цветом, описанием, сроком и приоритетом
- **Дерево задач** — неограниченная вложенность: переходи в любую задачу и смотри её подзадачи
- **Статистика ветки** — на десктопе боковая панель показывает прогресс, приоритеты и ближайшие дедлайны
- **Сегодня / Архив** — быстрый просмотр просроченных, сегодняшних и задач на неделю по всем проектам
- **Повторяющиеся задачи** — ежедневно, еженедельно, ежемесячно или каждые N дней; срок переносится автоматически при выполнении
- **Чеклисты** — подпункты внутри задачи с прогресс-баром
- **Напоминания** — локальные уведомления на Android; в браузере уведомления работают, пока вкладка открыта
- **Фон** — установка фонового изображения по ссылке
- **Тёмная / светлая тема** — сохраняется, без мигания при загрузке
- **PWA** — устанавливается, работает офлайн, service worker со стратегией stale-while-revalidate
- **Android** — собирается через Capacitor

## Стек

| Слой | Технология |
|---|---|
| UI | React 18 + Vite |
| Данные | Firebase Firestore (офлайн-кеш) |
| Авторизация | Firebase Auth (Google) |
| PWA | Кастомный service worker |
| Android | Capacitor 6 |
| Хостинг | Firebase Hosting |

## Структура проекта

```
src/
  App.jsx              # Роутер + оболочка авторизации
  Mindmap.jsx          # Вид дерева задач (основная фича)
  ProjectsHome.jsx     # Сетка проектов + оверлеи
  BackgroundPanel.jsx  # Выбор фона
  utils.js             # Чистые функции и tree-хелперы
  hooks.js             # Общие React-хуки
  background.js        # Сохранение фона
  sync.js              # Синхронизация с Firestore
  auth.js              # Обёртка Firebase Auth
  theme.js             # Тема + хук
  notifications.js     # Локальные Android- и браузерные напоминания
  firebase.js          # Инициализация Firebase
```

## Запуск

```bash
# 1. Клонировать и установить зависимости
git clone https://github.com/severmost/mindes.git
cd mindes
npm ci

# 2. Настроить Firebase
cp .env.example .env.local
# Заполнить ключами своего Firebase-проекта

# 3. Запустить dev-сервер
npm run dev

# 4. Собрать для веба
npm run build
```

## Примечания

- Разрабатывался локально как личный инструмент; репозиторий создан после выхода стабильного MVP
- Firebase Storage намеренно не используется — фоновые изображения хранятся как URL в Firestore (бесплатный тариф)
- Правила безопасности Firestore ограничивают каждого пользователя только его собственными данными
- Веб-публикация: `npm run build`, затем `firebase deploy --only hosting --project mindes-15db2`. Содержимое `public/` копируется на открытый сайт; личные файлы там хранить нельзя.
- Android: `npm run apk` создаёт тестовый APK в `android/app/build/outputs/apk/debug/`. Для Google Play нужны отдельный ключ release-подписи и доступ к Play Console.
