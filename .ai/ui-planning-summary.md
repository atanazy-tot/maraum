<conversation_summary>

<decisions>

**State Management & Architecture**
1. Use React Context API for state management (no external libraries like Zustand/Jotai for MVP)
2. SessionContext structure with session data, separate main/helper messages arrays, loading states, and action methods
3. DualChatInterface as React component with `client:load` directive, receiving server-fetched initial data as props

**Visual Design & UI Components**
4. Use two distinct loading indicators: pulsing spinner during API wait, minimal letter-by-letter animation when receiving response
5. Simplified scenario tiles: only two visual states (full color when available, grayscale when blocked), no separate buttons
6. Square tiles with emoji icons (200-250px), hover shows enigmatic title description
7. When session is active, show ONLY that scenario tile centered with explanatory text below
8. Minimal top navigation: Maraum logo/魔間 (left), profile icon (right)
9. Use default colors for MVP - avoid design decisions that block progress
10. Maintain minimal, uniform style throughout the entire application

**Session & Completion Handling**
11. No automatic redirection from scenarios page to active session - show resumable tile instead
12. On scenario completion: show minimal banner at top "Scenario has been concluded" and gray out input fields
13. NO additional navigation buttons in completion banner (use existing top nav)
14. NO automatic redirection after completion - user navigates manually
15. Completion flag triggers CompletionBanner display and disables MessageInput components

**Component Structure**
16. Reusable ChatPanel component for both main and helper chats with independent state
17. Component hierarchy: SessionPage.astro → DualChatInterface → ChatPanel → MessageList/MessageInput → Message
18. Single Message component with conditional styling based on role (user vs assistant) and chat type
19. MessageInput component with onSend callback, isLoading prop, controlled input pattern

**Technical Implementation**
20. Use Astro's top-level await for server-side data fetching before rendering React components
21. Use Astro ViewTransitions API for smooth page navigation
22. Custom useTypingAnimation hook with requestAnimationFrame for smooth character-by-character display
23. Each Message component instance runs independent animation without conflicts
24. MessageList implements auto-scrolling using refs and scrollIntoView()

**API Integration & Services**
25. Service layer structure: scenarios.service.ts, session.service.ts, messages.service.ts
26. Custom ApiError class for consistent error handling with statusCode, errorCode, details
27. Error messages displayed in helper's voice using error message templates
28. Optimistic UI: user messages appear immediately with "sending" indicator
29. Environment variables with PUBLIC_ prefix for client-accessible values

**Authentication & User Management**
30. Auth disabled for MVP - use mock "dummy" users from database migration
31. getMockUser() utility function returning hardcoded user ID
32. Landing page with simple "Enter as Test User" button for MVP
33. Skip actual login form implementation for now

**Pages & Routing**
34. Page structure: index.astro (landing), scenarios.astro (selection), session.astro (active chat), profile.astro (user info & history)
35. Use Astro middleware for eventual authentication checks and redirects
36. Scenarios page logic: server-side check for active session, conditional rendering based on result

**Profile & History**
37. Profile page vertical layout: user email, completion stats (X/3 scenarios), completed scenarios row
38. History displayed as horizontal scrollable row of scenario tiles (same style as selection)
39. Clicking completed scenario opens full-screen HistoryModal with read-only dual-chat replay
40. HistoryModal shows 50/50 split layout matching active session view

**Shadcn/ui Components**
41. Install only essential components: button, card, dialog, input, textarea, separator
42. Avoid installing unnecessary components to keep bundle minimal

**Out of Scope for MVP**
43. No mobile optimization or responsive design for MVP
44. No accessibility options or preferences for MVP
45. No automatic session restoration redirects
46. No complex color scheme decisions - use defaults

</decisions>

<matched_recommendations>

**State Management**
1. Use React Context API for session state management with structure:
   - session, mainMessages, helperMessages, loading states, action methods (sendMainMessage, sendHelperMessage, loadSession)
   - Wrap DualChatInterface with SessionProvider, expose via useSession() hook

