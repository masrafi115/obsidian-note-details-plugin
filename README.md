# Obsidian Note Details Plugin

A modular sidebar plugin for Obsidian that surfaces structural details about your notes — headings, links, graph relationships, and cross-vault references — in a configurable, preset-driven control panel.

---

## Architecture Overview

The plugin uses a **modular, event-driven architecture**. A central registry manages independently-loadable feature modules; a typed event bus decouples modules from each other and from the UI.

```
main.ts (Plugin)
├── EventBus                    ← typed pub/sub, inter-module communication
├── ModuleRegistry              ← lifecycle manager (load/unload IModule instances)
│   ├── NoteAnatomyModule
│   ├── ConnectivityModule
│   ├── FocalNodeModule
│   └── CrossVaultModule
└── ControlPanelView (sidebar)
    ├── PresetManager           ← CRUD for saved layout presets
    ├── LayoutEngine            ← sorts + renders WidgetHosts into DOM
    └── WidgetHost (per slot)   ← header, height control, collapse, module.getView()
```

**Data / event flow:**

```
Obsidian workspace event
        │
        ▼
ControlPanelView ──emit──► EventBus ──notify──► Module listeners
                                                  │
                                                  ▼
                                           module re-renders its view
                                           (already mounted in WidgetHost)
```

Settings are persisted to Obsidian's `data.json` via `plugin.saveData()`. Layout presets and enabled-module flags live there.

---

## Major Components

| Component | Location | Role |
|---|---|---|
| Plugin entry | [src/main.ts](src/main.ts) | Bootstrap, ribbon icon, command, settings tab |
| EventBus | [src/core/event-bus.ts](src/core/event-bus.ts) | Typed pub/sub (`active-file-changed`, `layout-preset-changed`, `module-visibility`, `vault-scan-complete`, `metadata-changed`) |
| ModuleRegistry | [src/core/module-registry.ts](src/core/module-registry.ts) | Register, retrieve, and lifecycle-manage `IModule` instances |
| LayoutStore | [src/core/layout-store.ts](src/core/layout-store.ts) | Pure utility functions for preset and slot mutation |
| IModule | [src/interfaces/i-module.ts](src/interfaces/i-module.ts) | Contract every module must satisfy |
| ILayout / ISlot / IPreset | [src/interfaces/i-layout.ts](src/interfaces/i-layout.ts) | Layout data-shape definitions |
| Settings | [src/settings/](src/settings/) | `PluginSettings` type, `DEFAULT_SETTINGS`, and the settings tab UI |
| ControlPanelView | [src/framework/control-panel.view.ts](src/framework/control-panel.view.ts) | Sidebar `ItemView`; owns preset selector, calls `LayoutEngine.render()` |
| LayoutEngine | [src/framework/layout-engine.ts](src/framework/layout-engine.ts) | Sorts slots by `order`, filters hidden, appends `WidgetHost` elements |
| WidgetHost | [src/framework/widget-host.ts](src/framework/widget-host.ts) | Per-slot wrapper: title bar, height-mode dropdown, collapse toggle, `module.getView()` |
| PresetManager | [src/framework/preset-manager.ts](src/framework/preset-manager.ts) | Add / rename / delete / switch presets; triggers save callback |
| Note Anatomy module | [src/modules/note-anatomy/](src/modules/note-anatomy/) | Tab view: headings (jump-to-line), external URLs, cross-vault refs, frontmatter |
| Connectivity module | [src/modules/connectivity/](src/modules/connectivity/) | Inbound/outbound link score leaderboard with folder filter |
| Focal Node module | [src/modules/focal-node/](src/modules/focal-node/) | BFS graph (Cytoscape.js) of the active file's neighborhood |
| Cross-Vault module | [src/modules/cross-vault/](src/modules/cross-vault/) | Vault-wide scanner for `obsidian://` URIs; CSV export |

---

## Folder & File Reference

```
src/
├── main.ts                        ← plugin entry point
├── settings.ts                    ← re-export shim → settings/settings.ts
│
├── core/
│   ├── event-bus.ts               ← EventBus class
│   ├── module-registry.ts         ← ModuleRegistry class
│   └── layout-store.ts            ← preset/slot utility functions
│
├── interfaces/
│   ├── i-module.ts                ← IModule interface
│   └── i-layout.ts                ← HeightMode, ISlot, IPreset, IPluginLayout
│
├── settings/
│   ├── settings.ts                ← PluginSettings type + DEFAULT_SETTINGS
│   └── settings-tab.ts            ← Obsidian PluginSettingTab UI
│
├── framework/
│   ├── control-panel.view.ts      ← main sidebar ItemView
│   ├── layout-engine.ts           ← DOM renderer for module slots
│   ├── widget-host.ts             ← per-slot UI wrapper
│   └── preset-manager.ts          ← preset CRUD + persistence
│
└── modules/
    ├── note-anatomy/
    │   ├── note-anatomy.module.ts ← IModule impl; reads file + metadata cache
    │   ├── note-anatomy.view.ts   ← tab-based UI (headings / URLs / cross-vault / frontmatter)
    │   └── markdown-parser.ts     ← parseHeadings, parseExternalUrls, parseCrossVaultRefs
    │
    ├── connectivity/
    │   ├── connectivity.module.ts ← IModule impl; debounced metadataCache listener
    │   ├── connectivity.view.ts   ← leaderboard UI with inbound/outbound toggle
    │   └── link-counter.ts        ← computeScores, filterAndSort
    │
    ├── focal-node/
    │   ├── focal-node.module.ts   ← IModule impl; active-file-changed listener
    │   ├── focal-node.view.ts     ← Cytoscape graph + depth slider
    │   └── graph-builder.ts       ← BFS traversal; buildGraph, buildBacklinkIndex
    │
    └── cross-vault/
        ├── cross-vault.module.ts  ← IModule impl; vault 'modify' listener (debounced)
        ├── cross-vault.view.ts    ← table UI + scan/export buttons
        ├── vault-scanner.ts       ← scans all .md files for obsidian:// URIs
        └── csv-exporter.ts        ← RFC 4180 CSV builder + browser download trigger
```

---

## Bootstrap Sequence

1. `main.ts → onload()` — load saved settings, register the control-panel view type, add ribbon icon and command palette entry
2. `ModuleRegistry.loadAll(app, eventBus)` — calls `module.onload()` on each of the four modules; each module registers its event listeners
3. `activateControlPanel()` — opens (or focuses) the right-sidebar leaf and sets its view to `ControlPanelView`
4. `ControlPanelView.onOpen()` — creates `PresetManager` from saved layout, builds the preset selector header, creates `LayoutEngine` + slot container, calls `render()` for the active preset
5. `LayoutEngine.render()` — for each visible slot in order-sorted sequence, creates a `WidgetHost`, which calls `module.getView()` and mounts the result into the DOM

---

## Adding a New Module

1. Create `src/modules/<name>/` with at minimum `<name>.module.ts` (implement `IModule`) and a view file
2. In [src/main.ts](src/main.ts), import and register: `registry.register(new MyModule())`
3. In [src/settings/settings.ts](src/settings/settings.ts), add `'<moduleId>': false` to `DEFAULT_SETTINGS.enabledModules`
4. In [src/settings/settings-tab.ts](src/settings/settings-tab.ts), add a toggle for the new module ID

The module will automatically appear as a collapsible slot in the control panel once enabled.

---

## Development

```
npm install          # install dependencies
npm run dev          # watch mode (esbuild)
npm run build        # production build
```

The compiled `main.js` is output to the plugin root and loaded directly by Obsidian.
