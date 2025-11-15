# View Implementation Plan: Active Session Page

## 1. Overview

The Active Session Page provides the core dual-chat interface for German language practice. Users engage with an LLM-powered German NPC in the left panel (魔 - Main Chat) while receiving real-time help from a sarcastic English-speaking AI companion in the right panel (間 - Helper Chat). The page supports independent message streaming, automatic session persistence, natural scenario completion, and comprehensive error handling. All interactions are optimistic with automatic save, requiring no manual user action to preserve progress.

## 2. View Routing

**Primary Path:** `/session?id={sessionId}`

**Astro Page:** `src/pages/session.astro`

**Route Parameters:**
- Query parameter `id`: UUID v4 format (required)
- Example: `/session?id=550e8400-e29b-41d4-a716-446655440000`

**Access Control:**
- No authentication required for MVP
- Session ID validation on page load
- Invalid/missing ID redirects to `/scenarios` with error message

## 3. Component Structure

```
session.astro (Astro SSR page)
│
└── DualChatInterface.tsx (React, client:load)
    │
    ├── SessionProvider.tsx (React Context wrapper)
    │   │
    │   ├── CompletionBanner.tsx (conditional, when session.is_completed)
    │   │
    │   ├── div.grid (CSS Grid container, 50/50 split)
    │   │   │
    │   │   ├── ChatPanel.tsx (chatType="main")
    │   │   │   ├── PanelHeader
    │   │   │   │   ├── h2 (魔 icon + scenario title)
    │   │   │   │
    │   │   │   ├── MessageList.tsx
    │   │   │   │   └── Message.tsx[] (mapped from mainMessages)
    │   │   │   │       └── useTypingAnimation (for assistant messages)
    │   │   │   │
    │   │   │   ├── MessageInput.tsx
    │   │   │   │   ├── Textarea (Shadcn/ui)
    │   │   │   │   ├── div.char-counter
    │   │   │   │   └── Button (Shadcn/ui, send)
    │   │   │   │
    │   │   │   └── LoadingSpinner (conditional, when isMainLoading)
    │   │   │
    │   │   └── ChatPanel.tsx (chatType="helper")
    │   │       ├── PanelHeader
    │   │       │   ├── h2 (間 icon + "Helper")
    │   │       │
    │   │       ├── MessageList.tsx
    │   │       │   └── Message.tsx[] (mapped from helperMessages)
    │   │       │       └── useTypingAnimation (for assistant messages)
    │   │       │
    │   │       ├── MessageInput.tsx
    │   │       │   ├── Textarea (Shadcn/ui)
    │   │       │   ├── div.char-counter
    │   │       │   └── Button (Shadcn/ui, send)
    │   │       │
    │   │       └── LoadingSpinner (conditional, when isHelperLoading)
```

## 4. Component Details

### 4.1 session.astro

**Component Description:**
Astro SSR page component that handles server-side session data fetching, validation, and initial error states before rendering the React dual-chat interface.

**Main Elements:**
```astro
---
// Server-side data fetching
const sessionId = Astro.url.searchParams.get('id');
const sessionData = await getSessionWithMessages(sessionId);
const { session, mainMessages, helperMessages } = sessionData;
---

<Layout>
  <DualChatInterface
    initialSession={session}
    initialMainMessages={mainMessages}
    initialHelperMessages={helperMessages}
    client:load
  />
</Layout>
```

**Handled Interactions:**
- None (server-side only)

**Validation Conditions:**
1. **Session ID Presence**: Query param `id` must exist
   - If missing: Redirect to `/scenarios` with error "Session ID required"
2. **Session ID Format**: Must be valid UUID v4
   - If invalid: Redirect to `/scenarios` with error "Invalid session ID format"
3. **Session Existence**: Session must exist in database
   - If 404: Redirect to `/scenarios` with error "Session not found"
4. **API Response Success**: GET request must return 200
   - If 500: Display error page with retry option

**Types Required:**
- `SessionDTO` (from types.ts)
- `MessageDTO` (from types.ts)
- `SessionViewData` (new ViewModel, see section 5)

**Props:**
N/A (top-level page component)

---

### 4.2 DualChatInterface.tsx

**Component Description:**
Main React container that wraps the SessionProvider and renders the dual-chat layout with completion banner. Provides the CSS Grid structure for 50/50 split.

**Main Elements:**
```tsx
<SessionProvider
  initialSession={initialSession}
  initialMainMessages={initialMainMessages}
  initialHelperMessages={initialHelperMessages}
>
  <div className="flex flex-col h-full">
    <CompletionBanner isVisible={session?.is_completed ?? false} />

    <div className="grid grid-cols-2 flex-1 gap-0">
      <ChatPanel
        chatType="main"
        scenarioTitle={session?.scenario.title}
        messages={mainMessages}
        onSendMessage={sendMainMessage}
        isLoading={isMainLoading}
        isCompleted={session?.is_completed ?? false}
      />

      <ChatPanel
        chatType="helper"
        messages={helperMessages}
        onSendMessage={sendHelperMessage}
        isLoading={isHelperLoading}
        isCompleted={session?.is_completed ?? false}
      />
    </div>
  </div>
</SessionProvider>
```

**Handled Interactions:**
- None (delegates to child components)

**Validation Conditions:**
- None (validation handled by SessionProvider and children)

**Types Required:**
- `SessionDTO`
- `MessageDTO[]`
- `DualChatInterfaceProps` (see section 5)

**Props:**
```typescript
interface DualChatInterfaceProps {
  initialSession: SessionDTO;
  initialMainMessages: MessageDTO[];
  initialHelperMessages: MessageDTO[];
}
```

---

### 4.3 SessionProvider.tsx

**Component Description:**
React Context provider that manages session state, message lists, loading states, and API communication. Provides actions to send messages and handles optimistic UI updates with error recovery.