**Component Architecture**
2. Reusable ChatPanel component accepting props: chatType, messages, onSendMessage, isLoading
3. Component hierarchy: SessionPage.astro → DualChatInterface (React) → ChatPanel → MessageList → Message, and MessageInput
4. Single Message component with conditional styling based on message.role (user: right-aligned, assistant: left-aligned)
5. MessageInput component: controlled input, onSend prop, disabled when isLoading, clear after send, Enter to send

**Visual Design**
6. Three square scenario tiles (200-250px) horizontally centered with generous spacing
7. Large emoji icon (64-80px) centered in each tile
8. Hover overlay with semi-transparent dark layer and scenario title
9. When active session exists: show only that tile centered with text "Complete this scenario to start another"
10. Two loading indicators: pulsing spinner during API calls, subtle typing animation during character display

**Page Structure & Routing**
11. Astro pages: index.astro (landing), scenarios.astro (selection), session.astro (active), profile.astro (user/history)
12. Use Astro middleware for authentication checks and redirects
13. Server-side data fetching using Astro's top-level await before React hydration
14. Pass server-fetched data as props to React components for fast initial render

**Session Management**
15. In scenarios.astro: server-side check for active session, conditional rendering
16. If active session exists: render single ScenarioTile with explanatory text
17. No automatic redirection - user must click to resume session
18. Session restoration: load session data with messages, pass to SessionProvider

**Completion Handling**
19. CompletionBanner component: fixed/sticky at top when is_completed === true
20. Shows message "Scenario has been concluded" (no additional navigation buttons)
21. Disable both MessageInput components when session is completed
22. Check API response for completion_flag_detected in SessionContext
23. No automatic redirection - user navigates manually via top nav

**Animation & UX**
24. Custom useTypingAnimation hook using requestAnimationFrame:
   - Independent instance per Message component
   - Returns displayedText substring
   - Speed parameter (default 20ms per character)
25. Auto-scroll in MessageList using ref and scrollIntoView({ behavior: 'smooth' })

**API Integration**
26. Service layer in /src/lib/services/: scenarios.service.ts, session.service.ts, messages.service.ts
27. Each service handles fetch calls, error handling, returns typed data
28. ApiError class extending Error with statusCode, errorCode, details properties
29. Error messages displayed using helper's voice from template file
30. Optimistic UI: user messages appear immediately before API confirmation

**Mock Authentication**
31. getMockUser() utility in /src/lib/utils/mock-auth.ts returning hardcoded user ID
32. Store mock user in cookie/localStorage on app load
33. Landing page with "Enter as Test User" button that sets mock cookie and redirects to /scenarios
34. Skip actual login form for MVP debugging speed

**Environment & Configuration**
35. Environment variables in .env with PUBLIC_ prefix for client-accessible values
36. Access in Astro via import.meta.env.PUBLIC_API_BASE_URL
37. Pass to React components as props or via config file

**Profile & History**
38. Profile page vertical layout: email, logout button, completion stats, history row
39. "X/3 scenarios this week • Resets Monday" format
40. Horizontal scrollable row of completed scenario tiles (emoji + date on hover)
41. Clicking tile opens HistoryModal: full-screen, dual-chat replay, 50/50 split, read-only
42. Generous spacing, minimal typography, no heavy borders

**Technical Implementation**
43. Use Astro ViewTransitions API with <ViewTransitions /> in Layout.astro
44. ScenarioTile component with hover state showing title overlay
45. On click: call createSession(), await, navigate to /session?id={newSessionId}
46. DualChatInterface as client:load React component with initial data from server

**Shadcn/ui Setup**
47. Install only: button, card, dialog, input, textarea, separator
48. Keep bundle minimal by avoiding unnecessary components

</matched_recommendations>

<ui_architecture_planning_summary>

## Overview

The Maraum MVP UI architecture focuses on a minimal, enigmatic aesthetic that supports dual-chat German language learning. The implementation prioritizes simplicity and rapid development, deferring mobile optimization, accessibility features, and complex design decisions to post-MVP phases. Authentication is mocked for faster debugging.

## Core Architecture

