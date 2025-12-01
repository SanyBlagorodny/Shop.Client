## Shop.Project — инструкция для проверки

Этот репозиторий содержит итоговый проект **Shop.Project**:

- **Shop.API** — REST API для работы с товарами, комментариями, изображениями и «похожими товарами».
- **Shop.Admin** — панель администратора на EJS (MVC), работающая поверх API.
- **Shop.Client** — клиентское SPA на React + TypeScript, отдаётся сервером по корню `http://localhost:3000`.

Проект реализует все три задачи из ТЗ:

- фича «похожие товары» (БД + API + админка);
- создание товара через админку (API + админка);
- React‑клиент с роутингом и дополнительным функционалом (фильтр, форма комментариев, переход в админку).

---

## 1. Структура проекта

- **index.ts** — точка входа Node.js‑сервера.
  - монтирует `Shop_api` на `/api`;
  - монтирует `Shop_admin` на `/admin`;
  - раздаёт собранный React‑клиент из `client/dist` по `*`.

- **Server/**
  - `services/db.ts` — подключение к MySQL + создание таблицы `credentials` и пользователя `admin/admin`, если их нет.
  - `services/server.ts` — инициализация Express‑сервера.

- **Shop_api/**
  - `src/api/products-api.ts` — все эндпоинты Products API, включая работу с похожими товарами.
  - `src/api/auth-api.ts` — авторизация для админки.
  - `src/helpers.ts` — склейка товаров с комментариями и изображениями, построение запросов поиска.
  - `src/services/mapping.ts` — маппинг сущностей БД в типы `IProduct`, `IComment`, `IImages`.
  - `src/services/queries.ts` — SQL‑запросы (вставка товаров, комментариев, изображений, похожих товаров и т.д.).

- **Shop_admin/**
  - `index.ts` — инициализация Express‑приложения админки (сессии, EJS‑layout, статика).
  - `controllers/products.controllers.ts` — список товаров, форма редактирования, создание, сохранение, удаление.
  - `controllers/auth.controllers.ts` — логин/логаут и middleware проверки сессии.
  - `models/products.model.ts` — работа с Products API (получение/поиск/обновление/создание/похожие товары).
  - `models/auth.model.ts` — вызов `/api/auth`.
  - `views/` — EJS‑шаблоны:
    - `layout.ejs` — общий макет с шапкой и ссылкой **Add product**;
    - `products.ejs` — список товаров в админке;
    - `product/product.ejs` — форма редактирования/создания товара;
    - частичные шаблоны комментариев и картинок.

- **client/**
  - React + TypeScript + Vite.
  - `src/App.tsx` — маршруты `/`, `/products-list`, `/:id`.
  - `src/pages/HomePage.tsx` — главная.
  - `src/pages/ProductsListPage.tsx` — список товаров с фильтром.
  - `src/pages/ProductPage.tsx` — карточка товара (картинки, похожие товары, комментарии, форма добавления).
  - `src/api.ts`, `src/store/`, `productsSlice` — работа с API и Redux Toolkit.

- **Shared/types.ts** — общие типы (`IProduct`, `IComment`, `IImages`, `IProductSearchPayload`, `IAuthRequisites`).

---

## 2. Требования к окружению

- Node.js 18+;
- npm;
- MySQL 8+ (или совместимая версия);
- ОС: проект разрабатывался под Windows.

### Переменные окружения (`.env`)

В корне проекта нужен файл `.env` (реальные значения — на усмотрение проверяющего):

```env
LOCAL_HOST=127.0.0.1
DATABASE_PORT=3306
ADMIN_USERNAME=root
ADMIN_PASSWORD=your_password
DATABASE_NAME=ProductsApplication

ADMIN_PATH=admin
SECRET=some_session_secret

API_HOST=http://localhost:3000/api
```

`.env` уже добавлен в `.gitignore` и не попадает в репозиторий.

---

## 3. Настройка базы данных

1. Создать БД (если её нет):

```sql
CREATE DATABASE IF NOT EXISTS ProductsApplication
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. Выполнить SQL‑скрипты создания таблиц (в репозитории есть `db_similar_products.sql` для таблицы `similar_products`; таблицы `products`, `comments`, `images` и др. — по исходному учебному проекту Shop.Project).

3. При первом подключении сервер сам:

- создаст таблицу `credentials` (если её нет);
- добавит пользователя `admin/admin`, если такая запись отсутствует.

Логин/пароль в админку: **admin / admin**.

---

## 4. Установка зависимостей

В корне проекта:

```bash
npm install
cd client
npm install
```

---

## 5. Сборка и запуск

1. Собрать React‑клиент:

```bash
cd client
npm run build
cd ..
```

2. Запустить сервер (из корня проекта):

```bash
npx nodemon
```

Сервер слушает `http://localhost:3000` и пишет в консоль:

```text
Server running on port 3000 and host 127.0.0.1
Connection to DB ProductsApplication established
```

Доступные части приложения:

- React‑клиент: `http://localhost:3000/`.
- API: `http://localhost:3000/api/...`.
- Админка: `http://localhost:3000/admin` (редирект на `/admin/auth/login` при отсутствии сессии).

---

## 6. Сценарии проверки по ТЗ

### 6.1. «Похожие товары» (API + БД + админка)

- **API (Postman):**
  - `POST /api/products/similar` — добавить несколько пар id товаров.
  - `GET /api/products/similar/:id` — получить список похожих.
  - `DELETE /api/products/similar` — удалить связи для заданных id.

- **Админка:**
  - На странице товара блок **Similar products** и блок **Other products to mark as similar**.
  - Отметить один товар в Similar как `mark to remove`, два товара в Other для добавления, нажать **Save changes**.
  - После обновления: списки соответствуют сценарию из ТЗ (C, E, F в похожих и B, D в остальных).

### 6.2. Создание товара через админку

1. Открыть `/admin/auth/login`, залогиниться `admin/admin`.
2. Убедиться, что в шапке есть **Add product**, а на странице логина этой ссылки нет.
3. Нажать **Add product** → `/admin/new-product`.
4. Заполнить Title/Description/Price, нажать **Save changes**.
5. Проверить:
   - редирект на `/admin/:id` нового товара;
   - товар отображается в списке `/admin`;
   - товар виден в `/products-list` и на странице `/:id` в клиенте.

### 6.3. React‑клиент Shop.Client

- **Главная (`/`):**
  - Заголовок `Shop.Client`;
  - текст «В базе данных находится n товаров общей стоимостью m»;
  - кнопка перехода на `/products-list`;
  - кнопка открытия `/admin` в новой вкладке.

- **Список (`/products-list`):**
  - Заголовок `Список товаров (n)`;
  - карточки товаров (название, картинка/заглушка, цена, количество комментариев);
  - фильтр по названию и цене «от/до»;
  - клик по названию/картинке ведёт на страницу товара.

- **Страница товара (`/:id`):**
  - название, главное изображение (thumbnail → main → первая картинка → заглушка);
  - список остальных картинок;
  - описание, цена;
  - список похожих товаров (название + цена, кликабельно);
  - список комментариев (заголовок, email, текст);
  - форма добавления комментария, по кнопке «Сохранить» комментарий появляется в списке.

---

## 7. Замечания по безопасности

- `.env`, SQL‑дампы, локальные DB‑файлы и настройки IDE добавлены в `.gitignore`.
- Для проверки требуется самостоятельно создать `.env` на основе примера выше и выполнить SQL‑скрипты создания таблиц.

---