**Main Elements:**
```tsx
export const SessionProvider: React.FC<SessionProviderProps> = ({ children, initialSession, initialMainMessages, initialHelperMessages }) => {
  const [session, setSession] = useState<SessionDTO | null>(initialSession);
  const [mainMessages, setMainMessages] = useState<MessageDTO[]>(initialMainMessages);
  const [helperMessages, setHelperMessages] = useState<MessageDTO[]>(initialHelperMessages);
  const [isMainLoading, setIsMainLoading] = useState(false);
  const [isHelperLoading, setIsHelperLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMainMessage = async (content: string) => {
    // Implementation in section 7
  };

  const sendHelperMessage = async (content: string) => {
    // Implementation in section 7
  };

  const value: SessionContextValue = {
    session,
    mainMessages,
    helperMessages,
    isMainLoading,
    isHelperLoading,
    sendMainMessage,
    sendHelperMessage,
    error,
    clearError: () => setError(null)
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
};
```

**Handled Interactions:**
- API calls for sending messages
- Optimistic UI updates
- Error handling and recovery
- Session completion detection

**Validation Conditions:**
1. **Session Not Completed**: Before sending message, verify `session.is_completed === false`
   - If completed: Reject send attempt, display error "This scenario has concluded"
2. **Valid Session State**: Session object must not be null
   - If null: Display error "Session data unavailable"

**Types Required:**
- `SessionContextValue` (see section 5)
- `SessionProviderProps` (see section 5)
- `MessageDTO`
- `MessageResponseDTO`

**Props:**
```typescript
interface SessionProviderProps {
  children: React.ReactNode;
  initialSession: SessionDTO;
  initialMainMessages: MessageDTO[];
  initialHelperMessages: MessageDTO[];
}
```

---

### 4.4 ChatPanel.tsx

**Component Description:**
Reusable panel component for both main and helper chats. Renders header with appropriate icon/title, scrollable message list, input area, and loading indicator.

**Main Elements:**
```tsx
<div className={`flex flex-col h-full border-r border-gray-200 ${chatType === 'main' ? 'bg-gray-50' : 'bg-slate-50'}`}>
  {/* Header */}
  <div className="px-6 py-4 border-b border-gray-200">
    <h2 className="text-lg font-medium">
      <span className="text-2xl mr-2">{chatType === 'main' ? '魔' : '間'}</span>
      {chatType === 'main' ? scenarioTitle : 'Helper'}
    </h2>
  </div>

  {/* Message List - Scrollable Area */}
  <div className="flex-1 overflow-y-auto">
    <MessageList messages={messages} chatType={chatType} />
  </div>

  {/* Loading Indicator */}
  {isLoading && <LoadingSpinner />}

  {/* Message Input - Fixed at Bottom */}
  <div className="border-t border-gray-200 p-4">
    <MessageInput
      onSend={onSendMessage}
      isLoading={isLoading}
      isDisabled={isCompleted}
      placeholder={chatType === 'main' ? 'Type in German...' : 'Ask for help...'}
      chatType={chatType}
    />
  </div>
</div>
```

**Handled Interactions:**
- Delegates message sending to parent via `onSendMessage` callback
- Displays loading state during message processing

**Validation Conditions:**
- None (validation delegated to MessageInput)

**Types Required:**
- `ChatPanelProps` (see section 5)
- `ChatType`
- `MessageDTO[]`

**Props:**
```typescript
interface ChatPanelProps {
  chatType: ChatType;
  scenarioTitle?: string; // Only provided for main chat
  messages: MessageDTO[];
  onSendMessage: (content: string) => Promise<void>;
  isLoading: boolean;
  isCompleted: boolean;
}
```

---

### 4.5 MessageList.tsx

**Component Description:**
Scrollable container that renders all messages for a chat panel. Implements auto-scroll behavior that follows new messages but respects manual user scrolling.

**Main Elements:**
```tsx
<div
  className="flex flex-col gap-4 p-6"
  onScroll={handleScroll}
  ref={containerRef}
>
  {messages.map((message) => (
    <Message
      key={message.id}
      message={message}
      chatType={chatType}
    />
  ))}
  <div ref={scrollAnchorRef} />
</div>
```

**Handled Interactions:**
- `onScroll`: Detects user scroll position to enable/disable auto-scroll

**Validation Conditions:**
- None (display only)

**Types Required:**
- `MessageListProps` (see section 5)
- `MessageDTO[]`
- `ChatType`

**Props:**
```typescript
interface MessageListProps {
  messages: MessageDTO[];
  chatType: ChatType;
}
```

---

### 4.6 Message.tsx

**Component Description:**
Individual message display component with conditional styling based on role (user vs assistant) and typing animation for assistant messages.

**Main Elements:**
```tsx
const isUser = message.role === 'user';
const displayText = isUser ? message.content : useTypingAnimation(message.content, 20);

<div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
  <div className={`max-w-[70%] rounded-lg p-3 ${
    isUser
      ? 'bg-blue-500 text-white'
      : chatType === 'main'
        ? 'bg-white border border-gray-200'
        : 'bg-slate-100'
  }`}>
    <p className="text-sm whitespace-pre-wrap">{displayText}</p>
    <time className="text-xs opacity-70 mt-1 block">
      {formatTimestamp(message.sent_at)}
    </time>
  </div>
</div>
```

**Handled Interactions:**
- None (display only, animation handled by hook)

**Validation Conditions:**
- None (receives validated data from parent)

**Types Required:**
- `MessageProps` (see section 5)
- `MessageDTO`
- `ChatType`
- `MessageRole`

**Props:**
```typescript
interface MessageProps {
  message: MessageDTO;
  chatType: ChatType;
}
```

---

### 4.7 MessageInput.tsx

