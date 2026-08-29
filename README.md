# Care Hours

Облачный рабочий табель по подопечным: React/Vite frontend на GitHub Pages, Supabase Auth и PostgreSQL для аккаунтов и данных.

Product specification находится рядом с проектом: `../care-hours-product-spec.md`.

## Что уже подготовлено

- React 19 + TypeScript + Vite;
- экран входа через Supabase Auth;
- справочник клиентов с планом часов и визитов;
- цветные почасовые и фиксированные тарифы;
- месячная таблица с несколькими визитами в одной клетке;
- автоматические итоги по клиентам, тарифам и всему месяцу;
- тарифные snapshots: прошлые суммы не меняются после редактирования тарифа;
- безопасная конфигурация через `.env.local`;
- первоначальная PostgreSQL-схема;
- Row Level Security по рабочим областям;
- тесты, lint и production build;
- автоматический deployment на GitHub Pages.

## Локальный запуск

Требуется Node.js 20 или новее. В папке проекта:

```powershell
npm install
npm run dev
```

Vite напечатает локальный адрес, обычно `http://localhost:5173`. Пока Supabase не подключён, приложение покажет экран подготовки вместо формы входа.

Проверки перед commit:

```powershell
npm run lint
npm run test
npm run build
```

## Подключение Supabase

### 1. Создать облачный проект

1. Зарегистрироваться на `https://supabase.com`.
2. Создать организацию и новый проект на Free plan.
3. Выбрать ближайший доступный регион в ЕС.
4. Сохранить пароль базы в менеджере паролей. Не отправлять его в чат и не добавлять в Git.

### 2. Создать локальный env-файл

В Supabase Dashboard открыть настройки/API и найти:

- Project URL;
- Publishable key.

Скопировать `.env.example` в `.env.local`:

```powershell
Copy-Item .env.example .env.local
```

Заполнить только эти значения:

```dotenv
VITE_SUPABASE_URL=https://PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
VITE_BASE_PATH=/
```

Publishable key предназначен для frontend. Secret/service key в `.env.local` с префиксом `VITE_` добавлять запрещено.

### 3. Создать схему базы

В Supabase Dashboard открыть SQL Editor, скопировать содержимое файла:

```text
supabase/migrations/20260829180000_initial_schema.sql
```

и выполнить SQL один раз. Миграция создаст таблицы, функцию первой рабочей области и RLS policies.

В дальнейшем миграции можно применять через локально установленный CLI:

```powershell
npx supabase login
npx supabase link --project-ref PROJECT_REF
npx supabase db push
```

Для этих удалённых команд Docker не нужен. Docker требуется только для запуска полного локального Supabase stack, который на первом этапе не используется.

### 4. Настроить вход

1. В Authentication settings отключить создание новых пользователей (`Allow new users to sign up`).
2. В Authentication → Users вручную создать первый аккаунт.
3. Перезапустить `npm run dev` после изменения `.env.local`.
4. Войти созданными email и паролем.

После первой авторизованной загрузки приложение сможет вызвать `ensure_personal_workspace()` и получить отдельную рабочую область пользователя.

## Как смотреть базу

Отдельная программа не обязательна:

- Table Editor показывает таблицы и строки почти как spreadsheet;
- SQL Editor позволяет выполнять и сохранять SQL-запросы;
- Authentication → Users показывает аккаунты.

Если позднее понадобится desktop-клиент, можно установить DBeaver и подключиться через строку из кнопки `Connect` в Supabase Dashboard. Для первой версии Dashboard проще и безопаснее.

## GitHub Pages

Workflow `.github/workflows/deploy.yml` автоматически проверяет и публикует приложение после push в `main`.

В GitHub repository нужно:

1. Settings → Pages → Source → GitHub Actions.
2. Settings → Secrets and variables → Actions → Variables.
3. Добавить `VITE_SUPABASE_URL` и `VITE_SUPABASE_PUBLISHABLE_KEY` как repository variables.

Пользовательские данные не попадают в GitHub. Они загружаются из Supabase только после входа и проверки RLS.

## Редактор

Рекомендуется Visual Studio Code. Проект не привязан к конкретной IDE: его также можно редактировать в WebStorm или другом редакторе. Для просмотра результата IDE не нужна — достаточно `npm run dev` и браузера.

## Структура

```text
src/
  features/auth/       вход пользователя
  features/clients/    карточки и формы клиентов
  features/rates/      тарифы, цвета и ставки
  features/month/      месячная таблица и визиты
  features/workspace/  загрузка данных, типы и расчёты
  lib/supabase.ts      клиент Supabase
  test/                тестовый setup
supabase/
  migrations/          версия схемы PostgreSQL и RLS
.github/workflows/     GitHub Pages deployment
```
