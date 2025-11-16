# View Implementation Plan – Scenario Selection View

## 1. Overview
- Presents the scenarios fetched from the `scenarios` table.
- Communicates weekly completion progress (X/3 and reset date), single active-session constraints, and rate-limit messaging in the helper's voice.
- Provides a horizontal, desktop-first carousel that shows exactly three tiles at a time; a right-hand scroll/advance button (">" control) reveals additional scenarios when they exist.
- The full carousel is ALWAYS visible, regardless of whether a session is active or the limit is reached.
- When a scenario is active OR the weekly limit is reached, ALL tiles are disabled (grayed-out, not clickable) with identical visual treatment.
- A unified status banner below the carousel informs users why tiles are disabled, with helper-voice content varying based on the reason (active session vs. rate limit).
- Users can replay any scenario multiple times; there is no "completed" state or visual indicator for previously finished scenarios.

## 2. View Routing
- Astro page at `/scenarios`.
- Server-side renders via `src/pages/scenarios.astro` with SSR data loading (scenarios, active session summary, weekly usage stats); hydrates a React island for interactive behavior.
- Requires authenticated session context (middleware-provided Supabase client) before rendering.

## 3. Component Structure
- `pages/scenarios.astro`
  - `TopNavigation` (existing shared component)
  - `ScenarioSelectionSection` (React, client:load)
    - `ScenarioStatusHeader`
    - `ScenarioCarousel`
      - `ScrollButton` (left, conditional)
      - `ScenarioTilesTrack`
        - `ScenarioTile` × N (visible subset of scenarios)
      - `ScrollButton` (right, always rendered but disabled when no more tiles; satisfies "button to scroll the scenarios right" requirement)
    - `StatusBanner` (conditional: shown when active session exists OR rate limit reached)
    - `ErrorStatePanel` (conditional)
    - `ScenarioGridSkeleton` (fallback while data loading)

## 4. Component Details

### `pages/scenarios.astro` (ScenariosPage)
- **Description:** Astro SSR entry point. Fetches data, renders top-level layout, and passes serialized props to the React section.
- **Main elements:** `<Layout>` wrapper, `<TopNavigation>`, `<ScenarioSelectionSection client:load ... />`.
- **Handled interactions:** None client-side; delegates to React component.
- **Validation conditions:** Ensures SSR data includes `scenarios` array (length ≥ 0), optional `activeSession`, and `weeklyUsage`.
- **Types:** `ScenarioSelectionPageProps` (defined in Types section).
- **Props to child:** `{ data: ScenarioSelectionPageProps }` serialized via Astro’s `set:html` or JSON script tag.

### `ScenarioSelectionSection`
- **Description:** React container orchestrating state, actions, and conditional rendering for the selection experience.
- **Main elements:** status header, carousel (always showing all scenarios), conditional status banner below carousel, error panel, skeleton.
- **Handled interactions:** 
  - Calls `handleStartScenario(scenarioId)` for available tiles (when no active session and under weekly limit).
  - Calls `handleResume()` redirect when active session exists and user interacts with the status banner's resume action.
  - Manages carousel navigation via `handleScroll(direction)`.
- **Validation conditions:** 
  - Blocks ALL tile interactions when `activeSession` exists (all tiles disabled).
  - Blocks ALL tile interactions when `weeklyUsage.completedCount >= weeklyUsage.limit` (all tiles disabled).
  - Prevents duplicate POST calls per scenario via `actionState[scenarioId]`.
- **Types:** `ScenarioSelectionPageProps`, `ScenarioDisplayModel`, `ScenarioActionState`, `ApiErrorDTO`, `ActiveSessionSummary`, `WeeklyUsageDTO`.
- **Props:** `{ data: ScenarioSelectionPageProps }`.

### `ScenarioStatusHeader`
- **Description:** Displays completion counter, reset date, and helper-voice copy describing state.
- **Main elements:** 
  - Kanji lockup (`魔 間`) or inline brand text.
  - Text block `"{completed}/3 scenarios this week • Resets {weekday, Month Day}"`.
  - Optional helper-voice subline describing rate limit proximity.
- **Handled interactions:** None; purely informational.
- **Validation conditions:** 
  - Format reset date in local timezone.
  - If `completedCount > limit`, clamp display to `limit`.