### Framework & Technology Stack
- **Astro 5** with SSR for pages and server-side data fetching
- **React 19** for interactive components with client:load hydration
- **Tailwind 4** with default configuration (custom colors deferred)
- **Shadcn/ui** with minimal component subset (button, card, dialog, input, textarea, separator)
- **TypeScript 5** throughout
- Desktop-only for MVP (no mobile/responsive considerations)

### State Management Strategy
- **React Context API** for session state (no external libraries)
- SessionContext provides:
  - Session metadata (id, is_completed, scenario info)
  - Separate message arrays for main and helper chats
  - Independent loading states (isMainLoading, isHelperLoading)
  - Action methods (sendMainMessage, sendHelperMessage, loadSession)
- SessionProvider wraps DualChatInterface, components access via useSession() hook
- Server-side data fetching in Astro pages, passed as initial props to React components

## Key Views & Screens

### 1. Landing Page (`/index.astro`)
**Purpose:** Entry point with mock authentication for MVP

**Layout:**
- Centered vertical layout
- 魔 間 kanji characters prominent
- "MARAUM" branding
- Enigmatic copy: "You want to learn German. How quaint."
- Simple "Enter as Test User" button (sets mock user cookie, redirects to /scenarios)
- Skip actual login form for MVP

**Implementation:**
- Static Astro page
- getMockUser() utility sets hardcoded user ID in cookie
- Minimal styling with default Tailwind

### 2. Scenario Selection Page (`/scenarios.astro`)
**Purpose:** Choose or resume scenario

**Layout - No Active Session:**
- Three square tiles (200-250px) horizontally centered
- Each tile: large emoji icon (64-80px) centered
- Hover: semi-transparent overlay with scenario title
- Full color when available, grayscale when blocked (rate limit)
- Click tile to create session and navigate

**Layout - Active Session Exists:**
- Single tile centered showing active scenario
- Text below: "Complete this scenario to start another"
- Other scenarios not shown
- Click to navigate to /session page (no auto-redirect)

**Implementation:**
- Server-side: fetch scenarios, check for incomplete session
- Pass data to React ScenarioGrid component
- Conditional rendering based on activeSession presence
- ScenarioTile component handles hover state and click → createSession() → navigate

### 3. Active Session Page (`/session.astro`)
**Purpose:** Dual-chat interface for German conversation practice

**Layout:**
- 50/50 horizontal split (CSS Grid)
- Left panel: 魔 (Main chat - German)
- Right panel: 間 (Helper chat - English)
- Minimal top nav: Maraum logo (left), profile icon (right)
- CompletionBanner at top when scenario completes (sticky, minimal)

**Component Hierarchy:**
```
SessionPage.astro (Astro wrapper)
  └─ DualChatInterface (React, client:load)
      ├─ CompletionBanner (conditional)
      ├─ ChatPanel (Main)
      │   ├─ MessageList
      │   │   └─ Message (multiple)
      │   └─ MessageInput
      └─ ChatPanel (Helper)
          ├─ MessageList
          │   └─ Message (multiple)
          └─ MessageInput
```

**ChatPanel Component:**
- Reusable for both chats
- Props: chatType ('main'|'helper'), messages, onSendMessage, isLoading
- Independent scroll and input state
- Identical layout, different data

**Message Component:**
- Single component for all message types
- Conditional styling based on role:
  - User: right-aligned, distinct background
  - Assistant: left-aligned, chat-type-specific subtle accent
- Timestamp below message (small, gray)
- Uses useTypingAnimation hook for character-by-character display

**MessageInput Component:**
- Controlled Shadcn Textarea
- Props: onSend, isLoading, placeholder, disabled
- Send button disabled when empty or loading
- Character count warning near 8000 limit
- Enter to send, Shift+Enter for new line
- Clear input after successful send
- Disabled (grayed) when session is completed

**CompletionBanner:**
- Fixed/sticky at top when is_completed === true
- Simple message: "Scenario has been concluded."
- No additional buttons (use existing top nav)
- Minimal styling

**Animation & Loading:**
- Pulsing spinner during API calls (before response arrives)
- Character-by-character animation during message display
- useTypingAnimation hook: requestAnimationFrame, 20ms per character
- Each Message instance animates independently
- Auto-scroll to latest message using ref + scrollIntoView()