**Component Description:**
Text input component with send button, character counter, and keyboard shortcuts. Handles input validation and disabled states.

**Main Elements:**
```tsx
const [inputValue, setInputValue] = useState('');
const charCount = inputValue.length;
const isNearLimit = charCount > 7500;
const canSend = inputValue.trim().length > 0 && charCount <= 8000 && !isLoading && !isDisabled;

<div className="flex flex-col gap-2">
  {/* Character Counter */}
  {isNearLimit && (
    <div className="text-xs text-right text-gray-500">
      {charCount} / 8000 characters
    </div>
  )}

  {/* Input Area */}
  <div className="flex gap-2">
    <Textarea
      value={inputValue}
      onChange={(e) => setInputValue(e.target.value)}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      disabled={isDisabled || isLoading}
      className="flex-1 resize-none"
      rows={3}
    />

    <Button
      onClick={handleSend}
      disabled={!canSend}
      variant="default"
      size="icon"
    >
      <Send className="h-4 w-4" />
    </Button>
  </div>
</div>
```

**Handled Interactions:**
1. **onChange**: Updates input value and character count
2. **onKeyDown**:
   - Enter (without Shift): Sends message if valid
   - Shift+Enter: Inserts new line
3. **onClick (Send button)**: Sends message if valid

**Validation Conditions:**
1. **Non-Empty Content**: Input must have at least 1 non-whitespace character
   - Effect: Send button disabled when empty
2. **Character Limit**: Input must be <= 8000 characters
   - Effect: Send button disabled when exceeded, counter turns red
3. **Not Loading**: Cannot send while previous message is processing
   - Effect: Send button disabled, input disabled
4. **Not Completed**: Cannot send when session is completed
   - Effect: Send button disabled, input disabled with gray styling

**Types Required:**
- `MessageInputProps` (see section 5)
- `ChatType`

**Props:**
```typescript
interface MessageInputProps {
  onSend: (content: string) => Promise<void>;
  isLoading: boolean;
  isDisabled: boolean;
  placeholder: string;
  chatType: ChatType;
}
```

---

### 4.8 CompletionBanner.tsx

**Component Description:**
Minimal notification banner that appears at the top of the interface when a scenario has been completed. Non-dismissible, provides visual confirmation of completion state.

**Main Elements:**
```tsx
{isVisible && (
  <div className="sticky top-0 z-10 bg-slate-100 border-b border-slate-200 px-6 py-3">
    <p className="text-sm text-center text-slate-700">
      Scenario has been concluded.
    </p>
  </div>
)}
```

**Handled Interactions:**
- None (display only, no dismiss action)

**Validation Conditions:**
- None (conditional rendering based on prop)

**Types Required:**
- `CompletionBannerProps` (see section 5)

**Props:**
```typescript
interface CompletionBannerProps {
  isVisible: boolean;
}
```

---

### 4.9 LoadingSpinner.tsx

**Component Description:**
Simple loading indicator displayed during AI response processing.

**Main Elements:**
```tsx
<div className="flex justify-center items-center py-4">
  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
</div>
```

**Handled Interactions:**
- None (display only)

**Validation Conditions:**
- None

**Types Required:**
- None (no props)

**Props:**
- None

---

## 5. Types

### 5.1 Existing DTOs (from types.ts)

**SessionDTO**
```typescript
type SessionDTO = Omit<Tables<"sessions">, "updated_at"> & {
  scenario: ScenarioEmbedDTO;
  messages?: MessageDTO[];
}

// Fields breakdown:
// - id: string (UUID)
// - user_id: string | null
// - scenario_id: number
// - is_completed: boolean
// - started_at: string (ISO 8601)
// - last_activity_at: string (ISO 8601)
// - completed_at: string | null (ISO 8601)
// - message_count_main: number
// - message_count_helper: number
// - duration_seconds: number | null
// - scenario: ScenarioEmbedDTO { id, title, emoji }
// - messages?: MessageDTO[]
```

**MessageDTO**
```typescript
type MessageDTO = Pick<Tables<"messages">, "id" | "role" | "chat_type" | "content" | "sent_at">

// Fields breakdown:
// - id: string (UUID)
// - role: MessageRole ('user' | 'main_assistant' | 'helper_assistant')
// - chat_type: ChatType ('main' | 'helper')
// - content: string
// - sent_at: string (ISO 8601)
```

**MessageResponseDTO**
```typescript
interface MessageResponseDTO {
  user_message: MessageDTO;
  assistant_message: MessageDTO;
  session_complete: boolean;
  completion_flag_detected: boolean;
  session?: SessionCompletionDTO;
}

// Fields breakdown:
// - user_message: The message the user sent
// - assistant_message: The AI's response
// - session_complete: Whether the scenario concluded with this exchange
// - completion_flag_detected: Whether the LLM included completion flag
// - session?: Optional completion metadata if session_complete is true
```

**ChatType**
```typescript
type ChatType = Enums<"chat_type_enum">
// Literal type: 'main' | 'helper'
```

**MessageRole**
```typescript
type MessageRole = Enums<"message_role">
// Literal type: 'user' | 'main_assistant' | 'helper_assistant'
```

### 5.2 New ViewModels and Interfaces

**SessionViewData**
```typescript
interface SessionViewData {
  session: SessionDTO;
  mainMessages: MessageDTO[];
  helperMessages: MessageDTO[];
}

// Purpose: Separate messages by chat type for easier consumption
// Used by: session.astro during server-side data preparation
// Fields:
// - session: Complete session metadata
// - mainMessages: Filtered messages where chat_type === 'main'
// - helperMessages: Filtered messages where chat_type === 'helper'
```

