# UI Architecture for Maraum MVP

## 1. UI Structure Overview

Maraum is a dual-chat German language learning platform featuring an enigmatic, minimal interface that emphasizes immersive gamification over traditional educational design patterns. The UI architecture supports three core experiences:

1. **Scenario Selection**: A minimal selection interface that presents three pre-defined German conversation scenarios
2. **Dual-Chat Session**: Split-screen interface where users practice German (left panel - 魔) with real-time English support (right panel - 間)
3. **Profile & History**: User information and read-only replay of completed conversations

**Architectural Principles:**
- Desktop-first design (mobile optimization deferred)
- Minimal, enigmatic aesthetic with sparse UI elements
- Server-side rendering with selective React hydration for interactive components
- Persistent session state with automatic restoration
- Immersive experience over explicit tutorials or hand-holding

**Technology Foundation:**
- Astro 5 pages with SSR for initial data loading
- React 19 components with client:load hydration for interactive elements
- Tailwind 4 with default configuration (custom palette deferred)
- Shadcn/ui minimal component subset (button, card, dialog, input, textarea, separator)

**Navigation Model:**
- Minimal top navigation bar (Maraum branding + profile icon)
- User-initiated navigation (no automatic redirects)
- Astro ViewTransitions for smooth page transitions
- No breadcrumbs or complex navigation patterns

---

## 2. View List

### 2.1 Landing Page

**View Path:** `/` (index.astro)

**Main Purpose:** Entry point for MVP with mock authentication mechanism

**Key Information to Display:**
- 魔 間 kanji characters (brand identity)
- "MARAUM" branding text
- Enigmatic tagline: "You want to learn German. How quaint."
- Entry button for test user access

**Key View Components:**
- Brand identity display (kanji + wordmark)
- Single call-to-action button ("Enter as Test User")
- Centered vertical layout with generous whitespace

**UX Considerations:**
- Minimal friction to entry (single click)
- No registration form or authentication complexity for MVP
- Sets expectation for enigmatic, personality-driven experience

**Accessibility Considerations:**
- Semantic HTML structure
- Sufficient color contrast for text
- Keyboard accessible button

**Security Considerations:**
- Mock authentication via cookie (getMockUser() utility)
- Note: Production authentication deferred to post-MVP
- Cookie-based session management preparation

**Data Requirements:**
- None (static page)

**Error States:**
- None (static entry point)

---

### 2.2 Scenario Selection Page

**View Path:** `/scenarios` (scenarios.astro)

**Main Purpose:** Allow users to select a new scenario or resume active session

**Key Information to Display:**