- **Types:** Receives `WeeklyUsageDTO`.
- **Props:** `{ usage: WeeklyUsageDTO }`.

### `StatusBanner`
- **Description:** Unified banner component positioned BELOW the carousel. Explains why all tiles are disabled using helper-voice messaging. Content varies based on the blocking reason: active session or rate limit reached.
- **Main elements:** Shadcn `Alert` or custom banner containing context-specific helper-voice copy and optional actions.
- **Handled interactions:** 
  - **When active session:** Primary "Resume scenario" button calling `handleResume()` to redirect to active session.
  - **When rate limited:** Optional "Refresh status" button or informational countdown to reset date.
  - Secondary "Explain rule" tooltip triggered on icon hover (optional enhancement).
- **Validation conditions:** 
  - Render when `activeSession !== null` OR `weeklyUsage.completedCount >= weeklyUsage.limit`.
  - Choose content template based on blocking condition.
- **Types:** `ActiveSessionSummary | null`, `WeeklyUsageDTO`, `StatusBannerVariant`.
- **Props:** `{ variant: 'active-session' | 'rate-limit'; activeSession?: ActiveSessionSummary; usage?: WeeklyUsageDTO; onResume?: () => void; onRefresh?: () => void }`.

### `ScenarioCarousel`
- **Description:** Horizontal flex/scroll container showing three tiles at a time (fixed width). Contains scroll buttons to move the visible window. ALWAYS displays the full set of scenarios regardless of active session or rate limit state.
- **Main elements:** 
  - `<div role="region">` with `aria-label="Scenario carousel"`.
  - `ScrollButton` on left (hidden when `visibleStartIndex === 0`).
  - `ScenarioTilesTrack`: flex row with `overflow:hidden`, `transform: translateX(...)` based on `visibleStartIndex`.
  - `ScrollButton` on right (always rendered but disabled when `visibleStartIndex + visibleCount >= scenarios.length`).
- **Handled interactions:** 
  - `onScroll(direction: 'left'|'right')` adjusts `visibleStartIndex` while clamping to bounds.
  - Wheel/trackpad events update state when user scrolls horizontally (optional enhancement).
  - Passes tile clicks to parent, which blocks interaction when tiles are globally disabled.
- **Validation conditions:** 
  - Guarantee `visibleCount = Math.min(3, scenarios.length)`; fill remaining slots with ghost tiles if needed to keep layout centered.
  - Hide carousel entirely when scenarios array empty and show error fallback.
  - When active session exists or rate limit reached, pass `allTilesDisabled: true` to all tiles for consistent visual treatment.
- **Types:** Accepts `ScenarioDisplayModel[]`, `ScenarioCarouselState`, `allTilesDisabled: boolean`.
- **Props:** `{ scenarios: ScenarioDisplayModel[]; visibleState: ScenarioCarouselState; allTilesDisabled: boolean; onScroll: (dir) => void; onTileClick: (scenarioId) => void }`.

### `ScrollButton`
- **Description:** Shared control for left/right scroll; styled as minimalist circle containing kanji arrow or ">". Functions independently of tile disabled state (user can still scroll through disabled tiles).
- **Main elements:** `<button>` with icon, aria-label ("Show previous scenarios", "Show more scenarios").
- **Handled interactions:** `onClick` triggers parent-supplied direction.
- **Validation conditions:** 
  - Disabled when movement would exceed bounds.
  - Always render right button to satisfy "button to scroll the scenarios right" requirement (disabled if no additional scenarios).
  - NOT disabled when tiles are globally disabled; only controlled by carousel bounds.
- **Types:** None beyond intrinsic props.
- **Props:** `{ direction: 'left'|'right'; disabled: boolean; onPress: () => void }`.

### `ScenarioTile`
- **Description:** Represents each scenario. Handles states: available (default) or disabled (grayed-out, not clickable). No "completed" or "resume" states exist since users can replay scenarios freely.
- **Main elements:** 
  - Shadcn `Card` wrapper (200–250px square) with emoji, gradient background, overlay banner for title.
  - Loading overlay/spinner when `actionState === 'starting'`.
  - Disabled visual treatment: reduced opacity, grayscale filter, disabled cursor.
