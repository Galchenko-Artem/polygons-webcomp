# Polygons Web‑Components App

Учебное приложение, где можно создавать SVG‑полигоны, перемещать их между зонами, масштабировать, панорамировать и сохранять состояние в `localStorage`.

## Возможности

- Генерация случайных полигонов (5–20)
- Перетаскивание между зонами (Drag & Drop)
- Масштаб (0.2–3×) и панорамирование
- Сетка, адаптирующаяся под масштаб
- Сохранение/сброс состояния

## Стек

- Vanilla JS + Web Components
- SVG, Drag & Drop API
- Webpack
- localStorage
- live-server

## Установка и запуск

```bash
git clone https://github.com/your-user/polygons-app.git
cd polygons-app
npm install

# Dev-сборка + live-server
npm run dev

# Production-сборка
npm run build
```

## Структура

```
polygons-app/
├── public/           # index.html, style.css, app.js (бандл)
├── src/              # index.js (исходный код)
├── package.json
└── webpack.config.js
```

---

© your-user, 2025