**SessionContextValue**
```typescript
interface SessionContextValue {
  session: SessionDTO | null;
  mainMessages: MessageDTO[];
  helperMessages: MessageDTO[];
  isMainLoading: boolean;
  isHelperLoading: boolean;
  sendMainMessage: (content: string) => Promise<void>;
  sendHelperMessage: (content: string) => Promise<void>;
  error: string | null;
  clearError: () => void;
}

// Purpose: Define the shape of context provided by SessionProvider
// Used by: useSession() hook consumers
// Fields:
// - session: Current session metadata, null if not loaded
// - mainMessages: Array of all main chat messages
// - helperMessages: Array of all helper chat messages
// - isMainLoading: Loading state for main chat API call
// - isHelperLoading: Loading state for helper chat API call
// - sendMainMessage: Action to send message in main chat
// - sendHelperMessage: Action to send message in helper chat
// - error: Current error message if any operation failed
// - clearError: Action to clear error state
```

**SessionProviderProps**
```typescript
interface SessionProviderProps {
  children: React.ReactNode;
  initialSession: SessionDTO;
  initialMainMessages: MessageDTO[];
  initialHelperMessages: MessageDTO[];
}

// Purpose: Props interface for SessionProvider component
// Fields:
// - children: React children to wrap with context
// - initialSession: Session data fetched server-side
// - initialMainMessages: Initial messages for main chat
// - initialHelperMessages: Initial messages for helper chat
```

**DualChatInterfaceProps**
```typescript
interface DualChatInterfaceProps {
  initialSession: SessionDTO;
  initialMainMessages: MessageDTO[];
  initialHelperMessages: MessageDTO[];
}

// Purpose: Props for top-level React component
// Fields: Same as SessionProviderProps minus children
```

**ChatPanelProps**
```typescript
interface ChatPanelProps {
  chatType: ChatType;
  scenarioTitle?: string;
  messages: MessageDTO[];
  onSendMessage: (content: string) => Promise<void>;
  isLoading: boolean;
  isCompleted: boolean;
}

// Purpose: Props for reusable ChatPanel component
// Fields:
// - chatType: 'main' or 'helper', determines styling and behavior
// - scenarioTitle: Optional title, only provided for main chat header
// - messages: Array of messages to display in this panel
// - onSendMessage: Callback to send new message
// - isLoading: Whether API call is in progress
// - isCompleted: Whether session has concluded (disables input)
```

**MessageListProps**
```typescript
interface MessageListProps {
  messages: MessageDTO[];
  chatType: ChatType;
}

// Purpose: Props for MessageList component
// Fields:
// - messages: Array of messages to render
// - chatType: Determines subtle styling differences
```

**MessageProps**
```typescript
interface MessageProps {
  message: MessageDTO;
  chatType: ChatType;
}

// Purpose: Props for individual Message component
// Fields:
// - message: Single message to display
// - chatType: Determines background color scheme
```

**MessageInputProps**
```typescript
interface MessageInputProps {
  onSend: (content: string) => Promise<void>;
  isLoading: boolean;
  isDisabled: boolean;
  placeholder: string;
  chatType: ChatType;
}

// Purpose: Props for MessageInput component
// Fields:
// - onSend: Callback when user sends message
// - isLoading: Disables input during API call
// - isDisabled: Disables input when session completed
// - placeholder: Input placeholder text (differs by chat type)
// - chatType: Used for potential styling differences
```

**CompletionBannerProps**
```typescript
interface CompletionBannerProps {
  isVisible: boolean;
}

// Purpose: Props for CompletionBanner component
// Fields:
// - isVisible: Controls conditional rendering
```

### 5.3 Service Function Types

**SendMessageRequest** (matches API payload)
```typescript
interface SendMessageRequest {
  chat_type: ChatType;
  content: string;
  client_message_id?: string;
}

// Purpose: Request body type for POST /api/sessions/:sessionId/messages
// Note: Matches SendMessageCommand from types.ts
```

## 6. State Management

### 6.1 Overview

State management follows a hierarchical pattern:
1. **Server State**: Fetched in `session.astro` via Astro's top-level await
2. **React Context**: SessionProvider manages session state, message lists, loading flags
3. **Component Local State**: UI-specific state like input values, scroll position

### 6.2 SessionContext Architecture

**Provider Location:** SessionProvider.tsx wraps all children in DualChatInterface

**Context Value Structure:**
```typescript
const SessionContext = createContext<SessionContextValue | undefined>(undefined);
```

**State Variables:**
```typescript
const [session, setSession] = useState<SessionDTO | null>(initialSession);
const [mainMessages, setMainMessages] = useState<MessageDTO[]>(initialMainMessages);
const [helperMessages, setHelperMessages] = useState<MessageDTO[]>(initialHelperMessages);
const [isMainLoading, setIsMainLoading] = useState(false);
const [isHelperLoading, setIsHelperLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
```

**Why Separate Arrays:**
- `mainMessages` and `helperMessages` are kept separate (not a single array filtered by UI) for performance
- Avoids re-filtering on every render
- Allows independent updates without affecting the other chat

### 6.3 Custom Hooks

**useSession()** - Access SessionContext
```typescript
function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}

// Usage in components:
const { session, mainMessages, sendMainMessage, isMainLoading } = useSession();
```

**useTypingAnimation()** - Character-by-character animation
```typescript
function useTypingAnimation(text: string, speed: number = 20): string {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    let index = 0;
    let animationFrame: number;
    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - lastTime;

      if (elapsed >= speed) {
        if (index < text.length) {
          setDisplayedText(text.slice(0, index + 1));
          index++;
          lastTime = currentTime;
        }
      }

      if (index < text.length) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [text, speed]);

  return displayedText;
}

// Usage:
const displayText = useTypingAnimation(message.content, 20);
```

