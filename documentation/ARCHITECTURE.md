# System Architecture

## Overview

Jenga Wealth is a **single-page application (SPA)** delivered as one self-contained HTML file. There is no build step, no bundler, no server, and no external runtime dependencies. The entire application — HTML, CSS, and JavaScript — resides in `index.html`.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│                   index.html                        │
│  ┌───────────────────────────────────────────────┐  │
│  │  HTML Structure (semantic markup, views divs) │  │
│  ├───────────────────────────────────────────────┤  │
│  │  CSS (dark theme, glassmorphism, responsive)  │  │
│  │  - CSS custom properties (design tokens)      │  │
│  │  - Mobile-first responsive grid               │  │
│  │  - Animations, transitions, glass effects     │  │
│  ├───────────────────────────────────────────────┤  │
│  │  JavaScript (SPA engine + business logic)     │  │
│  │  - Data layer (localStorage CRUD)             │  │
│  │  - Router (hash-free, in-memory page state)   │  │
│  │  - Render functions (one per view/page)       │  │
│  │  - Business logic (loans, savings, chat)      │  │
│  └───────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────┘
                       │
            ┌──────────▼──────────┐
            │   Browser (Client)  │
            │   localStorage API  │
            └─────────────────────┘
```

## Application Flow

```
                   ┌──────────┐
                   │  Login   │
                   └────┬─────┘
                        │
              ┌─────────▼──────────┐
              │  Role-based Router │
              │  (renderPage)      │
              └─────────┬──────────┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
   ┌─────────┐    ┌──────────┐    ┌──────────┐
   │  Admin  │    │Treasurer │    │  Member  │
   ├─────────┤    ├──────────┤    ├──────────┤
   │Overview │    │Overview  │    │Dashboard │
   │Financial│    │Collections│   │Savings   │
   │Members  │    │Stream    │    │Loans     │
   │Loans    │    │Ledger    │    │Chat      │
   │Risk     │    │Loans     │    │Announce. │
   │Users    │    │Reports   │    └──────────┘
   │Announce.│    │Chat      │
   │Chat     │    │Savings   │
   └─────────┘    │Transact. │
                  └──────────┘
```

## Key Design Decisions

### 1. Single-File Architecture
- **Why**: Zero deployment friction. Users just open the file in a browser.
- **Trade-off**: All code in one file makes it large (~1500 lines), but eliminates build/config complexity.
- **Mitigation**: Code is organized with clear section comments and consistent naming conventions.

### 2. localStorage for Persistence
- **Why**: Offline-first, no server required, instant setup.
- **Limitations**: ~5-10MB storage limit, synchronous API, no querying/indexing.
- **Data keys**: All keys prefixed with `sacco_` (e.g., `sacco_users`, `sacco_loans`).

### 3. Template Rendering via String Concatenation
- **Why**: No framework overhead. All rendering is manual `innerHTML` assignment.
- **Pattern**: Functions follow the naming convention `render<ViewName>()` and populate a `<div id="view-<name>">` element.

### 4. Navigation
- In-memory `currentPage` variable tracks the active view.
- The `navigate(page)` function activates the correct view div and calls the corresponding render function.
- Sidebar and mobile nav are re-rendered on login and reflect the current user's role.

## Languages & Frameworks

| Component | Technology | Version |
|-----------|-----------|---------|
| Markup | HTML5 | — |
| Styling | CSS3 (Custom Properties) | — |
| Programming | JavaScript (ES6+) | — |
| Icons | Font Awesome | 6.5.1 |
| Storage | Web Storage API (localStorage) | — |
| Fonts | System font stack | — |

**No frameworks, no bundlers, no build tools, no server-side code.**

## Responsive Design Breakpoints

| Breakpoint | Layout |
|-----------|--------|
| < 768px | Mobile: bottom tab navigation, single column |
| ≥ 768px | Desktop: sidebar navigation, multi-column grid |

## Data Flow

```
User Action → Event Handler → DB.get/set (localStorage) → Render Function → DOM Update
```

All data mutations follow this pattern:
1. User interacts with a form or button
2. JavaScript event handler fires
3. Data is read from localStorage via `DB.get()`
4. Data is modified (push, filter, map)
5. Data is written back via `DB.set()`
6. The corresponding render function is called to refresh the view