**Implementation:**
- Server-side: fetch session data and messages, pass to React
- SessionContext manages state and API calls
- Service layer handles fetch logic (messages.service.ts)
- Optimistic UI: user messages appear immediately
- Error messages displayed in helper's voice

### 4. Profile Page (`/profile.astro`)
**Purpose:** User info, stats, conversation history

**Layout:**
- Vertical layout, generous spacing
- Top: user email (mock), logout button
- Middle: "X/3 scenarios this week • Resets Monday"
- Bottom: "Completed Scenarios" heading
- Horizontal scrollable row of scenario tiles (same style as selection)
- Each tile: emoji icon, completion date on hover
- Click tile → opens HistoryModal

**HistoryModal:**
- Full-screen dialog (Shadcn dialog component)
- Dual-chat layout matching active session (50/50 split)
- Read-only: no input fields, just message display
- Close button (X) in top-right
- Shows complete conversation from both chats with timestamps

**Implementation:**
- Server-side: fetch user profile, completed sessions
- Horizontal scroll for history tiles (CSS overflow-x: auto)
- Modal populated with session messages on click

## User Flows

### Flow 1: Starting New Scenario
1. User lands on /scenarios page (authenticated via mock)
2. Server checks for active session: none found
3. Three scenario tiles rendered in full color
4. User hovers tile → sees enigmatic title
5. User clicks tile → createSession() called
6. Loading state on tile during API call
7. Navigate to /session?id={newSessionId}
8. Server fetches session + initial messages
9. DualChatInterface hydrates with initial data
10. Both chats display opening messages
11. User begins conversation

### Flow 2: Resuming Active Session
1. User lands on /scenarios page
2. Server checks: finds incomplete session
3. Single tile rendered (active scenario) with explanatory text
4. User clicks tile → navigate to /session?id={activeSessionId}
5. Server fetches session + all messages
6. DualChatInterface restores full conversation state
7. Auto-scroll to latest messages
8. User continues conversation

### Flow 3: Completing Scenario
1. User sends message in main chat
2. SessionContext calls sendMainMessage()
3. User message appears immediately (optimistic UI)
4. Pulsing spinner shown during API call
5. API returns with completion_flag_detected: true
6. Assistant message streams character-by-character
7. CompletionBanner appears at top
8. Both MessageInput components grayed out/disabled
9. User clicks top nav to return to /scenarios or view /profile
10. Scenarios page shows updated completion count

### Flow 4: Viewing History
1. User navigates to /profile
2. Sees row of completed scenario tiles
3. Hovers tile → sees completion date
4. Clicks tile → HistoryModal opens (full-screen)
5. Both chats displayed side-by-side with full conversation
6. User scrolls through read-only replay
7. Clicks X to close modal
8. Returns to profile page

## API Integration

### Service Layer Structure
```
/src/lib/services/
  ├─ scenarios.service.ts
  │   ├─ fetchScenarios()
  │   └─ fetchScenarioById()
  ├─ session.service.ts
  │   ├─ createSession()
  │   ├─ getSession()
  │   └─ completeSession()
  └─ messages.service.ts
      ├─ sendMessage()
      └─ getMessages()
```

### Error Handling
- Custom ApiError class: extends Error with statusCode, errorCode, details
- Service functions catch fetch errors, parse JSON, throw ApiError
- Components catch ApiError, display messages in helper's voice
- Error message templates in /src/lib/utils/error-messages.ts
- Errors displayed as helper chat responses, not banners/alerts

### Data Flow Pattern
1. Astro page: server-side fetch using top-level await
2. Pass initial data as props to React components
3. React components: use service functions for client-side API calls
4. SessionContext: centralize API logic for messages
5. Optimistic updates: show user messages immediately
6. Loading states: component-level (isMainLoading, isHelperLoading)

### Environment Configuration
- .env file: PUBLIC_API_BASE_URL, ANTHROPIC_API_KEY
- Access in Astro: import.meta.env.PUBLIC_API_BASE_URL
- Pass to React via props or config.ts file
- Mock user ID from getMockUser() utility

## Navigation & Routing