**When No Active Session:**
- Three scenario tiles displayed horizontally
- Each tile: emoji icon (🛒/🎉/🥙), scenario title on hover
- Current weekly completion count (X/3 scenarios this week)
- Week reset date if approaching limit
- Rate limit message if 3/3 completed (in helper's voice)

**When Active Session Exists:**
- Single tile showing active scenario (centered)
- Explanatory text: "Complete this scenario to start another"
- No other scenarios visible

**Key View Components:**
- ScenarioGrid container (conditional rendering based on active session)
- ScenarioTile component (200-250px square, large centered emoji)
- Hover overlay with scenario title
- Rate limit status display
- Completion counter

**UX Considerations:**
- Hover reveals scenario information (reward for exploration)
- Visual state distinction: full color (available) vs. grayscale (blocked)
- Single active session enforces commitment mechanic
- No "abandon" or "cancel" options visible
- Click entire tile to start/resume (no separate button)

**Accessibility Considerations:**
- Keyboard navigation between tiles
- Focus states clearly visible
- Screen reader announces tile state (available/blocked)
- Alt text for emoji icons

**Security Considerations:**
- Server-side check for active session prevents client-side manipulation
- Rate limit enforced server-side (displayed client-side)

**Data Requirements:**
- Fetch all scenarios (GET /api/scenarios)
- Check for active incomplete session (server-side query)
- User profile with completion count (for rate limit display)

**Error States:**
- Database connection failure: Display error in helper's voice, retry button
- No scenarios available: Unlikely (seeded data), but show maintenance message
- Rate limit API error: Display count as "—" with message to try later

**State Variations:**
1. **Default State**: Three tiles, no restrictions
2. **Active Session State**: Single tile with resume context
3. **Rate Limited State**: All tiles grayed, blocking message
4. **Loading State**: Tiles with loading spinner during session creation

---

### 2.3 Active Session Page

**View Path:** `/session` (session.astro with query param `?id={sessionId}`)

**Main Purpose:** Provide dual-chat interface for German conversation practice with real-time helper support

**Key Information to Display:**
- Session metadata (scenario title, emoji)
- Full conversation history for both chats
- Message timestamps
- Loading states during AI responses
- Session completion status

**Key View Components:**

**Layout Structure:**
- 50/50 horizontal split (CSS Grid)
- Fixed minimal top navigation
- Optional CompletionBanner (sticky at top when scenario concludes)

**Left Panel (魔 - Main Chat):**
- Header: 魔 icon, scenario title
- MessageList component (scrollable, auto-scroll to latest)
- Individual Message components with typing animation
- MessageInput component (textarea + send button)
- Loading indicator during AI processing

**Right Panel (間 - Helper Chat):**
- Header: 間 icon, "Helper" label
- MessageList component (independent scroll)
- Message components (same as left, different styling)
- MessageInput component (independent state)
- Loading indicator during helper processing

**CompletionBanner (conditional):**
- Appears at top when is_completed === true
- Minimal message: "Scenario has been concluded."
- Subtle styling, no dismiss button (use top nav to exit)

**Message Component Features:**
- Conditional alignment (user: right, assistant: left)
- Chat-type-specific subtle background accent
- Timestamp below message (small, gray text)
- Character-by-character typing animation (useTypingAnimation hook)
- Independent animation instance per message

**MessageInput Features:**
- Controlled Shadcn textarea
- Send button (disabled when empty or loading)
- Character count indicator near 8000 limit
- Enter to send, Shift+Enter for new line
- Disabled state when session completed (grayed out)

**UX Considerations:**
- Independent chat states prevent interference
- Auto-scroll maintains focus on latest messages
- Optimistic UI: user messages appear immediately
- Two-phase loading: spinner (waiting) → typing animation (receiving)
- No manual save action (automatic persistence)
- No exit confirmation (session persists automatically)
- Completion state clear but non-intrusive

**Accessibility Considerations:**
- ARIA live regions for new messages (screen reader announcements)
- Keyboard shortcuts for send (Enter)
- Focus management (input fields remain accessible)
- Semantic message roles (user/assistant)
- Sufficient color contrast for all text

**Security Considerations:**
- Session ID validation server-side
- User cannot access other users' sessions (future: auth-based)
- Message content not exposed in URL
- XSS prevention: sanitize message display

**Data Requirements:**
- Fetch session by ID (GET /api/sessions/:sessionId with include_messages=true)
- Fetch scenario details for context
- Send messages (POST /api/sessions/:sessionId/messages)
- Completion detection via API response flag

**Error States:**
- **Session Not Found**: Redirect to /scenarios with error message
- **Session Already Completed**: Show CompletionBanner, disable inputs, allow replay
- **API Timeout**: Display message in helper's voice, "Retry" button, preserve user message
- **API Failure (after retries)**: Error message, manual retry option, progress preserved
- **Network Disconnection**: Offline indicator, disable inputs, show reconnection message
- **Invalid Session ID**: Redirect to /scenarios
- **Streaming Interruption**: Show partial message with ellipsis, retry button

**State Variations:**
1. **Active Conversation**: Both inputs enabled, messages flowing
2. **Loading (Main Chat)**: Spinner in left panel, right panel still interactive
3. **Loading (Helper Chat)**: Spinner in right panel, left panel still interactive
4. **Completed Session**: CompletionBanner visible, both inputs disabled
5. **Error State**: Error message displayed, retry options visible
6. **Restored Session**: Full history loaded, scrolled to latest

---

### 2.4 Profile Page

**View Path:** `/profile` (profile.astro)

**Main Purpose:** Display user information, completion statistics, and provide access to conversation history

**Key Information to Display:**
- User email (mock for MVP)
- Weekly completion status (X/3 scenarios this week)
- Week reset information (e.g., "Resets Monday")
- Completed scenarios as browsable tiles
- Logout functionality

**Key View Components:**

**Header Section:**
- User email display (or username)
- Logout button

**Stats Section:**
- Completion counter: "X/3 scenarios this week"
- Week reset date: "Resets Monday, Nov 18"
- Visual separator

**History Section:**
- "Completed Scenarios" heading
- Horizontal scrollable row of completed scenario tiles
- Each tile: emoji icon, scenario title
- Hover reveals completion date
- Click opens HistoryModal

**Empty State:**
- "No scenarios completed yet" with minimal illustration or icon
- Encouraging text to start first scenario

**HistoryModal (Dialog Component):**
- Full-screen Shadcn dialog overlay
- Dual-chat layout (50/50 split, matching active session)
- Complete message history from both chats (read-only)
- Timestamps preserved
- Close button (X) in top-right corner
- No input fields or interactive elements beyond scrolling

**UX Considerations:**
- Minimal information density (no overwhelming stats)
- History tiles identical to scenario selection tiles (visual consistency)
- Horizontal scroll with touch/mouse wheel support
- Modal provides immersive replay without navigation
- No analytics or progress tracking (aligns with product philosophy)
- No scenario deletion or export (simplicity)

**Accessibility Considerations:**
- Keyboard navigation for history tiles
- Arrow keys for horizontal scroll
- Escape key closes modal
- Focus trap within modal when open
- Screen reader announces completion dates

**Security Considerations:**
- User can only view own profile and history (auth-based filtering)
- Logout invalidates session token
- No sensitive information beyond email

**Data Requirements:**
- Fetch user profile (currently mock, future: GET /api/profile)
- Fetch completed sessions (GET /api/sessions with is_completed filter)
- Fetch messages for replay (GET /api/sessions/:sessionId/messages)

**Error States:**
- Profile fetch failure: Display error, retry button
- History fetch failure: Show message, retry option
- Modal load failure: Error within modal, close and retry
- Empty history: Show empty state encouragement

**State Variations:**
1. **Default State**: Profile loaded, history displayed
2. **Empty History**: No completed scenarios yet
3. **Modal Open**: Full-screen history replay
4. **Rate Limited**: Completion counter at 3/3 with reset date
5. **Loading State**: Skeleton or spinner during data fetch

---

## 3. User Journey Map

### 3.1 Primary User Journey: First-Time Scenario Completion

**Actor:** New user (B1-B2 German learner)

**Goal:** Complete first German conversation scenario

**Steps:**

1. **Entry**
   - User arrives at Landing Page (/)
   - Reads enigmatic tagline
   - Clicks "Enter as Test User" button
   - Mock cookie set, redirected to /scenarios

2. **Scenario Selection**
   - Lands on Scenario Selection Page (/scenarios)
   - Sees three scenario tiles in full color
   - Hovers over tiles to reveal scenario titles
   - Reads "0/3 scenarios this week • Resets Monday"
   - Clicks Marketplace tile (🛒)
   - Loading state appears on tile
   - API creates session
   - Navigates to /session?id={newSessionId}

3. **Session Initialization**
   - Active Session Page loads
   - Server fetches session with initial messages
   - DualChatInterface hydrates with data
   - Both chats display opening messages:
     - Left (魔): German scene-setting from NPC
     - Right (間): Sarcastic English greeting from helper
   - User reads initial messages

4. **First Interaction - Seeking Help**
   - User uncertain about German response
   - Types in right panel (helper): "How do I say 'I want apples'?"
   - Clicks send in helper chat (or presses Enter)
   - User message appears immediately (right-aligned)
   - Loading spinner appears in right panel
   - Helper response streams character-by-character:
     - "The phrase you're fumbling for is 'Ich möchte Äpfel.' Try not to butcher the pronunciation."
   - User reads helper suggestion

5. **Main Conversation**
   - User types in left panel (main): "Ich möchte Äpfel."
   - Clicks send in main chat
   - User message appears immediately
   - Loading spinner in left panel
   - NPC response streams in German:
     - "Natürlich! Wir haben heute frische Äpfel. Wie viele möchten Sie?"
   - User continues conversation, occasionally asking helper for help

6. **Conversation Progression (15-25 messages)**
   - User alternates between main chat (German practice) and helper chat (assistance)
   - Each exchange follows same pattern: user message → loading → AI response with animation
   - Helper provides vocabulary, grammar tips, conversation suggestions
   - User builds confidence, asks helper less frequently

7. **Natural Conclusion**
   - After ~20 messages, NPC begins steering toward conclusion
   - User's final message: "Vielen Dank! Auf Wiedersehen!"
   - NPC response includes completion flag: "Gerne! Einen schönen Tag noch!"
   - Response completes streaming
   - CompletionBanner appears at top: "Scenario has been concluded."
   - Both MessageInput components gray out (disabled)

8. **Post-Completion**
   - User reads completion banner
   - Clicks Maraum logo in top nav or profile icon
   - Returns to /scenarios
   - Sees updated counter: "1/3 scenarios this week"
   - Can start new scenario or view profile

9. **Viewing History**
   - User navigates to /profile
   - Sees completed Marketplace tile in history section
   - Clicks tile
   - HistoryModal opens full-screen
   - Reviews entire conversation in dual-chat replay
   - Scrolls through both chats
   - Clicks X to close modal

### 3.2 Secondary User Journey: Resuming Abandoned Session

**Actor:** Returning user with incomplete session

**Goal:** Resume and complete previously started scenario

**Steps:**

1. **Return to App**
   - User opens application (session cookie persists)
   - Lands on Landing Page or directly on /scenarios

2. **Session Detection**
   - Scenarios page loads
   - Server detects active incomplete session
   - Only active scenario tile rendered (centered)
   - Text below: "Complete this scenario to start another"

3. **Resume Session**
   - User clicks active scenario tile
   - Navigates to /session?id={activeSessionId}
   - Server fetches session with all messages
   - DualChatInterface restores full conversation history

4. **State Restoration**
   - Both chats display complete message history
   - Auto-scrolls to latest messages
   - User sees where they left off
   - Both inputs enabled and ready

5. **Continue Conversation**
   - User continues from previous stopping point
   - Follows same interaction patterns as primary journey
   - Completes scenario naturally

6. **Completion and Freedom**
   - Session marked complete
   - Returns to /scenarios
   - All three scenarios now available (no active session)
   - Can start any scenario

### 3.3 Tertiary User Journey: Reaching Weekly Limit

**Actor:** Engaged user completing third scenario of the week

**Goal:** Complete final allowed scenario and understand limit

**Steps:**

1. **Pre-Limit State**
   - User completes second scenario
   - Returns to /scenarios
   - Sees "2/3 scenarios this week • Resets Monday"
   - All tiles still available

2. **Final Scenario**
   - User starts and completes third scenario
   - Returns to /scenarios after completion

3. **Rate Limit Display**
   - Scenarios page shows "3/3 scenarios this week"
   - All tiles grayed out (grayscale filter)
   - Message in helper's voice: "You've exhausted your conversational allowance. Return Monday."
   - Reset date clearly displayed
   - No clickable tiles

4. **Understanding Limit**
   - User cannot start new scenarios
   - Can still access profile and view history
   - Can replay completed scenarios via history modal

5. **Limit Reset**
   - User returns after weekly reset
   - Scenarios page shows "0/3 scenarios this week • Resets [next Monday]"
   - All tiles available in full color
   - User can start new scenarios

### 3.4 Edge Case Journey: API Failure During Conversation

**Actor:** User mid-conversation

**Issue:** Claude API timeout or failure

**Steps:**

1. **Normal Flow Interrupted**
   - User sends message in main chat
   - User message appears immediately
   - Loading spinner appears
   - API call times out after 30 seconds

2. **Error Handling**
   - Spinner replaced with error message in helper's voice:
     - "Connection lost. How disappointing. Your progress is safe, try again."
   - User message preserved in database
   - Retry button appears below error message

3. **User Action**
   - User clicks retry button
   - System resends same message (idempotent via client_message_id)
   - If successful, conversation continues normally
   - If fails again, same error display with retry option

4. **Alternative: Navigation Away**
   - User frustrated, clicks profile icon
   - Navigates to /profile
   - Session remains active (not completed)
   - Can return to /scenarios, see active session tile
   - Resume session later with full history intact

---

## 4. Layout and Navigation Structure

### 4.1 Global Layout (Layout.astro)

**Structure:**
```
┌─────────────────────────────────────────────────┐
│  Top Navigation Bar                             │
│  [魔間 Maraum]            [Profile Icon]        │
├─────────────────────────────────────────────────┤
│                                                 │
│  Page Content Area                              │
│  (Astro pages render here)                      │
│                                                 │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Top Navigation:**
- Fixed position at top (always visible)
- Left: Maraum branding (魔間 kanji + wordmark) - links to /scenarios
- Right: Profile icon - links to /profile
- Minimal height (~60px)
- Transparent or subtle background
- No dropdown menus or complex navigation

**Page Content Area:**
- Full viewport height minus nav bar
- Each Astro page renders completely within this space
- No sidebars or additional chrome

### 4.2 Landing Page Layout (/)

**Structure:**
```
┌─────────────────────────────────────────────────┐
│                                                 │
│                    魔  間                        │
│                   MARAUM                        │
│                                                 │
│    You want to learn German. How quaint.       │
│                                                 │
│             [Enter as Test User]                │
│                                                 │
│                                                 │
└─────────────────────────────────────────────────┘
```

- Centered vertical layout
- Generous whitespace
- Single call-to-action
- No navigation bar visible (full-screen entry experience)

### 4.3 Scenario Selection Layout (/scenarios)

**No Active Session:**
```
┌─────────────────────────────────────────────────┐
│  [魔間 Maraum]                     [Profile]    │
├─────────────────────────────────────────────────┤
│                                                 │
│           1/3 scenarios this week               │
│              Resets Monday, Nov 18              │
│                                                 │
│     ┌─────┐    ┌─────┐    ┌─────┐              │
│     │ 🛒  │    │ 🎉  │    │ 🥙  │              │
│     └─────┘    └─────┘    └─────┘              │
│   Marketplace   Party      Kebab                │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Active Session:**
```
┌─────────────────────────────────────────────────┐
│  [魔間 Maraum]                     [Profile]    │
├─────────────────────────────────────────────────┤
│                                                 │
│                                                 │
│                  ┌─────┐                        │
│                  │ 🛒  │                        │
│                  └─────┘                        │
│                Marketplace                      │
│                                                 │
│       Complete this scenario to start another   │
│                                                 │
└─────────────────────────────────────────────────┘
```

- Horizontal centering
- Status info at top-center
- Tiles with generous spacing
- Conditional rendering based on active session

### 4.4 Active Session Layout (/session)

**Desktop 50/50 Split:**
```
┌─────────────────────────────────────────────────┐
│  [魔間 Maraum]                     [Profile]    │
├─────────────────────────────────────────────────┤
│ [CompletionBanner - if completed]               │
├──────────────────────┬──────────────────────────┤
│  魔 Marketplace      │  間 Helper               │
├──────────────────────┼──────────────────────────┤
│                      │                          │
│  [Messages]          │  [Messages]              │
│  ├─ Assistant        │  ├─ Assistant            │
│  ├─ User             │  ├─ User                 │
│  ├─ Assistant        │  ├─ Assistant            │
│  └─ ...              │  └─ ...                  │
│                      │                          │
│                      │                          │
├──────────────────────┼──────────────────────────┤
│  [Input: Deutsch]    │  [Input: English]        │
│  [Send Button]       │  [Send Button]           │
└──────────────────────┴──────────────────────────┘
```

- Exact 50/50 split (CSS Grid: `grid-template-columns: 1fr 1fr`)
- Independent scroll areas for each panel
- Message inputs fixed at bottom of respective panels
- CompletionBanner appears as overlay or pushes content down slightly

### 4.5 Profile Page Layout (/profile)

```
┌─────────────────────────────────────────────────┐
│  [魔間 Maraum]                     [Profile]    │
├─────────────────────────────────────────────────┤
│                                                 │
│  user@example.com                 [Logout]      │
│                                                 │
│  ─────────────────────────────────────────────  │
│                                                 │
│  2/3 scenarios this week • Resets Monday        │
│                                                 │
│  ─────────────────────────────────────────────  │
│                                                 │
│  Completed Scenarios                            │
│                                                 │
│  ┌─────┐ ┌─────┐ ┌─────┐                       │
│  │ 🛒  │ │ 🎉  │ │ 🥙  │  ──────→              │
│  │Nov 3│ │Nov 5│ │Nov 7│                       │
│  └─────┘ └─────┘ └─────┘                       │
│                                                 │
└─────────────────────────────────────────────────┘
```

- Vertical layout with generous spacing
- User info at top
- Stats in middle
- History as horizontal scrollable row
- Visual separators (Shadcn separator component)

### 4.6 History Modal Layout (Overlay)

```
┌─────────────────────────────────────────────────┐
│                                            [X]  │
│  Marketplace - Completed Nov 3, 2024            │
├──────────────────────┬──────────────────────────┤
│  魔 Main Chat        │  間 Helper Chat          │
├──────────────────────┼──────────────────────────┤
│                      │                          │
│  [Full Message       │  [Full Message           │
│   History]           │   History]               │
│  (Read-only)         │  (Read-only)             │
│                      │                          │
│                      │                          │
└──────────────────────┴──────────────────────────┘
```

- Full-screen Shadcn dialog
- Close button (X) top-right
- Scenario info at top
- Same 50/50 split as active session
- No input fields (read-only replay)
- Independent scroll for each panel

### 4.7 Navigation Flow Diagram

```
     ┌──────────┐
     │ Landing  │
     │    /     │
     └────┬─────┘
          │ Enter
          ↓
     ┌──────────┐ ←──────────────┐
     │Scenarios │                 │
     │/scenarios│                 │
     └─┬──────┬─┘                 │
       │      │                   │
Start  │      │ Resume            │ Logo Click
       ↓      ↓                   │ or Complete
     ┌──────────┐                 │
     │ Session  │─────────────────┘
     │ /session │
     └──────────┘
          │
          │ Profile Click
          ↓
     ┌──────────┐
     │ Profile  │
     │ /profile │
     └──────────┘
          │
          │ Logo Click
          └───────→ Back to Scenarios
```

**Navigation Rules:**
- Landing → Scenarios (one-way for MVP, entry point)
- Scenarios → Session (start or resume)
- Session → Scenarios (via top nav logo)
- Session → Profile (via top nav profile icon)
- Profile → Scenarios (via top nav logo)
- Any page → Profile (via top nav icon)
- No back button dependency (top nav always available)

### 4.8 ViewTransitions Configuration

**Page Transitions:**
- Fade transition between pages (duration: 200ms)
- Smooth transition using Astro ViewTransitions API
- No complex animations (align with minimal aesthetic)
- Shared elements: top navigation (persists across transitions)

**Implementation:**
```astro
<!-- Layout.astro -->
<ViewTransitions />
```

**Transition Classes:**
- Default fade for most transitions
- No slide or complex animations (maintain simplicity)

---

## 5. Key Components

### 5.1 Shared/Layout Components

#### 5.1.1 TopNavigation (TopNav.astro)

**Purpose:** Persistent navigation bar across all pages (except landing)

**Props:** None (uses global state/context)

**Structure:**
- Left section: Maraum branding (魔間 + "MARAUM") - link to /scenarios
- Right section: Profile icon - link to /profile
- Responsive: Fixed positioning, z-index ensures always on top

**Usage:** Included in Layout.astro, rendered on all pages except landing

---

### 5.2 Landing Page Components

#### 5.2.1 LandingHero (LandingHero.astro)

**Purpose:** Display entry point with branding and mock auth button

**Props:** None

**Structure:**
- Kanji display (魔 間)
- Brand wordmark (MARAUM)
- Tagline text
- CTA button

**Usage:** Only on landing page (/)

---

### 5.3 Scenario Selection Components

#### 5.3.1 ScenarioGrid (ScenarioGrid.tsx)

**Purpose:** Container for scenario tiles with conditional rendering logic

**Props:**
- scenarios: Scenario[]
- activeSession: Session | null
- completionCount: number
- weeklyLimit: number
- weekResetDate: string

**Structure:**
- Completion counter display
- ScenarioTile components (conditional quantity)

**State:**
- isLoading: boolean (during session creation)

**Usage:** Scenarios page (/scenarios)

#### 5.3.2 ScenarioTile (ScenarioTile.tsx)

**Purpose:** Individual scenario representation with hover and click interactions

**Props:**
- scenario: Scenario
- isActive: boolean
- isBlocked: boolean
- onClick: (scenarioId: number) => void

**Structure:**
- Shadcn Card wrapper
- Large centered emoji icon
- Hover overlay with title
- Visual state (color vs. grayscale)

**Interactions:**
- Hover: Shows scenario title overlay
- Click: Calls onClick handler (creates session or resumes)

**Usage:** Within ScenarioGrid

---

### 5.4 Active Session Components

#### 5.4.1 DualChatInterface (DualChatInterface.tsx)

**Purpose:** Main container for dual-chat session, manages session state

**Props:**
- initialSession: Session
- initialMainMessages: Message[]
- initialHelperMessages: Message[]

**Structure:**
- SessionProvider wrapper (React Context)
- CompletionBanner (conditional)
- Two ChatPanel components (main and helper)

**State Management:**
- Provides SessionContext to children
- Handles sendMainMessage and sendHelperMessage logic
- Manages loading states independently

**Usage:** Session page (/session) with client:load directive

#### 5.4.2 SessionProvider / SessionContext (SessionContext.tsx)

**Purpose:** React Context for session state management

**Provided State:**
- session: Session
- mainMessages: Message[]
- helperMessages: Message[]
- isMainLoading: boolean
- isHelperLoading: boolean

**Provided Actions:**
- sendMainMessage: (content: string) => Promise<void>
- sendHelperMessage: (content: string) => Promise<void>
- loadSession: (sessionId: string) => Promise<void>

**Usage:** Wraps DualChatInterface, consumed via useSession() hook

#### 5.4.3 ChatPanel (ChatPanel.tsx)

**Purpose:** Reusable panel for both main and helper chats

**Props:**
- chatType: 'main' | 'helper'
- messages: Message[]
- onSendMessage: (content: string) => Promise<void>
- isLoading: boolean
- isCompleted: boolean

**Structure:**
- Panel header (魔/間 icon + label)
- MessageList component
- MessageInput component
- Loading indicator (conditional)

**Usage:** Two instances in DualChatInterface (main and helper)

#### 5.4.4 MessageList (MessageList.tsx)

**Purpose:** Scrollable container for messages with auto-scroll

**Props:**
- messages: Message[]
- chatType: 'main' | 'helper'

**Structure:**
- Scrollable div (overflow-y: auto)
- Message components rendered sequentially
- Scroll anchor ref for auto-scroll

**Behavior:**
- Auto-scrolls to latest message on new message
- useEffect with messages dependency
- scrollIntoView({ behavior: 'smooth' })

**Usage:** Within ChatPanel

#### 5.4.5 Message (Message.tsx)

**Purpose:** Individual message display with typing animation

**Props:**
- message: Message
- chatType: 'main' | 'helper'

**Structure:**
- Message bubble (conditional alignment)
- Timestamp below
- Typing animation for assistant messages

**Behavior:**
- Uses useTypingAnimation hook for assistant messages
- Instant display for user messages
- Role-based styling (user: right, assistant: left)

**Usage:** Rendered by MessageList for each message

#### 5.4.6 MessageInput (MessageInput.tsx)

**Purpose:** Text input and send button for message submission

**Props:**
- onSend: (content: string) => void
- isLoading: boolean
- isDisabled: boolean
- placeholder: string
- chatType: 'main' | 'helper'

**Structure:**
- Shadcn Textarea (controlled input)
- Send button (Shadcn Button)
- Character count indicator (if approaching limit)

**Behavior:**
- Enter to send, Shift+Enter for new line
- Disabled when isLoading or isDisabled
- Clears input after successful send
- Validates content (non-empty, <= 8000 chars)

**Usage:** Within ChatPanel for both main and helper

#### 5.4.7 CompletionBanner (CompletionBanner.tsx)

**Purpose:** Display scenario completion notification

**Props:**
- isVisible: boolean

**Structure:**
- Fixed/sticky positioning at top
- Minimal text: "Scenario has been concluded."
- Subtle styling (no dismiss button)

**Usage:** Conditional rendering in DualChatInterface

---

### 5.5 Profile Page Components

#### 5.5.1 ProfileHeader (ProfileHeader.tsx)

**Purpose:** Display user info and logout

**Props:**
- userEmail: string
- onLogout: () => void

**Structure:**
- Email display
- Logout button (Shadcn Button)

**Usage:** Profile page header section

#### 5.5.2 CompletionStats (CompletionStats.tsx)

**Purpose:** Display weekly completion status

**Props:**
- completionCount: number
- weeklyLimit: number
- weekResetDate: string

**Structure:**
- "X/3 scenarios this week" text
- "Resets [date]" text
- Visual separator

**Usage:** Profile page stats section

#### 5.5.3 HistoryRow (HistoryRow.tsx)

**Purpose:** Horizontal scrollable row of completed scenarios

**Props:**
- completedSessions: Session[]
- onTileClick: (sessionId: string) => void

**Structure:**
- Horizontal scroll container (overflow-x: auto)
- HistoryTile components
- Empty state if no completions

**Usage:** Profile page history section

#### 5.5.4 HistoryTile (HistoryTile.tsx)

**Purpose:** Individual completed scenario representation

**Props:**
- session: Session
- onClick: (sessionId: string) => void

**Structure:**
- Same visual as ScenarioTile
- Emoji icon from scenario
- Completion date on hover
- Clickable to open modal

**Usage:** Within HistoryRow

#### 5.5.5 HistoryModal (HistoryModal.tsx)

**Purpose:** Full-screen replay of completed conversation

**Props:**
- session: Session
- mainMessages: Message[]
- helperMessages: Message[]
- isOpen: boolean
- onClose: () => void

**Structure:**
- Shadcn Dialog (full-screen variant)
- Session metadata header (title, date)
- Dual-chat layout (50/50 split)
- Two MessageList components (read-only)
- Close button (X)

**Behavior:**
- Opens when history tile clicked
- Loads messages if not already loaded
- Close button or Escape key closes modal
- No input fields (read-only)

**Usage:** Triggered from HistoryRow on profile page

---

### 5.6 Custom Hooks

#### 5.6.1 useSession (useSession.ts)

**Purpose:** Hook to access SessionContext

**Returns:** SessionContext value

**Usage:**
```typescript
const { session, mainMessages, sendMainMessage, isMainLoading } = useSession();
```

#### 5.6.2 useTypingAnimation (useTypingAnimation.ts)

**Purpose:** Character-by-character text display animation

**Parameters:**
- text: string
- speed: number (default: 20ms per character)

**Returns:**
- displayedText: string (substring of text)

**Behavior:**
- Uses requestAnimationFrame for smooth rendering
- Independent instance per component
- Auto-cleans up on unmount

**Usage:**
```typescript
const displayedText = useTypingAnimation(message.content, 20);
```

---

### 5.7 Service Layer (Data Fetching)

#### 5.7.1 scenarios.service.ts

**Functions:**
- fetchScenarios(): Promise<Scenario[]>
- fetchScenarioById(id: number): Promise<Scenario>

**Purpose:** Handle scenario-related API calls

#### 5.7.2 session.service.ts

**Functions:**
- createSession(scenarioId: number): Promise<Session>
- getSession(sessionId: string): Promise<Session>
- getSessionWithMessages(sessionId: string): Promise<Session & { messages: Message[] }>
- completeSession(sessionId: string): Promise<Session>

**Purpose:** Handle session-related API calls

#### 5.7.3 messages.service.ts

**Functions:**
- sendMessage(sessionId: string, chatType: string, content: string): Promise<MessageResponse>
- getMessages(sessionId: string, chatType?: string): Promise<Message[]>

**Purpose:** Handle message-related API calls

#### 5.7.4 ApiError Class (errors/index.ts)

**Purpose:** Consistent error handling

**Properties:**
- message: string
- statusCode: number
- errorCode: string
- details: any

**Usage:** Thrown by service functions, caught by components

---

### 5.8 Utility Functions

#### 5.8.1 mock-auth.ts

**Functions:**
- getMockUser(): string (returns hardcoded user UUID)
- setMockUser(userId: string): void
- clearMockUser(): void

**Purpose:** Mock authentication for MVP

#### 5.8.2 error-messages.ts

**Functions:**
- getErrorMessage(errorCode: string): string

**Purpose:** Map error codes to helper's voice messages

**Examples:**
- "api_timeout" → "Connection lost. How disappointing. Your progress is safe, try again."
- "session_completed" → "This scenario has concluded. You cannot send more messages."

#### 5.8.3 response-headers.ts

**Functions:**
- getStandardHeaders(): HeadersInit

**Purpose:** Consistent API request headers

---

## 6. State Management Architecture

### 6.1 Global State (React Context)

**SessionContext Structure:**
```typescript
interface SessionContextValue {
  // Session data
  session: Session | null;
  mainMessages: Message[];
  helperMessages: Message[];
  
  // Loading states
  isMainLoading: boolean;
  isHelperLoading: boolean;
  
  // Actions
  sendMainMessage: (content: string) => Promise<void>;
  sendHelperMessage: (content: string) => Promise<void>;
  loadSession: (sessionId: string) => Promise<void>;
}
```

**Provider Location:** Wraps DualChatInterface component

**Consumer Pattern:** Components use useSession() hook

### 6.2 Server State (Astro Pages)

**Data Fetching Pattern:**
- Top-level await in Astro pages
- Fetch data server-side before rendering
- Pass as props to React components

**Example:**
```astro
---
// scenarios.astro
const scenarios = await fetchScenarios();
const activeSession = await checkActiveSession();
---
<ScenarioGrid scenarios={scenarios} activeSession={activeSession} client:load />
```

### 6.3 Component State (React useState)

**Local State Examples:**
- MessageInput: input value, character count
- ScenarioTile: hover state
- HistoryModal: open/closed state
- Message: typing animation progress (internal to hook)

**Pattern:** Use local state for UI-only concerns, lift up when shared

### 6.4 Data Flow Summary

```
Server (Astro) → Initial Props → React Components → Context → Child Components
                                                  ↓
                                              Services → API → Database
                                                  ↑
                                              Context Updates
```

---

## 7. Responsive Behavior (Desktop-Only MVP)

### 7.1 Viewport Assumptions

**Target Resolution:** 1920x1080 (Full HD) as primary
**Minimum Supported:** 1366x768 (HD)
**Maximum Tested:** 2560x1440 (QHD)

### 7.2 Component Sizing

**Fixed Dimensions:**
- Top navigation: 60px height
- Scenario tiles: 200-250px square
- Message input: ~80px height

**Flexible Dimensions:**
- Message list: Fill available vertical space
- Chat panels: 50vw each (exact half of viewport width)

### 7.3 Typography Scaling

- Use default Tailwind sizing (no viewport-based scaling)
- Base font size: 16px (browser default)
- No fluid typography for MVP

### 7.4 Mobile Considerations (Deferred)

**Not Implemented in MVP:**
- Viewport meta tag optimization
- Touch gesture support
- Vertical stacking of chat panels
- Mobile-specific input handling
- Responsive breakpoints

**Future Implementation Notes:**
- Mobile: Vertical stack (main on top, helper below)
- Tap header to switch focus between chats
- Full-height views, no compromise split

---

## 8. Accessibility Considerations

### 8.1 MVP Accessibility Baseline

**Implemented:**
- Semantic HTML structure (header, nav, main, footer)
- Button and link elements (not divs with onClick)
- Keyboard navigation (Tab, Enter, Escape)
- Focus states visible (Shadcn/ui defaults)
- Sufficient color contrast (Tailwind defaults)

**Not Implemented (Deferred):**
- ARIA labels and live regions
- Screen reader testing
- Reduced motion preferences
- Keyboard shortcuts beyond defaults
- High contrast mode

### 8.2 Focus Management

**Tab Order:**
- Top nav (logo → profile icon)
- Scenario tiles (left to right)
- Message input → Send button
- History tiles (horizontal)
- Modal close button

**Focus Trap:**
- HistoryModal traps focus when open
- Escape key closes modal

### 8.3 Color and Contrast

- Use Tailwind default colors (WCAG AA compliant)
- Text: Ensure 4.5:1 contrast ratio
- Interactive elements: 3:1 contrast ratio

---

## 9. Security Considerations

### 9.1 Authentication (MVP Mock)

**Current Implementation:**
- Mock user ID stored in cookie
- No actual authentication
- All sessions publicly accessible

**Future Implementation:**
- Supabase Auth with httpOnly cookies
- Session token validation
- Row-level security policies

### 9.2 XSS Prevention

**Message Display:**
- Escape HTML in message content
- Use textContent or React's JSX escaping
- No dangerouslySetInnerHTML

**Input Sanitization:**
- Validate input length client-side
- Server-side validation enforced
- No executable content allowed

### 9.3 CSRF Protection

**Current State:**
- Not implemented (API doesn't use cookies for auth yet)

**Future Implementation:**
- CSRF tokens for state-changing operations
- SameSite cookie attribute

### 9.4 Data Exposure

**URL Parameters:**
- Session ID in URL (?id=uuid)
- No sensitive data in URLs
- Server validates session access

**Error Messages:**
- No stack traces exposed
- Generic error messages for security issues
- Detailed logs server-side only

---

## 10. Error State Handling

### 10.1 Error Display Strategy

**Primary Method:** Display errors as helper chat messages (in 間's voice)

**Visual Pattern:**
- Error appears as assistant message in helper chat
- Includes retry button or suggestion
- Maintains personality consistency

**Example:**
```
間 (Helper): "Connection lost. How disappointing. Your progress is safe, try again."
[Retry Button]
```

### 10.2 Error States by View

**Landing Page:**
- Mock auth failure (unlikely): Generic error message

**Scenarios Page:**
- Scenarios fetch failure: "Cannot load scenarios. [Retry]"
- Session creation failure: Error on tile, retry button
- Rate limit fetch failure: Show "—/3" with message

**Session Page:**
- Session not found: Redirect to /scenarios with banner
- Message send failure: Error in helper chat, retry button
- API timeout: Error in helper chat, preserve message
- Network offline: Offline indicator, disable inputs

**Profile Page:**
- Profile fetch failure: Error display, retry button
- History fetch failure: Empty state with retry
- Modal load failure: Error within modal

### 10.3 Error Recovery Patterns

**Retry Button:**
- Always available after failures
- Idempotent operations (client_message_id)
- Clear indication of retry attempt

**Graceful Degradation:**
- Show cached data if available
- Allow continuation where possible
- Preserve user input on failures

**User Communication:**
- Errors in helper's voice (on-brand)
- Clear next steps (retry, navigate, wait)
- No technical jargon or codes visible to user

---

## 11. Performance Considerations

### 11.1 Loading States

**Page-Level:**
- Server-side rendering reduces initial load time
- Astro pre-renders static content
- React hydration for interactive components

**Component-Level:**
- Skeleton loading for history tiles
- Spinner during API calls (message send)
- Typing animation masks API latency

### 11.2 Optimization Strategies

**React Components:**
- React.memo() for Message components (render frequently)
- useCallback for event handlers passed to children
- useMemo for expensive computations (message filtering)

**Data Fetching:**
- Server-side fetch reduces client-side loading
- Optimistic UI for perceived performance
- LocalStorage caching for session data

**Asset Optimization:**
- Minimal Shadcn/ui component subset
- No heavy images or icons (emoji as text)
- Tailwind purge removes unused CSS

### 11.3 Performance Targets

**Page Load (Time to Interactive):**
- Landing: < 1s
- Scenarios: < 2s
- Session (with history): < 3s
- Profile: < 2s

**Interaction Responsiveness:**
- Message send (user message appears): < 100ms (instant)
- API response (first character): < 2s
- Full message display: < 10s (including animation)
- Scroll to new message: < 300ms (smooth)

---

## 12. View-to-API Mapping

### 12.1 Landing Page (/)

**API Calls:** None (static page)

### 12.2 Scenario Selection Page (/scenarios)

**Server-Side (Astro):**
- GET /api/scenarios (fetch all scenarios)
- Database query: check for active incomplete session

**Client-Side (React):**
- POST /api/sessions (create new session on tile click)

### 12.3 Active Session Page (/session)

**Server-Side (Astro):**
- GET /api/sessions/:sessionId?include_messages=true (fetch session with messages)

**Client-Side (React):**
- POST /api/sessions/:sessionId/messages (send message, receive response)

### 12.4 Profile Page (/profile)

**Server-Side (Astro):**
- Database query: fetch user profile (mock)
- Database query: fetch completed sessions

**Client-Side (React - Modal):**
- GET /api/sessions/:sessionId/messages (fetch messages for replay)

---

## 13. User Story Coverage

### 13.1 Authentication Stories (US-001 to US-006)

**Covered by:**
- Landing page with mock auth entry (US-001, US-002)
- Session persistence via cookies (US-003)
- Profile page logout button (US-004)
- Profile page account deletion (US-005)
- Profile page access from all authenticated views (US-006)

### 13.2 Scenario Selection Stories (US-007 to US-012)

**Covered by:**
- Scenario Selection page with ScenarioGrid (US-007)
- ScenarioTile onClick handler creates session (US-008)
- Single tile display when active session exists (US-009, US-010)
- Rate limit message and grayed tiles (US-011)
- Completed scenarios remain clickable (US-012)

### 13.3 Main Chat Stories (US-013 to US-019)

**Covered by:**
- ChatPanel (main) with initial message display (US-013)
- MessageInput component in left panel (US-014)
- Message component with streaming animation (US-015)
- Completion detection via API flag (US-016)
- NPC responds in German regardless (server-side prompt) (US-017)
- MessageList auto-scroll (US-018)
- Error display and retry button (US-019)

### 13.4 Helper Chat Stories (US-020 to US-025)

**Covered by:**
- ChatPanel (helper) with initial message display (US-020)
- MessageInput in right panel for vocabulary questions (US-021)
- Helper responses with personality (US-022, US-023, US-024)
- Misleading responses (server-side prompt, 20% frequency) (US-025)

### 13.5 Session Persistence Stories (US-026 to US-030)

**Covered by:**
- Automatic message saving via API (US-026)
- Session restoration on page refresh (US-027, US-028)
- Profile link in top nav (US-029)
- Session expiration (server-side cleanup, not visible in UI) (US-030)

### 13.6 Completion and History Stories (US-031 to US-035)

**Covered by:**
- Completion flag detection (server-side, US-031)
- CompletionBanner display (US-032)
- HistoryRow on profile page (US-033)
- HistoryModal for replay (US-034)
- No delete/export UI (US-035)

### 13.7 Rate Limiting Stories (US-036 to US-040)

**Covered by:**
- Rate limit check before session creation (server-side, US-036)
- Completion counter display on scenarios page (US-037)
- Grayed tiles and blocking message (US-038)
- Reset handled server-side (US-039)
- Redirect to landing if not authenticated (future, US-040)

### 13.8 Error Handling Stories (US-041 to US-048)

**Covered by:**
- Timeout error display and retry (US-041, US-042)
- Network disconnection indicator (US-043)
- Session restoration failure redirect (US-044)
- Streaming interruption partial display (US-045)
- Content filter handled server-side (US-046)
- Database write failure error display (US-047)
- Active session prevents starting new (US-048)

### 13.9 Mobile and Responsive Stories (US-049 to US-051)

**Status:** Deferred to post-MVP (explicitly out of scope)

### 13.10 Performance Stories (US-052 to US-054)

**Covered by:**
- Server-side rendering for fast page loads (US-052)
- Typing animation provides streaming UX (US-053)
- Database queries optimized with indexes (US-054)

### 13.11 Security Stories (US-056 to US-060)

**Covered by:**
- Mock auth with cookies (US-056, US-057 baseline)
- No message content in logs (US-058)
- Profile shows only user's data (US-059)
- Account deletion removes all data (US-060)

---

## 14. Pain Point Mitigation

### 14.3 Boring Repetition

**Pain Point:** Drill-based apps feel like work, not engagement

**UI Solutions:**
- Narrative scenarios (marketplace, party, kebab)
- Flexible branching (LLM generates varied responses)
- Helper personality creates relationship dynamic
- Immersive aesthetic (minimal, enigmatic)
- No repetitive drill mechanics visible

**UX Elements:**
- Scenario variety via tiles
- Helper's sardonic commentary
- No progress bars or completion percentages
- Replay shows different conversations each time (LLM flexibility)

### 14.4 No Contextual Learning

**Pain Point:** Vocabulary lists lack narrative context that aids retention

**UI Solutions:**
- All learning embedded in scenarios (marketplace, party, etc.)
- Helper explains vocabulary in context
- Conversation history preserves learning context
- Replay allows reviewing vocabulary in original narrative

**UX Elements:**
- Dual-chat view keeps context visible
- Helper references main conversation
- History replay shows full narrative arc

### 14.5 Binary Feedback

**Pain Point:** Either "correct" or "incorrect" without nuanced guidance

**UI Solutions:**
- No explicit success/failure feedback
- NPC continues conversation regardless of user's German quality
- Helper provides hints and suggestions (not corrections)
- Completion based on narrative arc, not correctness

**UX Elements:**
- No red X or green checkmarks
- No score displays
- Helper offers "suggestions" not "corrections"
- Conversation flows naturally

### 14.6 Rigid Structures

**Pain Point:** Can't explore tangential conversations or make creative choices

**UI Solutions:**
- LLM-driven flexible responses (not scripted)
- User can say anything (no forced choices)
- Helper can be asked anything
- Scenarios conclude naturally (not at fixed points)

**UX Elements:**
- Free-form text input (not multiple choice)
- No conversation trees visible
- No "you can't say that" blocking
- Open-ended interactions

---

## 15. Future Enhancements (Post-MVP)

### 15.1 Mobile Optimization

**Planned Changes:**
- Vertical stacking (main on top, helper below)
- Tap headers to switch focus
- Touch-optimized interactions
- Responsive breakpoints

**UI Impact:**
- Redesign layout for portrait orientation
- Adjust tile sizing for smaller screens
- Optimize input handling for mobile keyboards

### 15.2 Helper Intervention System

**Planned Feature:** Helper breaks fourth wall to comment on user behavior

**UI Impact:**
- Helper proactively sends messages (not user-initiated)
- Special message styling for interventions
- Possible notification system

### 15.3 Progress Tracking

**Planned Feature:** Analytics dashboard for user progress

**UI Impact:**
- New view: /progress or /analytics
- Charts and statistics
- Vocabulary mastery indicators

### 15.4 Additional Scenarios

**Planned Feature:** 5-10 more scenarios

**UI Impact:**
- Paginated or scrollable scenario grid
- Scenario categories or difficulty indicators
- Search or filter functionality

### 15.5 Vocabulary Review System

**Planned Feature:** Post-scenario vocabulary summaries

**UI Impact:**
- Summary modal after completion
- Vocabulary list view
- Review functionality in profile

---

## 16. Conclusion

This UI architecture for Maraum MVP supports a minimal, immersive German language learning experience centered on dual-chat interaction. The design prioritizes simplicity, enigmatic discovery, and psychological safety over traditional educational patterns.

**Key Architectural Decisions:**
1. **Server-first rendering** (Astro SSR) with selective React hydration reduces complexity
2. **Minimal component library** (Shadcn/ui subset) keeps bundle size small
3. **React Context for session state** avoids external state management dependencies
4. **Desktop-only scope** defers responsive complexity to post-MVP
5. **Mock authentication** speeds up development and testing
6. **Helper's voice for errors** maintains immersive personality consistently

**Design Philosophy Alignment:**
- Enigmatic aesthetics (minimal explanations, reward discovery)
- Immersive gamification (commitment mechanics, no points/badges)
- Liminal space concept (魔 vs 間 visually and functionally distinct)

**Implementation Readiness:**
- All views mapped to API endpoints
- All user stories covered by UI elements
- Error states and edge cases defined
- Component hierarchy clearly structured
- Data flow patterns established

This architecture provides a comprehensive blueprint for frontend implementation, ensuring alignment with product requirements, API capabilities, and user experience goals.