- **Handled interactions:** 
  - `onClick` and `onKeyDownEnter/Space` call `onSelect(scenarioId)` if tile is NOT disabled.
  - Hover/focus shows title overlay; accessible `aria-label` describing scenario.
- **Validation conditions:** 
  - When `allTilesDisabled === true` (active session OR rate limit), ALL tiles receive identical disabled visual treatment.
  - If backend marks scenario `is_active: false`, tile is individually marked "Unavailable" and disabled.
  - Pointer events and interactions blocked when disabled.
- **Types:** `ScenarioDisplayModel`, `ScenarioActionState`, `ApiErrorDTO`.
- **Props:** `{ scenario: ScenarioDisplayModel; disabled: boolean; actionState: ScenarioActionState; onSelect: (scenarioId) => void }`.

### ~~`RateLimitNotice`~~ (REMOVED – merged into `StatusBanner`)
- This component is replaced by the unified `StatusBanner` component, which handles both rate-limit and active-session messaging with identical visual treatment.

### `ErrorStatePanel`
- **Description:** Displays API/load failures (e.g., GET /api/scenarios error) in helper persona.
- **Main elements:** Copy, error code, `Retry` button calling `refetch()`.
- **Handled interactions:** Retry triggers GET call.
- **Validation conditions:** Accepts `ApiErrorDTO | null`.
- **Types:** `ApiErrorDTO`.
- **Props:** `{ error: ApiErrorDTO | null; onRetry: () => void }`.

### `ScenarioGridSkeleton`
- **Description:** Placeholder shimmer showing three tile slots while data fetch is pending.
- **Main elements:** Animated gradient blocks sized like tiles.
- **Handled interactions:** None.
- **Validation conditions:** Render before data resolved or during refetch.
- **Types:** None (internal only).
- **Props:** None.

## 5. Types
- **Existing DTOs (import from `src/types.ts`):**
  - `ScenarioListItemDTO`
  - `ScenarioDetailDTO`
  - `ScenarioCreatedDTO`
  - `CreateSessionCommand`
  - `ApiErrorDTO`
- **New View Models:**
  - `ScenarioSelectionPageProps`  
    ```ts
    interface ScenarioSelectionPageProps {
      scenarios: ScenarioListItemDTO[];
      weeklyUsage: WeeklyUsageDTO;
      activeSession: ActiveSessionSummary | null;
    }
    ```
  - `ActiveSessionSummary`  
    ```ts
    interface ActiveSessionSummary {
      session_id: string;
      scenario_id: number;
      scenario_title: string;
      started_at: string; // ISO
    }
    ```
  - `WeeklyUsageDTO`  
    ```ts
    interface WeeklyUsageDTO {
      completedCount: number;
      limit: number; // 3
      resetDateIso: string;
    }
    ```
  - `ScenarioDisplayModel`  
    ```ts
    interface ScenarioDisplayModel {
      id: number;
      title: string;
      emoji: string;
      initialMessages: {
        main: string;
        helper: string;
      };
      isActive: boolean; // from backend is_active flag
    }
    ```
  - `ScenarioActionState`  
    ```ts
    type ScenarioActionState = Record<number, {
      status: 'idle' | 'starting' | 'error';
      error?: ApiErrorDTO;
    }>;
    ```
  - `ScenarioCarouselState`  
    ```ts
    interface ScenarioCarouselState {
      visibleStartIndex: number;
      visibleCount: number; // always 3 when possible
      hasPrev: boolean;
      hasNext: boolean;
    }
    ```
  - `StatusBannerVariant`  
    ```ts
    type StatusBannerVariant = 'active-session' | 'rate-limit';
    ```

## 6. State Management
- **SSR data hydration:** `ScenarioSelectionSection` receives fully-populated props; stores them in React state only when mutations occur (e.g., after successful POST, before redirect).
- **React state:**
  - `displayScenarios: ScenarioDisplayModel[]` – derived once from props (simple mapping from `ScenarioListItemDTO[]`).
  - `carouselState: ScenarioCarouselState` – default `{ visibleStartIndex: 0, visibleCount: Math.min(3, list.length), hasPrev: false, hasNext: list.length > 3 }`.
  - `actionState: ScenarioActionState` – tracks start requests per scenario.
  - `apiError: ApiErrorDTO | null` – GET failure or POST error surfaced to user.
  - `isRefetching: boolean` – toggled when user clicks retry or refresh.
  - `allTilesDisabled: boolean` – computed from `activeSession !== null || weeklyUsage.completedCount >= weeklyUsage.limit`.
  - `statusBannerVariant: StatusBannerVariant | null` – determines which banner content to show below carousel.