### Navigation Structure
- Top navigation (persistent): Maraum logo (left) → /scenarios, Profile icon (right) → /profile
- No breadcrumbs or complex nav for minimal aesthetic
- Astro ViewTransitions API for smooth page transitions
- No automatic redirects (user-initiated navigation only)

### Routes
- `/` - Landing page (mock auth entry)
- `/scenarios` - Scenario selection/resume
- `/session` - Active dual-chat session
- `/profile` - User profile and history

### Middleware
- /src/middleware/index.ts for future auth checks
- For MVP: mock auth bypass, all routes accessible

## Technical Implementation Details

### Animation System
- useTypingAnimation custom hook:
  - Uses requestAnimationFrame for smooth rendering
  - Independent instance per Message component
  - Returns displayedText substring
  - Speed: 20ms per character (~50 chars/sec)
  - Auto-cleanup on unmount

### Scroll Management
- MessageList component: ref on last message
- useEffect triggers scrollIntoView({ behavior: 'smooth' })
- Dependency: messages array
- Smooth scroll during animation

### Mock Authentication
- /src/lib/utils/mock-auth.ts
- getMockUser() returns hardcoded UUID from test migration
- Store in cookie/localStorage on landing page
- Comment in code: "Temporary mock auth - replace with Supabase Auth"
- Pass mock user ID to all API calls requiring authentication

### Performance Optimizations
- Server-side data fetching reduces client-side loading
- React.memo() for Message components (render often with same props)
- useCallback for event handlers passed to children
- Optimistic UI for perceived performance
- LocalStorage caching for session data (background refresh)

## Design System

### Visual Style
- Minimal, uniform aesthetic throughout
- Use Tailwind default colors for MVP (custom palette deferred)
- Generous spacing between elements
- No heavy borders or cards on profile page
- Enigmatic copy matching helper personality

### Typography
- Default Tailwind typography
- Kanji characters (魔 間) prominent in headers
- Small gray text for timestamps
- Minimal text hierarchy

### Component Variants (Shadcn/ui)
- Button: default, outline variants
- Card: for scenario tiles
- Dialog: for HistoryModal and future confirmations
- Input/Textarea: standard forms
- No custom variants for MVP

### Color Usage
- Full color: available/active scenarios
- Grayscale: blocked scenarios (rate limit)
- Loading states: subtle pulsing animation
- Message backgrounds: minimal distinction between user/assistant
- No elaborate color scheme for MVP

## Security & Authentication Considerations

### Current State (MVP)
- Mock authentication only
- No actual Supabase Auth integration
- getMockUser() returns hardcoded test user
- No session validation or token management
- All routes publicly accessible

### Future Implementation Notes
- Supabase Auth with httpOnly cookies
- Middleware for route protection
- Session validation on server-side
- User context instead of mock ID
- Row-level security policies in database

## Responsiveness & Accessibility

### Responsiveness
- **Desktop-only for MVP** - no mobile optimization
- Fixed 50/50 split for dual-chat (no responsive breakpoints)
- No viewport meta adjustments
- Deferred to post-MVP: mobile vertical stacking, touch interactions

### Accessibility
- **No accessibility features for MVP**
- No ARIA attributes beyond Shadcn/ui defaults
- No screen reader considerations
- No keyboard navigation enhancements
- No reduced motion preferences
- Deferred to post-MVP: full WCAG compliance

## Data Persistence & State

### Client-Side State
- SessionContext: active session data, messages, loading states
- LocalStorage: cached session data (with timestamp)
- Cookies: mock user ID

### Server-Side State
- PostgreSQL via Supabase
- Sessions, messages, scenarios tables
- No client-side database (IndexedDB not used)

### State Synchronization
- Server is source of truth
- Client caches for performance
- Background refresh reconciles differences
- Optimistic updates rolled back on API failure

## Component Library Usage

### Installed Shadcn/ui Components
- button - CTAs, send buttons, navigation
- card - scenario tiles
- dialog - HistoryModal, confirmations
- input - authentication forms (future)
- textarea - message input fields
- separator - visual division in profile