**useAutoScroll()** - Manage auto-scroll behavior
```typescript
function useAutoScroll(messages: MessageDTO[]) {
  const scrollAnchorRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (autoScrollEnabled && scrollAnchorRef.current) {
      scrollAnchorRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, autoScrollEnabled]);

  // Detect manual scroll
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const isAtBottom =
      Math.abs(element.scrollHeight - element.scrollTop - element.clientHeight) < 10;
    setAutoScrollEnabled(isAtBottom);
  };

  return { scrollAnchorRef, containerRef, handleScroll };
}

// Usage in MessageList:
const { scrollAnchorRef, containerRef, handleScroll } = useAutoScroll(messages);
```

### 6.4 Component Local State

**MessageInput.tsx:**
```typescript
const [inputValue, setInputValue] = useState('');
// Tracks current input text
// Cleared after successful send
```

**Message.tsx:**
```typescript
// No local state, uses useTypingAnimation hook
// Hook manages displayedText internally
```

### 6.5 State Update Flow

**Sending a Message:**
1. User types in MessageInput → `inputValue` state updates
2. User presses Enter/clicks Send → `onSend` callback fires
3. SessionProvider's `sendMainMessage` executes:
   - Sets `isMainLoading = true`
   - Adds optimistic user message to `mainMessages`
   - Calls API
   - On success: Replaces optimistic message, adds assistant message
   - On error: Removes optimistic message, sets `error`
   - Sets `isMainLoading = false`
4. Message component renders with typing animation
5. MessageList auto-scrolls to new message

**Session Completion:**
1. API response includes `session_complete: true`
2. SessionProvider updates `session.is_completed = true`
3. CompletionBanner becomes visible
4. ChatPanel passes `isCompleted={true}` to MessageInput
5. MessageInput disables itself

## 7. API Integration

### 7.1 Initial Session Load (Server-Side)

**Endpoint:** `GET /api/sessions/:sessionId?include_messages=true`

**Location:** `session.astro` (server-side)

**Request:**
```typescript
const sessionId = Astro.url.searchParams.get('id');

if (!sessionId) {
  return Astro.redirect('/scenarios?error=session_id_required');
}

const response = await fetch(`${Astro.url.origin}/api/sessions/${sessionId}?include_messages=true`);

if (!response.ok) {
  if (response.status === 404) {
    return Astro.redirect('/scenarios?error=session_not_found');
  }
  throw new Error('Failed to load session');
}

const sessionData: SessionDTO = await response.json();
```

**Response Type:** `SessionDTO`

**Data Transformation:**
```typescript
const mainMessages = sessionData.messages?.filter(m => m.chat_type === 'main') || [];
const helperMessages = sessionData.messages?.filter(m => m.chat_type === 'helper') || [];

const viewData: SessionViewData = {
  session: sessionData,
  mainMessages,
  helperMessages
};
```

**Error Handling:**
- 404: Redirect to `/scenarios` with error query param
- 500: Display error page with retry option
- Network error: Display error page with retry option

### 7.2 Send Message (Client-Side)

**Endpoint:** `POST /api/sessions/:sessionId/messages`

**Location:** SessionProvider's `sendMainMessage` and `sendHelperMessage` functions

**Request Type:** `SendMessageRequest`
```typescript
{
  chat_type: 'main' | 'helper',
  content: string,
  client_message_id?: string
}
```

**Response Type:** `MessageResponseDTO`
```typescript
{
  user_message: MessageDTO,
  assistant_message: MessageDTO,
  session_complete: boolean,
  completion_flag_detected: boolean,
  session?: SessionCompletionDTO
}
```

**Implementation:**
```typescript
const sendMainMessage = async (content: string) => {
  if (!session || session.is_completed) {
    setError('This scenario has concluded. You cannot send more messages.');
    return;
  }

  setIsMainLoading(true);
  setError(null);

  // Optimistic update
  const optimisticMessage: MessageDTO = {
    id: `temp-${Date.now()}`,
    role: 'user',
    chat_type: 'main',
    content,
    sent_at: new Date().toISOString()
  };
  setMainMessages(prev => [...prev, optimisticMessage]);

  try {
    const requestBody: SendMessageRequest = {
      chat_type: 'main',
      content,
      client_message_id: crypto.randomUUID()
    };

    const response = await fetch(`/api/sessions/${session.id}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to send message');
    }

    const data: MessageResponseDTO = await response.json();

    // Replace optimistic message with real ones
    setMainMessages(prev => [
      ...prev.filter(m => m.id !== optimisticMessage.id),
      data.user_message,
      data.assistant_message
    ]);

    // Handle session completion
    if (data.session_complete && data.session) {
      setSession(prev => prev ? {
        ...prev,
        is_completed: true,
        completed_at: data.session.completed_at,
        duration_seconds: data.session.duration_seconds
      } : null);
    }

  } catch (err) {
    // Remove optimistic message on error
    setMainMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));

    setError(
      err instanceof Error
        ? err.message
        : 'Connection lost. How disappointing. Your progress is safe, try again.'
    );
  } finally {
    setIsMainLoading(false);
  }
};

// sendHelperMessage implementation is identical except:
// - chat_type: 'helper'
// - Updates helperMessages array
// - Sets isHelperLoading
// - No session completion check (only main chat completes sessions)
```

**Idempotency:**
- Each request includes `client_message_id` (UUID v4)
- Backend checks for duplicate processing
- Returns existing response if duplicate detected

**Error Response Handling:**
```typescript
// 409 Conflict (session already completed)
if (response.status === 409) {
  setError('This scenario has concluded. You cannot send more messages.');
  setSession(prev => prev ? { ...prev, is_completed: true } : null);
}

// 400 Bad Request (validation error)
if (response.status === 400) {
  const errorData = await response.json();
  setError(errorData.message);
}

// 504 Gateway Timeout
if (response.status === 504) {
  setError('Connection lost. How disappointing. Try again.');
}