- **Hooks:**
  - `useScenarioCarousel(scenariosLength: number)` – encapsulates logic for `visibleStartIndex`, `hasPrev`, `hasNext`, button aria states, and keyboard navigation.
  - `useScenarioActions()` (optional) – handles POST request, error mapping, success redirect, and updates `actionState`.

## 7. API Integration
- **GET `/api/scenarios`**
  - **Usage:** Called during Astro SSR (server-side) using Supabase client. Receives `{ scenarios: ScenarioListItemDTO[] }`.
  - **Validation:** Filter to `is_active = true`, sort by `sort_order`.
  - **Errors:** On failure, pass `ApiErrorDTO` to page and render `ErrorStatePanel`.
- **GET `/api/sessions/active`** (or equivalent; implement if missing)
  - **Usage:** SSR call returning `ActiveSessionSummary` or `null`.
  - **Purpose:** Determines whether to auto-redirect or show resume tile.
- **GET `/api/profile/usage`** (or equivalent)
  - **Usage:** Returns `WeeklyUsageDTO`.
- **POST `/api/sessions`**
  - **Request Body:** `CreateSessionCommand` `{ scenario_id }`.
  - **Response:** `SessionCreatedDTO` containing `id`, scenario embed, and `initial_messages`.
  - **Client Action:** On success, navigate to `/session?sessionId=${id}` (or server-provided URL).
  - **Error Handling:** Capture `ApiErrorDTO`, update `actionState[scenarioId].error`, show helper-voice copy.

## 8. User Interactions
- **Click/tap ScenarioTile (when enabled):** triggers POST to create session; tile shows spinner; on success, redirect to `/session`.
- **Click ScenarioTile (when disabled):** no action; pointer events blocked. User must check `StatusBanner` below carousel for explanation.
- **Hover/focus tile:** reveal scenario title overlay regardless of disabled state; ensures keyboard accessibility.
- **Click right ScrollButton:** increments `visibleStartIndex` by 3 (or by remainder). Works even when tiles disabled. Disabled only when `hasNext === false`.
- **Click left ScrollButton:** decrements `visibleStartIndex` by 3; works even when tiles disabled. Hidden when `visibleStartIndex === 0`.
- **Click "Resume scenario" in StatusBanner (active session variant):** redirect to `/session?id=${activeSession.session_id}`.
- **Click "Refresh status" in StatusBanner (rate limit variant):** re-fetches weekly usage data to check if limit reset.
- **Click Retry button in ErrorStatePanel:** re-fetches scenarios (via client fetch or page reload).
- **Keyboard interactions:** arrow keys to move carousel focus, Enter/Space to activate tile (if enabled). Provide `tabIndex=0` for each tile.

## 9. Conditions and Validation
- **Weekly limit:** `completedCount >= limit` ⇒ ALL tiles disabled with identical visual treatment, `StatusBanner` shown with `variant='rate-limit'`. Carousel scroll buttons remain functional.
- **Active session:** when `activeSession` present:
  - ALL tiles disabled with identical visual treatment (same as rate limit).
  - `StatusBanner` shown with `variant='active-session'`, containing scenario title and "Resume scenario" button.
  - `ScenarioStatusHeader` may include subtle indicator referencing active scenario title (optional).
- **Scenario availability:** Use backend `is_active` flag. If false, that individual tile is disabled and marked "Unavailable" regardless of global state.
- **Global disabled state:** Computed as `allTilesDisabled = (activeSession !== null) || (completedCount >= limit)`.
- **Visual consistency:** Whether disabled by active session or rate limit, tiles receive IDENTICAL styling (grayscale, reduced opacity, disabled cursor).
- **API guard:** If POST returns `validation_error` or `session_active`, show inline error; optionally trigger data refetch to sync.
- **Carousel bounds:** Ensure `visibleStartIndex` remains within `[0, scenarios.length - visibleCount]`.
- **Data completeness:** If `scenarios.length === 0`, show helper message ("The NPCs are on strike") and hide carousel entirely.