### Not Installed (Not Needed for MVP)
- accordion, alert, calendar, checkbox, dropdown, form, popover, progress, select, sheet, skeleton, slider, switch, table, tabs, toast, tooltip

### Custom Components to Build
- ScenarioGrid
- ScenarioTile
- DualChatInterface
- ChatPanel
- MessageList
- Message
- MessageInput
- CompletionBanner
- HistoryModal
- LandingPage
- ProfilePage

## File Structure

```
/src
├─ components/
│  ├─ ui/ (Shadcn components)
│  │  ├─ button.tsx
│  │  ├─ card.tsx
│  │  ├─ dialog.tsx
│  │  ├─ input.tsx
│  │  ├─ textarea.tsx
│  │  └─ separator.tsx
│  ├─ scenarios/
│  │  ├─ ScenarioGrid.tsx
│  │  └─ ScenarioTile.tsx
│  ├─ session/
│  │  ├─ DualChatInterface.tsx
│  │  ├─ ChatPanel.tsx
│  │  ├─ MessageList.tsx
│  │  ├─ Message.tsx
│  │  ├─ MessageInput.tsx
│  │  └─ CompletionBanner.tsx
│  ├─ profile/
│  │  └─ HistoryModal.tsx
│  └─ hooks/
│     ├─ useSession.ts
│     └─ useTypingAnimation.ts
├─ layouts/
│  └─ Layout.astro
├─ pages/
│  ├─ index.astro (landing)
│  ├─ scenarios.astro (selection)
│  ├─ session.astro (active chat)
│  ├─ profile.astro (user/history)
│  └─ api/ (existing endpoints)
├─ lib/
│  ├─ services/
│  │  ├─ scenarios.service.ts
│  │  ├─ session.service.ts
│  │  └─ messages.service.ts
│  ├─ errors/
│  │  └─ index.ts (ApiError class)
│  ├─ utils/
│  │  ├─ mock-auth.ts
│  │  ├─ error-messages.ts
│  │  └─ response-headers.ts
│  └─ contexts/
│     └─ SessionContext.tsx
├─ middleware/
│  └─ index.ts (future auth checks)
└─ config.ts (environment config)
```

</ui_architecture_planning_summary>

<unresolved_issues>

1. **Exact visual design tokens**: While default Tailwind colors are acceptable for MVP, the specific color palette for the liminal/twilight aesthetic (魔 vs 間 distinction) needs eventual definition. Consider documenting target colors for post-MVP even if not implementing now.

2. **Error message templates**: The specific text for error messages "in the helper's voice" needs to be written. Create a mapping of error codes to personality-consistent messages (e.g., api_timeout → "The API has abandoned us. Typical.").

3. **Scenario prompt templates location**: While the API plan mentions .md files in `/prompts/scenarios/`, confirm these files exist and determine how they're loaded by the service layer (filesystem read vs. bundled as modules).

4. **Session expiration handling**: The 7-day session cleanup is mentioned in PRD but deferred in API plan until auth is implemented. Clarify whether this should be partially implemented with mock users or completely deferred.

5. **LocalStorage cache strategy specifics**: While caching is agreed upon, the exact keys, data structure, and cache invalidation logic need definition (e.g., cache key: `session_${sessionId}`, TTL: 5 minutes, invalidate on API 409 conflict).

6. **CompletionBanner positioning**: Confirmed as "top of page" but needs clarification whether it should overlay content or push it down, and whether it should be dismissible or persistent until navigation.

7. **ScenarioTile dimensions on different screen sizes**: While desktop-only, large desktop monitors (1440p, 4K) may need max-width constraints or different tile sizing. Should tiles scale with viewport or remain fixed?

8. **History scroll behavior**: Profile page has "horizontal scrollable row" of history tiles, but interaction details unclear (keyboard arrow keys? wheel scroll? draggable?).

9. **ViewTransitions configuration**: Agreed to use Astro ViewTransitions API but specific transition animations (fade, slide, none) and duration not specified.

10. **Message timestamp format**: Timestamps mentioned but format not specified (relative "2 mins ago" vs. absolute "14:35" vs. full "Nov 14, 2:35 PM").

</unresolved_issues>

</conversation_summary>