// 500 Internal Server Error
if (response.status === 500) {
  setError('The system has failed you. Please try again.');
}
```

## 8. User Interactions

### 8.1 Typing and Sending Messages

**Interaction:** User types in main chat input
- **Trigger:** `onChange` event on Textarea
- **Action:** Update `inputValue` state
- **Effect:** Character count updates, send button enables/disables based on validation

**Interaction:** User presses Enter (without Shift) in main chat
- **Trigger:** `onKeyDown` event, `e.key === 'Enter' && !e.shiftKey`
- **Action:** Call `handleSend()`, prevent default
- **Effect:**
  - Message sent if valid
  - Input cleared
  - Optimistic message appears
  - Loading spinner shows
  - Send button disabled

**Interaction:** User presses Shift+Enter in main chat
- **Trigger:** `onKeyDown` event, `e.key === 'Enter' && e.shiftKey`
- **Action:** Allow default behavior
- **Effect:** New line inserted in textarea

**Interaction:** User clicks Send button in main chat
- **Trigger:** `onClick` event on Button
- **Action:** Call `handleSend()`
- **Effect:** Same as Enter key

**Interaction:** User types in helper chat input
- **Trigger:** `onChange` event on Textarea
- **Action:** Same as main chat, independent state

### 8.2 Receiving Messages

**Interaction:** Assistant response arrives from API
- **Trigger:** API response in `sendMainMessage`
- **Action:** Add assistant message to `mainMessages` array
- **Effect:**
  - Loading spinner disappears
  - Message component renders with typing animation
  - Auto-scroll triggers
  - New message appears character-by-character

**Interaction:** Typing animation completes
- **Trigger:** `useTypingAnimation` hook finishes
- **Action:** Full message text displayed
- **Effect:** No change, message remains static

### 8.3 Scrolling Behavior

**Interaction:** New message arrives while user is at bottom
- **Trigger:** `messages` array updates, `autoScrollEnabled === true`
- **Action:** `scrollIntoView()` on scroll anchor
- **Effect:** Smooth scroll to new message

**Interaction:** User manually scrolls up
- **Trigger:** `onScroll` event, scroll position not at bottom
- **Action:** Set `autoScrollEnabled = false`
- **Effect:** New messages don't trigger auto-scroll

**Interaction:** User manually scrolls back to bottom
- **Trigger:** `onScroll` event, scroll position within 10px of bottom
- **Action:** Set `autoScrollEnabled = true`
- **Effect:** Next message triggers auto-scroll

### 8.4 Session Completion

**Interaction:** Session completes (completion flag in API response)
- **Trigger:** `data.session_complete === true` in API response
- **Action:** Update `session.is_completed`, show CompletionBanner
- **Effect:**
  - Banner appears at top
  - Both message inputs disable
  - Send buttons gray out
  - User can still scroll and read messages

**Interaction:** User tries to send message after completion
- **Trigger:** Click send or press Enter
- **Action:** Early return in `sendMainMessage`
- **Effect:** Error message displays: "This scenario has concluded"

### 8.5 Error Handling

**Interaction:** API call fails
- **Trigger:** Network error or non-OK response
- **Action:** Remove optimistic message, set `error` state
- **Effect:**
  - Error message displays (in helper's voice)
  - Retry option shown
  - User message preserved in input

**Interaction:** User clicks retry after error
- **Trigger:** Click retry button
- **Action:** Call `clearError()`, user re-sends message
- **Effect:** Error cleared, new send attempt

**Interaction:** User refreshes page during active session
- **Trigger:** Page reload
- **Action:** Server-side fetch in `session.astro`
- **Effect:** Full session restored with all messages, scrolled to bottom

## 9. Conditions and Validation

### 9.1 Session-Level Conditions

**Condition: Session Must Exist**
- **Verified By:** `session.astro` on page load
- **Verification Method:** GET request to `/api/sessions/:sessionId`
- **Components Affected:** All (page-level redirect)
- **Effect on Interface:**
  - If false: Redirect to `/scenarios` with error message
  - If true: Page renders normally

**Condition: Session Must Not Be Completed**
- **Verified By:** SessionProvider before sending message
- **Verification Method:** Check `session.is_completed === false`
- **Components Affected:** MessageInput, ChatPanel
- **Effect on Interface:**
  - If false (not completed): Inputs enabled, send buttons active
  - If true (completed): Inputs disabled, send buttons disabled, CompletionBanner visible

### 9.2 Message-Level Validation

**Condition: Content Must Be Non-Empty**
- **Verified By:** MessageInput component
- **Verification Method:** `inputValue.trim().length > 0`
- **Components Affected:** MessageInput (send button)
- **Effect on Interface:**
  - If false: Send button disabled, grayed out
  - If true: Send button enabled (if other conditions met)

**Condition: Content Must Be <= 8000 Characters**
- **Verified By:** MessageInput component
- **Verification Method:** `inputValue.length <= 8000`
- **Components Affected:** MessageInput (send button, character counter)
- **Effect on Interface:**
  - If false: Send button disabled, character counter red
  - If true: Send button enabled (if other conditions met)
  - When approaching (> 7500): Character counter appears

**Condition: Not Currently Loading**
- **Verified By:** MessageInput component
- **Verification Method:** `!isLoading` prop
- **Components Affected:** MessageInput (textarea, send button)
- **Effect on Interface:**
  - If false (loading): Both textarea and send button disabled
  - If true (not loading): Controls enabled (if other conditions met)

### 9.3 API-Level Conditions

**Condition: Valid Session ID Format**
- **Verified By:** `session.astro` before API call
- **Verification Method:** UUID v4 regex or validation library
- **Components Affected:** All (page-level)
- **Effect on Interface:**
  - If invalid: Redirect to `/scenarios` with error

**Condition: Valid Chat Type**
- **Verified By:** TypeScript type system + ChatPanel prop
- **Verification Method:** Compile-time type checking
- **Components Affected:** ChatPanel, API request
- **Effect on Interface:**
  - Compile error if invalid type provided

### 9.4 Validation Summary Table

| Condition | Verified Where | Verification Timing | UI Effect |
|-----------|---------------|---------------------|-----------|
| Session exists | session.astro | Page load | Redirect if false |
| Session not completed | SessionProvider | Before send | Disable inputs if false |
| Valid session ID | session.astro | Page load | Redirect if false |
| Content non-empty | MessageInput | onChange | Disable send if false |
| Content <= 8000 chars | MessageInput | onChange | Disable send if false |
| Not loading | MessageInput | Prop update | Disable controls if false |
| Valid chat type | TypeScript | Compile time | Compiler error |

## 10. Error Handling

### 10.1 Session Not Found (404)

**Detection:** `session.astro` initial fetch returns 404
**Handling:**
```typescript
if (response.status === 404) {
  return Astro.redirect('/scenarios?error=session_not_found');
}
```
**User Experience:** Redirected to scenarios page with error message displayed

### 10.2 Session Already Completed (409)

**Detection:** POST message returns 409
**Handling:**
```typescript
if (response.status === 409) {
  setError('This scenario has concluded. You cannot send more messages.');
  setSession(prev => prev ? { ...prev, is_completed: true } : null);
}
```
**User Experience:**
- Error message displays
- CompletionBanner appears
- Inputs disable
- Session state updates to completed

### 10.3 API Timeout (504)

**Detection:** Response status 504 or fetch timeout
**Handling:**
```typescript
if (response.status === 504) {
  setError('Connection lost. How disappointing. Your progress is safe, try again.');
  // Optimistic message already removed in catch block
}
```
**User Experience:**
- Loading spinner stops
- Optimistic message removed
- Error message in helper's voice
- User can retry manually
- Original input preserved in local state (can be re-typed)

### 10.4 API Failure (500)

**Detection:** Response status 500
**Handling:**
```typescript
if (response.status >= 500) {
  setError('The system has failed you. Please try again.');
}
```
**User Experience:**
- Same as timeout
- Error message displayed
- Manual retry available

### 10.5 Network Disconnection

**Detection:** Fetch throws network error
**Handling:**
```typescript
catch (err) {
  if (err instanceof TypeError && err.message.includes('fetch')) {
    setError('No connection. Check your internet.');
  } else {
    setError('An unexpected error occurred. Try again.');
  }
}
```
**User Experience:**
- Clear offline message
- Controls remain enabled (user can retry)
- Optimistic message removed

### 10.6 Validation Error (400)

**Detection:** Response status 400
**Handling:**
```typescript
if (response.status === 400) {
  const errorData = await response.json();
  setError(errorData.message || 'Invalid message. Please check your input.');
}
```
**User Experience:**
- Error message from server displayed
- Input value preserved
- User can correct and retry

### 10.7 Invalid Session ID in URL

**Detection:** `session.astro` query param validation
**Handling:**
```typescript
const sessionId = Astro.url.searchParams.get('id');
if (!sessionId || !isValidUUID(sessionId)) {
  return Astro.redirect('/scenarios?error=invalid_session_id');
}
```
**User Experience:** Redirect to scenarios page

### 10.8 Streaming Interruption

**Detection:** Partial response or connection drop during streaming
**Note:** Not implemented in MVP (backend returns complete responses, not true streaming)
**Future Handling:**
- Display partial message with "..." ellipsis
- Show retry button
- Preserve partial content

### 10.9 Error Display Component

**Location:** Within SessionProvider or as separate ErrorBanner component

**Implementation:**
```tsx
{error && (
  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative mb-4">
    <p className="text-sm">{error}</p>
    <button
      onClick={clearError}
      className="absolute top-2 right-2 text-red-500 hover:text-red-700"
    >
      <X className="h-4 w-4" />
    </button>
  </div>
)}
```

### 10.10 Error Recovery Flow

**Standard Recovery Pattern:**
1. Error occurs during API call
2. Optimistic message removed (if applicable)
3. Loading state cleared (`isMainLoading = false`)
4. Error message set in context
5. Error displayed in UI
6. User can:
   - Click retry (re-sends same content)
   - Dismiss error and try different message
   - Navigate away (session persists)

## 11. Implementation Steps

### Step 1: Create Type Definitions
**File:** `src/types/session-view.types.ts`
```typescript
// Create all ViewModels and interfaces from section 5.2
export interface SessionViewData { ... }
export interface SessionContextValue { ... }
export interface SessionProviderProps { ... }
// ... etc
```

### Step 2: Create Service Layer Functions
**File:** `src/lib/services/session.service.ts`
```typescript
export async function getSessionWithMessages(sessionId: string): Promise<SessionDTO> {
  const response = await fetch(`/api/sessions/${sessionId}?include_messages=true`);
  if (!response.ok) throw new Error('Failed to fetch session');
  return response.json();
}
```

**File:** `src/lib/services/messages.service.ts`
```typescript
export async function sendMessage(
  sessionId: string,
  request: SendMessageRequest
): Promise<MessageResponseDTO> {
  const response = await fetch(`/api/sessions/${sessionId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  });
  if (!response.ok) throw new Error('Failed to send message');
  return response.json();
}
```

### Step 3: Create Custom Hooks
**File:** `src/components/hooks/useTypingAnimation.ts`
```typescript
// Implement character-by-character animation hook
// See section 6.3 for full implementation
```

**File:** `src/components/hooks/useAutoScroll.ts`
```typescript
// Implement auto-scroll behavior hook
// See section 6.3 for full implementation
```

### Step 4: Create SessionContext and Provider
**File:** `src/components/session/SessionContext.tsx`
```typescript
// Create context
export const SessionContext = createContext<SessionContextValue | undefined>(undefined);

// Create provider component (see section 4.3)
export const SessionProvider: React.FC<SessionProviderProps> = ({ ... }) => { ... }

// Create hook
export function useSession(): SessionContextValue { ... }
```

### Step 5: Create Presentational Components
**File:** `src/components/session/CompletionBanner.tsx`
```typescript
// Simple conditional banner (see section 4.8)
```

**File:** `src/components/session/Message.tsx`
```typescript
// Individual message display with typing animation (see section 4.6)
// Import useTypingAnimation hook
```

**File:** `src/components/session/MessageList.tsx`
```typescript
// Scrollable message container (see section 4.5)
// Import useAutoScroll hook
// Map over messages and render Message components
```

**File:** `src/components/session/MessageInput.tsx`
```typescript
// Text input with validation (see section 4.7)
// Use Shadcn Textarea and Button
// Implement character counter
// Handle Enter key
```

### Step 6: Create ChatPanel Component
**File:** `src/components/session/ChatPanel.tsx`
```typescript
// Compose header, MessageList, and MessageInput (see section 4.4)
// Handle conditional rendering of LoadingSpinner
```

### Step 7: Create DualChatInterface Component
**File:** `src/components/session/DualChatInterface.tsx`
```typescript
// Wrap SessionProvider (see section 4.2)
// Render CompletionBanner conditionally
// Create CSS Grid layout
// Render two ChatPanel instances
```

### Step 8: Create Astro Page
**File:** `src/pages/session.astro`
```typescript
---
// Import service functions
// Extract session ID from query params
// Validate session ID
// Fetch session data
// Separate messages by chat type
// Handle errors with redirects
---

<Layout>
  <DualChatInterface
    initialSession={session}
    initialMainMessages={mainMessages}
    initialHelperMessages={helperMessages}
    client:load
  />
</Layout>
```

### Step 9: Add Styling
**Approach:** Use Tailwind CSS classes throughout components
**Key Styles:**
- Grid layout: `grid grid-cols-2` for 50/50 split
- Flex layout: `flex flex-col` for vertical stacking in panels
- Scroll: `overflow-y-auto` for message lists
- Positioning: `sticky top-0` for CompletionBanner
- Conditional classes: Template literals for role-based styling

### Step 10: Test User Flows
**Test Scenarios:**
1. Load session with existing messages
2. Send message in main chat, verify optimistic update
3. Receive assistant response, verify typing animation
4. Send message in helper chat independently
5. Complete scenario, verify banner and disabled inputs
6. Trigger API error, verify error display and retry
7. Refresh page, verify session restoration
8. Scroll up, send message, verify auto-scroll disabled
9. Scroll to bottom, verify auto-scroll re-enabled
10. Exceed character limit, verify validation

### Step 11: Error Handling Implementation
**Add Error Boundaries:**
- Wrap DualChatInterface in React Error Boundary
- Display fallback UI on unhandled errors

**Add Error States:**
- Network disconnection detection
- Timeout handling
- Validation error display

### Step 12: Performance Optimization
**Apply Optimizations:**
- `React.memo()` on Message component
- `useCallback()` for event handlers in MessageInput
- Debounce auto-scroll triggers if performance issues
- Lazy load messages if history exceeds 100 messages

### Step 13: Accessibility Enhancements
**Add Basic A11y:**
- Semantic HTML (`<main>`, `<aside>`, `<section>`)
- ARIA labels for send buttons
- Focus management (input auto-focus after send)
- Keyboard navigation testing

### Step 14: Integration Testing
**Test with Real Backend:**
- Connect to actual API endpoints
- Verify session creation flow
- Test message sending and receiving
- Validate completion detection
- Test error scenarios (manually trigger 404, 500, etc.)

### Step 15: Documentation
**Create Component Documentation:**
- JSDoc comments on all components
- Props interface documentation
- Usage examples in comments
- README.md in session component folder

---

## Implementation Checklist

- [ ] Step 1: Type definitions created
- [ ] Step 2: Service layer functions implemented
- [ ] Step 3: Custom hooks (useTypingAnimation, useAutoScroll) working
- [ ] Step 4: SessionContext and Provider functional
- [ ] Step 5: Presentational components (Message, MessageList, MessageInput, CompletionBanner)
- [ ] Step 6: ChatPanel component integrated
- [ ] Step 7: DualChatInterface component complete
- [ ] Step 8: session.astro page routing and data fetching
- [ ] Step 9: Tailwind styling applied
- [ ] Step 10: User flow testing passed
- [ ] Step 11: Error handling comprehensive
- [ ] Step 12: Performance optimization applied
- [ ] Step 13: Accessibility basics implemented
- [ ] Step 14: Integration testing complete
- [ ] Step 15: Documentation written

---

## Notes for Implementation

**Critical Path Items:**
1. SessionProvider must initialize with server-fetched data
2. Optimistic UI updates are essential for perceived performance
3. Independent chat states prevent interference
4. Character-by-character animation must not block UI
5. Error recovery must preserve user input

**Performance Considerations:**
- Message arrays can grow to 100+ items, memoize components
- Typing animation uses requestAnimationFrame for 60fps
- Auto-scroll should not trigger on every character during animation

**Security Considerations:**
- Session ID validated server-side before any operation
- Message content sanitized before display (prevent XSS)
- No sensitive data in client-side state beyond what API returns
- Future: Add authentication checks at SessionProvider level

**Future Enhancements (Post-MVP):**
- True streaming responses (SSE) instead of complete responses
- ARIA live regions for screen reader announcements
- Mobile responsive layout (vertical stacking)
- Voice input for messages
- Message editing/deletion
- Conversation export
