# Dashboard v3

An extensible React dashboard with a widget system. Add new widgets with minimal boilerplate — create a component, register it, and it appears in the picker.

Built with React 19, TypeScript, Vite, Zustand, and CSS Modules.

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## Available Commands

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite dev server with HMR |
| `npm run build` | Type-check with `tsc` then build for production into `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |
| `npm test` | Run tests once with Vitest |
| `npm run test:watch` | Run tests in watch mode |

## Project Structure

```
src/
├── main.tsx                        # Entry point — renders App into #root
├── App.tsx                         # Imports widget barrel, renders AppLayout
├── index.css                       # Global CSS reset and dark theme variables
├── test-setup.ts                   # Vitest setup — localStorage mock for Node
│
├── types/
│   ├── widget.ts                   # WidgetDefinition, WidgetComponentProps, WidgetSize
│   └── dashboard.ts                # WidgetInstance, DashboardTab
│
├── store/
│   ├── dashboard-store.ts          # Zustand store (tabs, widgets, persistence)
│   └── dashboard-store.test.ts
│
├── registry/
│   ├── widget-registry.ts          # Map<id, WidgetDefinition> — register/get/getAll
│   └── widget-registry.test.ts
│
├── utils/
│   └── id.ts                       # crypto.randomUUID() helper
│
├── widgets/
│   ├── index.ts                    # Barrel — side-effect imports trigger registration
│   ├── clock/
│   │   ├── ClockWidget.tsx          # Live clock showing time and date
│   │   ├── ClockWidget.module.css
│   │   └── index.ts                # Calls registerWidget()
│   └── weather/
│       ├── WeatherWidget.tsx        # Current weather via MET Norway API
│       ├── WeatherWidget.module.css
│       ├── WeatherWidget.test.tsx
│       ├── useGeolocation.ts        # Browser geolocation hook
│       └── index.ts                # Calls registerWidget()
│
└── components/
    ├── layout/
    │   ├── AppLayout.tsx            # Header + TabBar + Dashboard + WidgetPicker toggle
    │   └── AppLayout.module.css
    ├── dashboard/
    │   ├── Dashboard.tsx            # 3-column CSS grid rendering active tab's widgets
    │   └── Dashboard.module.css
    ├── widget-shell/
    │   ├── WidgetShell.tsx          # Widget chrome: title bar, remove button, grid sizing
    │   └── WidgetShell.module.css
    ├── widget-picker/
    │   ├── WidgetPicker.tsx         # Modal listing all registered widgets
    │   └── WidgetPicker.module.css
    └── tab-bar/
        ├── TabBar.tsx               # Tab navigation + add/remove tabs
        └── TabBar.module.css
```

## Architecture

### Widget Registry

A plain `Map<string, WidgetDefinition>` at module level. Widgets call `registerWidget()` as a side-effect of import. No React context needed — the registry is static and available everywhere.

### Zustand Store

Holds `tabs` and `activeTabId`. Each tab owns its own list of widget instances. Persisted to localStorage under the key `dashboard-storage`, so layout survives page refreshes.

### Tabs

First-class concept. Each `DashboardTab` has an `id`, `name`, and `widgets[]` array. The tab bar supports adding and removing tabs. Removing the active tab automatically switches to the first remaining tab.

### WidgetShell

Wraps every widget with consistent chrome (title bar, remove button) and applies CSS grid sizing (`span 1` / `span 2` / `span 3`) based on the widget's size (`small` / `medium` / `large`).

### Styling

Dark theme defined via CSS custom properties in `index.css`. All component styles use CSS Modules for scoping. The dashboard renders widgets in a 3-column CSS grid.

## Adding a Widget

1. Create a folder in `src/widgets/` with your component and styles:

```
src/widgets/my-widget/
├── MyWidget.tsx
├── MyWidget.module.css
└── index.ts
```

2. Register the widget in `index.ts`:

```ts
import { registerWidget } from "../../registry/widget-registry";
import { MyWidget } from "./MyWidget";

registerWidget({
  id: "my-widget",
  name: "My Widget",
  description: "A short description shown in the picker.",
  defaultSize: "small",   // "small" | "medium" | "large"
  component: MyWidget,
});
```

3. Add the side-effect import to `src/widgets/index.ts`:

```ts
import "./my-widget";
```

The widget will now appear in the "Add Widget" picker.

## Widgets

| Widget  | ID        | Default Size | Description                                                        |
| ------- | --------- | ------------ | ------------------------------------------------------------------ |
| Clock   | `clock`   | small        | Live time and date display, updates every second                   |
| Weather | `weather` | small        | Current weather using browser geolocation + MET Norway Locationforecast API |

## Tests

Tests use [Vitest](https://vitest.dev/) and cover the core logic layers:

### Widget Registry — 5 tests

`src/registry/widget-registry.test.ts`

- Registers and retrieves a widget by ID
- Returns `undefined` for unknown widgets
- Returns all registered widgets
- Warns and skips duplicate registration
- Returns empty array when nothing is registered

### Dashboard Store — 12 tests

`src/store/dashboard-store.test.ts`

- Default state has one tab with the correct active tab
- Adding a tab creates it and switches to it
- Removing a tab falls back to the first remaining tab
- Cannot remove the last tab
- `setActiveTab` switches tabs
- Adding a widget places it in the correct tab with the right size
- Adding an unregistered widget is a no-op
- Removing a widget by instance ID
- Reordering widgets within a tab
- Widget operations only affect the targeted tab

### Weather Widget — tests

`src/widgets/weather/WeatherWidget.test.tsx`

- API fetch and geolocation handling

A `test-setup.ts` file provides a `window.localStorage` mock so Zustand's persist middleware works in the Node test environment.