## 10. Error Handling
- **Data fetch failure (SSR):** Render `ErrorStatePanel` with helper-voice copy and server-provided message; include `Retry` button performing `window.location.reload()`.
- **Partial data (e.g., scenarios OK, weekly usage missing):** fall back to default usage `{ completedCount: 0, limit: 3, resetDateIso: nextMonday }` and display warning badge ("Usage unavailable. Assume unlimited—for now.").
- **POST `/api/sessions` failure:** 
  - Display inline error via `actionState[scenarioId].error` and show toast ("The API has abandoned us. Try again.").
  - Re-enable tile interaction and log event.
- **Race conditions (active session created elsewhere):** Backend may respond with `session_active`. Handle by refreshing page state, disabling all tiles, and showing `StatusBanner` with active session details.
- **Network offline:** Detect via `navigator.onLine`; disable all actions and show inline message ("No connection. The void is quiet.").

## 11. Implementation Steps
1. **Server data plumbing**
   - Extend `pages/scenarios.astro` load function to fetch scenarios (`GET /api/scenarios`), active session summary, and weekly usage stats.
   - Map DTOs into `ScenarioSelectionPageProps` (no `completedScenarioIds` needed) and serialize for hydration.
2. **Create view models**
   - Implement utility `mapScenarioToDisplayModel(scenario)` returning simplified `ScenarioDisplayModel` (id, title, emoji, initialMessages, isActive).
   - Add helper for deriving `ScenarioCarouselState`.
3. **Build React container**
   - Scaffold `ScenarioSelectionSection` with hooks/state derived from props.
   - Compute `allTilesDisabled` and `statusBannerVariant` from active session and weekly usage.
   - Integrate skeleton, error panel, and conditional unified `StatusBanner`.
4. **Implement status header**
   - Create `ScenarioStatusHeader` ensuring helper-voice copy and accessible text.
5. **Implement carousel frame**
   - Build `ScenarioCarousel`, `ScrollButton`, and `ScenarioTilesTrack` with CSS transforms to show three tiles at a time.
   - ALWAYS render full carousel; pass `allTilesDisabled` prop to control tile state.
   - Ensure scroll buttons function independently of tile disabled state.
6. **Create ScenarioTile component**
   - Support two primary states: available (default) and disabled (grayed-out).
   - Remove "completed" and "resume" states entirely.
   - Apply disabled styling (grayscale, opacity, cursor) when `disabled` prop is true.
   - Show hover overlay, spinner overlay, keyboard activation support.
7. **Implement unified StatusBanner**
   - Create single `StatusBanner` component accepting `variant` prop ('active-session' | 'rate-limit').
   - Position BELOW carousel (not above).
   - Render helper-voice content specific to variant.
   - Include "Resume scenario" button for active session, "Refresh status" for rate limit.
8. **Wire API interactions**
   - Implement `handleStartScenario` using `fetch('/api/sessions', { method: 'POST', body: { scenario_id } })`.
   - Block all tile clicks when `allTilesDisabled === true`.
   - On success, redirect to `/session?id=${sessionId}`; on failure, update `actionState`.
9. **Ensure visual consistency**
   - Verify that disabled tiles look IDENTICAL whether caused by active session or rate limit.
   - Only the `StatusBanner` content should differ.
10. **Accessibility & UX polish**
    - Add `aria-live` for helper messages, focus management for spinner overlay, keyboard shortcuts for carousel.
    - Ensure emoji have `aria-label` attributes describing scenario.
    - Communicate disabled state via `aria-disabled` and screen reader announcements.
11. **Testing**
    - Verify states: default (all enabled), active session (all disabled + active banner), rate limited (all disabled + rate limit banner), API failure.
    - Confirm visual parity between active session and rate limit disabled states.
    - Check carousel behavior with mock >3 scenarios (seed additional entries locally).
    - Test carousel scrolling works even when tiles are disabled.
12. **Documentation**
    - Update `.ai/ui-plan.md` or README if needed to reflect unified banner approach and removal of completion tracking.


