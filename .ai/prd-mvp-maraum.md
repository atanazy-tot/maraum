# Product Requirements Document (PRD) - Maraum MVP

## 1. Product Overview

### 1.1 Product Name
**Maraum** (魔raum)

**Pronunciation:** mah-rowm  
**Etymology:** 魔 (Ma, Japanese: "bewitching/magic") + Raum (German: "space")  
**Conceptual Meaning:** The bewitching-space where language becomes strange, alien, and transformative

### 1.2 Branding Architecture: The Duality of Ma

**Core Concept:**
Maraum embodies a linguistic and philosophical duality inspired by Eastern concepts of liminality and transformation. The brand architecture revolves around two Japanese homophone characters that sound identical but represent opposite essences:

**魔 (Ma) - The Bewitching Space (Left Chat)**
- **Meaning:** Magic, demon, bewitching, chaos
- **Represents:** The alien German-language world
- **Character:** Dense, disorienting, strange, otherworldly
- **User Experience:** Where users are under the spell of a foreign language
- **Visual Identity:** Associated with the main scenario chat where German conversation unfolds
- **Emotional Tone:** Challenging, mysterious, immersive, slightly unsettling

**間 (Ma) - The Empty Interval (Right Chat)**  
- **Meaning:** Interval, space-between, pause, gap, negative space
- **Represents:** The liminal space between user and German world
- **Character:** Empty yet full of potential, the breathing room, internal voice
- **User Experience:** The helper as existential companion in the void
- **Visual Identity:** Associated with the helper chat where guidance emerges
- **Emotional Tone:** Sarcastic, philosophical, observational, detached yet present

**The Paradox:**
Both characters share the same pronunciation (Ma) but embody opposite natures—one is dense and alien, the other is empty and intermediary. This homophone creates a beautiful tension: users navigate between the bewitching German world (魔) and the empty space of understanding (間), with both being essential to the learning journey.

**Brand Philosophy:**
- **Gamification Over Clarity:** Enigmatic branding that rewards discovery
- **Immersion Over Education:** Experience-first, not curriculum-first
- **Eastern Philosophy Meets Western Language:** Bridging cultural approaches to learning
- **The Space Between:** Learning happens not in either world, but in the liminal space
- **Disco Elysium Influence:** Internal voices, skill checks, personality-driven mechanics

**Visual Branding Elements:**
- **Primary Typography:** 魔 and 間 as visual anchors in UI
- **Color Palette:** TBD (should evoke liminal spaces, twilight, in-between states)
- **Iconography:** Minimal, focusing on the kanji characters themselves
- **Tone of Voice:** Existential, sardonic, philosophical, occasionally misleading
- **User-Facing Text:** Enigmatic, avoids explaining mechanics explicitly

**User Journey Through The Lens of Ma:**
1. Users enter Maraum (the app) containing both spaces
2. They engage with 魔 (the alien German world) in the left chat
3. They retreat to 間 (the empty helper space) in the right chat when overwhelmed
4. Learning occurs in the oscillation between these two states
5. Mastery means becoming comfortable in 魔, needing 間 less frequently
6. But 間 is always there—the pause, the breath, the space to think

### 1.3 Product Vision
Transform German language learning from anxious drilling into engaging interactive fiction by combining scenario-based roleplay with a sarcastic AI companion. The platform creates emotional investment that drives practice volume—the true key to language acquisition.

### 1.4 Target Users
Intermediate German learners at B1-B2 level who:
- Understand basic German grammar and vocabulary
- Freeze or experience anxiety during real conversations
- Need low-stakes practice volume without human judgment pressure
- Prefer engaging, game-like experiences over traditional educational drills

### 1.5 Product Description
An AI-powered German language learning platform featuring a revolutionary dual-chat interface:

- Left Chat - 魔 (Ma, "The Bewitching Space"): Users navigate immersive text-based scenarios entirely in German. LLM-powered NPCs respond naturally with flexible branching narrative paths.
- Right Chat - 間 (Ma, "The Interval"): A sardonic AI companion provides real-time vocabulary support, grammar tips, and conversation suggestions in English—with an irreverent personality that occasionally misleads or mocks, creating playful dynamics that reduce learning anxiety.

### 1.6 Technical Architecture

Frontend:
- Framework: Astro with SSR mode using Node adapter
- Language: TypeScript
- Styling: TailwindCSS
- Browser Support: Modern evergreen browsers only (Chrome/Edge/Firefox/Safari last 2 versions)

Backend:
- Authentication & Storage: Supabase (httpOnly cookies for session management)
- Hosting: Self-hosted on micr.us server VM
- Process Management: PM2
- Reverse Proxy: Nginx

LLM Integration:
- Model: Claude-4.5-haiku for both scenario and helper chats
- API: Anthropic Streaming API with Server-Sent Events (SSE)
- Text Display: Character-by-character streaming appearance
- Timeouts: 30s for scenario chat, 20s for helper chat
- Retry Logic: 3 retries with exponential backoff on failure
- Token Limits: 2000 tokens (scenario), 1000 tokens (helper)
- Temperature: 0.9 (scenario), 0.7 (helper)

### 1.7 MVP Scope

Included Features:
- Three pre-written scenarios with flexible LLM-driven branching
- Dual-chat interface with persistent helper personality
- User authentication and profile management
- Conversation history with full replay capability
- Automatic scenario conclusion detection
- Session persistence and restoration
- Weekly rate limiting (3 completed scenarios per week)

Out of Scope for MVP:
- Multi-language support (German only)
- Post-scenario vocabulary summaries
- Progress tracking/analytics dashboard
- Custom scenario generation
- Mobile-optimized UI
- Social features or user-to-user interaction
- Traditional gamification elements (points, badges, leaderboards)
- Helper intervention system (future feature)

### 1.8 Competitive Positioning
Unlike Duolingo's gamified drills or Tandem's social anxiety-inducing human interactions, this platform provides emotionally safe conversation practice with a distinctive personality. The helper isn't just a tool—it's a relationship that makes practice feel like cooperative gaming rather than homework.

### 1.9 Gamification Through Immersion

**Core Philosophy:**
Maraum rejects traditional gamification (points, badges, leaderboards) in favor of **immersive gamification**—where the game-like qualities emerge from narrative engagement, character relationships, and psychological investment rather than extrinsic rewards.

**Immersive Gamification Mechanics:**

**1. Commitment Through Constraint**
- **Single Active Session Rule:** Users cannot scenario-hop, creating psychological investment
- **No Abandon Button:** Forces engagement similar to Disco Elysium's dialogue checks
- **7-Day Persistence:** Sessions follow you across sessions, like unfinished quests
- **Effect:** Transforms casual practice into meaningful commitment

**2. Relationship with 間 (Ma)**
- **Dynamic Personality:** Helper's tone shifts based on user behavior (supportive → sarcastic based on over-reliance)
- **Consistent Character:** Helper maintains personality across all interactions
- **Effect:** Creates para-social relationship where users care about 間's opinion

**3. The Liminal Experience**
- **Dual Consciousness:** Users must navigate between 魔 (alien German) and 間 (familiar reflection)
- **No Hand-Holding:** Enigmatic UI that rewards discovery rather than tutorials
- **Earned Understanding:** Mechanics revealed through experience
- **Effect:** Exploration and mastery feel like personal discovery, not curriculum completion

**4. Narrative Investment Over Progress Tracking**
- **Scenarios as Experiences:** Each conversation is a self-contained story, not a lesson
- **Branching Paths:** LLM flexibility means no two playthroughs identical
- **Natural Conclusions:** Stories end when narratively appropriate, not when learning objectives met
- **History as Memory:** Completed scenarios viewed as experiences lived, not tasks completed
- **Effect:** Users remember scenarios as stories, not exercises

**5. Existential Framing**
- **Philosophical Tone:** Learning positioned as existential exploration, not self-improvement
- **Sardonic Commentary:** 間 questions the premise of language learning itself
- **No Success/Failure:** Only completion, removing performance anxiety
- **Weekly Limits:** Framed as "you've exhausted your conversational allowance" (philosophical) not "you've run out of free lessons" (commercial)
- **Effect:** Reduces ego investment while increasing genuine curiosity

**6. Disco Elysium Parallels**
- **Internal Voices:** 間 functions like Inland Empire or Rhetoric—a skill that talks back
- **Skill Checks:** Navigating German conversation feels like passing speech checks
- **Personality-Driven:** System itself has character and opinions
- **No Mini-Map:** Enigmatic design that trusts player intelligence
- **Thought Cabinet:** Conversation history as memories collected
- **Effect:** Feels like playing a narrative RPG, not using an educational tool

**What Maraum Does NOT Do:**
- No experience points or levels
- No streak counters or daily goals
- No achievement unlocks or completion percentages
- No leaderboards or social comparison
- No "You're 89% fluent!" fake metrics
- No push notifications or engagement dark patterns

**What Creates Engagement Instead:**
- Curiosity about what 間 will say next
- Investment in completing the narrative
- Pride in navigating 魔 without relying on 間
- Desire to revisit scenarios for different outcomes
- The liminal space itself becomes comfortable, habitable

### 1.10 Immersive Experience Design

**Design Principles:**

**1. Opacity as Feature**
- **Minimal Landing Page:** No feature list, no explanations
- **No Onboarding:** Users figure out dual-chat through use
- **Rationale:** Discovery creates investment; tutorials create distance

**2. Consistent World-Building**
- **魔/間 Visual Language:** Kanji characters anchor every UI element
- **Personality Consistency:** 間 never breaks character, even in error messages
- **Rate Limits as Narrative:** "You've talked enough" not "Daily limit reached"
- **Rationale:** Every touchpoint reinforces the liminal space metaphor

**3. Minimal Friction, Maximum Presence**
- **Auto-Save Everything:** Users never think about data loss
- **Session Restoration:** Refresh feels seamless, not disruptive
- **Character-by-Character Streaming:** Creates presence of NPCs "typing"
- **No Loading Screens:** Spinners yes, progress bars no
- **Rationale:** Technical elements fade, narrative elements remain present

**4. Trust User Intelligence**
- **No Tooltips:** UI speaks for itself
- **No Progress Tracking:** Users decide if they're improving
- **No Difficulty Settings:** Scenarios are what they are
- **No "Are you sure?":** Except account deletion
- **Rationale:** Respecting intelligence creates mature relationship

**5. Emotional Architecture**
- **Anxiety Reduction:** 間 mocks but doesn't judge; no humans watching
- **Safe Failure:** German NPCs patient, no time pressure, no scores
- **Existential Comfort:** Philosophy frames mistakes as universal human condition
- **Comfortable Disorientation:** 魔 feels alien but 間 feels safe
- **Rationale:** Specific emotional state conducive to language practice

**6. The In-Between as Home**
- **Persistent 間:** Helper is always there across scenarios
- **Visual Stability:** 魔 changes (scenarios), 間 remains constant
- **Profile as Reflection:** History shows journey through liminal space
- **Rationale:** Users develop relationship with the space itself, not just content

**Immersive UI/UX Details:**

**Landing Page:**
```
魔 間
MARAUM

You want to learn German.
How quaint.

[Enter] [Create Account]
```

**In-Session Header:**
```
[魔] Marketplace        [間] 
```

**Error Messages (In 間's Voice):**
- "Connection lost. How disappointing. Your progress is safe, try again."
- "The API has abandoned us. Typical. Refresh and we'll continue."
- "You've talked enough for one week. Return Monday, if you must."

**History Display:**
```
COMPLETED SCENARIOS

🛒 Nov 3, 2024    🎉 Nov 5, 2024    🥙 Nov 7, 2024

[Click to review]
```

**Profile Page Minimalism:**
```
USER: email@example.com

2/3 scenarios this week
Resets Monday

[Conversation History]
[Logout]
[Delete Account]
```

**Mobile Adaptation:**
- Vertical stacking: 魔 on top (primary), 間 below (support)
- Full-height views, no split-screen compromise
- Tap 魔/間 headers to switch focus
- Maintains immersion despite form factor

## 2. User Problem

### 2.1 Problem Statement
Intermediate German learners possess foundational knowledge but lack conversational confidence. Traditional learning apps focus on vocabulary drills and grammar exercises, while conversation exchange platforms create social pressure that triggers performance anxiety. This gap prevents learners from achieving the practice volume necessary for fluency.

### 2.2 Current Solutions and Limitations

Duolingo/Babbel:
- Strengths: Structured curriculum, gamification
- Limitations: Repetitive drills, no real conversation practice, lacks contextual learning

Language Exchange Apps (HelloTalk, Tandem):
- Strengths: Real human interaction, authentic conversations
- Limitations: Social anxiety, scheduling difficulties, judgment pressure, unequal exchange dynamics

Traditional Tutoring:
- Strengths: Personalized feedback, structured learning
- Limitations: Expensive, time-inflexible, performance pressure, limited practice volume

### 2.3 User Pain Points
1. Conversation anxiety: Fear of making mistakes in front of humans
2. Limited practice volume: Traditional methods don't provide enough low-stakes repetition
3. Boring repetition: Drill-based apps feel like work, not engagement
4. No contextual learning: Vocabulary lists lack the narrative context that aids retention
5. Binary feedback: Either "correct" or "incorrect" without nuanced guidance
6. Rigid structures: Can't explore tangential conversations or make creative choices

### 2.4 Proposed Solution
Provide unlimited, judgment-free conversation practice through:
- Immersive narrative scenarios that create emotional investment
- An AI companion with personality that reduces anxiety through humor
- Flexible conversation paths that reward exploration
- Contextual learning embedded in storytelling
- Persistent sessions that build commitment without pressure

## 3. Functional Requirements

### 3.1 Authentication and User Management

3.1.1 User Registration
- Email and password-based registration via Supabase Auth
- No email verification required for MVP
- Automatic account creation with default settings

3.1.2 User Login
- Email and password authentication
- Session management via httpOnly cookies
- Automatic session restoration on page refresh

3.1.3 User Profile
- Display username and email
- Logout functionality
- Account deletion option with confirmation
- Conversation history section

3.1.4 Session Security
- HttpOnly cookies prevent XSS attacks
- Automatic session expiration handling
- Secure token refresh mechanism

### 3.2 Landing Page

3.2.1 Design Philosophy
- Enigmatic and minimal aesthetic
- Prioritizes gamification over commercial clarity
- References helper personality to set expectations

3.2.2 Content
- Brief, intriguing copy (example: "魔 間\nMARAUM\n\nYou want to learn German. How quaint.\nI suppose I could help you stumble through some conversations.")
- Call-to-action for signup/login
- No feature explanations or benefits lists
- No onboarding tutorials

### 3.3 Scenario Selection

3.3.1 Available Scenarios
Three pre-written scenarios with emoji identifiers:
1. Marketplace encounter (🛒) - Basic level, easy vocabulary
2. High school-like party (🎉) - Medium difficulty, flirty vocabulary, drinking games
3. Late-night kebab trip through Berlin (🥙) - Medium difficulty, casual conversation

3.3.2 Selection Interface
- Grid or list display of three scenario cards
- Each card shows: emoji icon, scenario title
- Visual indication of completed scenarios (grayed out but still selectable)
- Clear "Start Scenario" button

3.3.3 Active Session Handling
- When user has active session: black out unavailable scenarios
- Show only "Resume Scenario" button for active scenario
- No abandon or cancel option
- Display must clearly indicate commitment to current scenario

3.3.4 Rate Limiting Display
- After 3 completed scenarios in current week: display personality-consistent message
- Example: "You've talked enough for one week. Come back [date]."
- Show countdown to limit reset
- Completed scenarios counter visible

### 3.4 Dual-Chat Interface

3.4.1 Layout
- 50/50 horizontal split on desktop
- Left panel: 魔 (Ma) - Main scenario chat (German)
- Right panel: 間 (Ma) - Helper chat (English)
- Both panels independently scrollable
- Mobile: Vertical stacking (scenario on top)

3.4.2 魔 (Ma) - Main Scenario Chat (Left)
- All interactions conducted entirely in German
- User message input field at bottom
- Send button or Enter key to submit
- Character-by-character streaming for NPC responses
- Message history with timestamps
- Automatic scroll to latest message
- Loading spinner during LLM response generation

3.4.3 間 (Ma) - Helper Chat (Right)
- User queries in any language (typically English)
- Helper responses in English
- Sarcastic, philosophical personality (modern French style: decadent, nihilistic, ironic)
- Character-by-character streaming for responses
- Message history with timestamps
- Loading spinner during response generation
- Occasional misleading or mocking responses balanced with helpful information (80% helpful sarcasm, 20% existential tangents)

3.4.4 Initial Messages
- Both chats display pre-written opening messages on scenario start
- Main scenario: Sets scene and introduces NPCs in German
- Helper: Introduces itself and establishes personality in English

3.4.5 Message Display
- User messages: Right-aligned, distinct background color
- NPC/Helper messages: Left-aligned, distinct background color
- Timestamps: Subtle, below each message
- Character limit: No hard limit on user input

### 3.5 Session Management

3.5.1 Single Active Session Rule
- Database enforces unique constraint: one incomplete session per user maximum
- Cannot start new scenario until current session is completed
- Prevents scenario hopping
- Encourages commitment to finishing

3.5.2 Session Persistence
- All messages automatically saved to separate messages table after each exchange
- Messages stored individually (normalized), not as embedded JSON
- Session metadata tracks:
  - Message counts (main/helper) - updated automatically
  - Timestamps (start, last activity, completion)
  - Completion status and scenario reference
- Duration calculated at completion time based on timestamps

3.5.3 Automatic Session Restoration
- On page refresh: automatically loads active session
- Returns user to exact conversation state
- Preserves scroll position where possible
- Seamless continuation without data loss

3.5.4 Session Expiration
- Incomplete sessions auto-expire after 7 days of inactivity
- Automated cleanup process runs on scheduled basis (database function)
- Expired sessions deleted from database permanently
- User can then start fresh scenario
- No notification of expiration sent to user

3.5.5 Session Completion
- Triggered when LLM outputs completion flag
- Sets `is_completed = true` in database
- Records completion timestamp
- Calculates total duration (once, at completion time, from start to completion timestamps)
- Increments user's completed scenario count and weekly completion count
- Makes session available in history
- Allows user to start new scenario

### 3.6 Scenario Conclusion Logic

3.6.1 Natural Conclusion Detection
- LLM determines when narrative reaches natural endpoint
- Factors considered:
  - Story arc completion
  - User goals achieved or failed
  - Conversation exhaustion
  - Message count threshold approach

3.6.2 Message Count Management
- Expected range: 15-25 messages
- Soft cap: 20-25 messages (LLM begins steering toward conclusion)
- Hard cap: 30 messages (LLM forces natural conclusion)
- Count includes only main scenario messages

3.6.3 Completion Flag Format
- LLM outputs special marker in response
- Format defined in system prompts
- Parsed by backend to trigger completion
- User sees final NPC message normally

3.6.4 No Manual Conclusion
- Users cannot manually end scenarios
- No "finish" or "quit" button in session
- Only options: complete naturally or leave (7-day expiration)
- Profile page link available to exit session temporarily

### 3.7 Conversation History

3.7.1 History Display
- Located in user profile page
- Horizontal scrollable list of completed scenarios
- Each entry shows: emoji icon, completion date
- Chronologically ordered (newest first)
- Only completed scenarios appear

3.7.2 History Replay
- Click on history entry opens modal/popup
- Full side-by-side chat display (read-only)
- Shows complete conversation from both chats
- Preserves original timestamps
- Close button returns to profile

3.7.3 History Limitations
- Cannot edit or delete individual scenarios
- Cannot export conversations
- No search or filter functionality
- No statistics or analytics

### 3.8 Rate Limiting

3.8.1 Weekly Limit
- Maximum 3 completed scenarios per week per user
- Week resets on fixed day/time (e.g., Monday 00:00 UTC)
- Only completions count (starts do not)
- Tracked in user record

3.8.2 Limit Enforcement
- Check performed in application logic before scenario start (not database constraint)
- Database stores completion counts; application enforces limits
- If limit reached: display personality-consistent blocking message
- Example: "You've exhausted your conversational allowance for the week. Return [date]."
- Show scenarios grayed out with countdown timer

3.8.3 Limit Display
- Current usage visible on scenario selection page
- Example: "2/3 scenarios completed this week"
- Reset date shown
- No notifications when limit approaches

### 3.9 Error Handling

3.9.1 API Failure Handling
- Retry logic: 3 attempts with exponential backoff
- Timeout after 30s (scenario) or 20s (helper)
- On final failure: display clear error message
- Example: "Connection lost. Your progress wasn't saved."
- Return button to scenario selection
- Do not save incomplete response

3.9.2 Streaming Errors
- If stream interrupts mid-response: show partial message
- Display retry button
- Allow user to retry or return to selection
- Clear indication of incomplete state

3.9.3 Content Filtering Errors
- If LLM output triggers filtering: treat as scenario conclusion
- Log event for review
- No explicit error message to user
- Scenario marked complete normally

3.9.4 Network Errors
- Check for network connectivity
- Display offline indicator
- Prevent new message submission
- Queue messages if possible
- Notify when connection restored

3.9.5 Authentication Errors
- Session expiration: redirect to login with message
- Preserve current URL for post-login redirect
- Invalid credentials: clear, non-technical error message
- Account lockout after multiple failed attempts (security)

### 3.10 System Prompting Architecture

3.10.1 Modular Prompt Structure
- Base template for each chat type (scenario/helper)
- Scenario-specific components inject into base
- Stored as .MD files in version control (not in database)
- Referenced via environment variables or configuration
- Include 3-5 example exchanges per scenario

3.10.2 Scenario Prompt Components
- Setting description
- Character/NPC profiles
- Vocabulary guidance (B1-B2 level)
- 3-5 key decision points
- Conclusion criteria
- Completion flag format
- German language enforcement rules

3.10.3 Helper Prompt Components
- Personality definition (decadent, philosophical, nihilistic, ironic)
- Behavior guidelines (80% helpful sarcasm, 20% existential tangents)
- Context awareness instructions
- Misleading behavior boundaries

3.10.4 Configuration Management
- Environment variables for:
  - API keys
  - Model names
  - Token limits
  - Temperature values
  - Timeout durations
- Easy adjustment without code changes

### 3.11 Data Persistence

**Note:** Detailed database schema and implementation details are documented in `.ai/database-planning-summary.md`. This section provides product-level overview.

3.11.1 User Data Structure (Profiles)
- Separate profiles table following Supabase Auth best practices
- Links to Supabase Auth users via foreign key
- Stores: email, completed scenario count, current week completion count
- Week reset date stored in UTC, converted to local timezone for display
- Tracks completion counts and weekly limits

3.11.2 Session Data Structure
- Session metadata: completion status, timestamps, scenario reference
- Message counts (main/helper) tracked separately and updated automatically
- Duration calculated once at completion time
- Messages stored in separate normalized table (not embedded in session)
- Single active session per user enforced at database level

3.11.3 Message Storage
- Separate messages table for conversation history
- Each message contains: role (user/scenario/helper), chat type (main/helper), content, timestamp
- Supports incremental saves during streaming
- Approximately 100 messages expected per completed scenario
- Messages automatically deleted when parent session is deleted

3.11.4 Scenario Configuration Data
- Scenario ID
- Title
- Emoji icon
- Initial messages (main/helper) pre-written
- Active/inactive flag for future scenario management
- Prompt templates stored as .MD files in version control (not in database)

3.11.5 Database Constraints and Integrity
- Unique constraint enforces single active session per user
- Foreign keys with cascading deletion: user deletion removes all sessions and messages
- Scenario deletion restricted if active sessions exist
- Optimized indexes for common queries (session lookup, history retrieval)
- Row-level security policies ensure users access only their own data

### 3.12 Logging and Monitoring

**Note:** Structured logging system with granular event tracking. Full specification in `.ai/database-planning-summary.md`.

3.12.1 Logged Events
- Separate logs table with severity levels (error, warn, info, debug)
- Comprehensive event taxonomy covering:
  - API operations (calls, failures, retries, timeouts)
  - Authentication events (registration, login, logout, session expiration)
  - Scenario lifecycle (start, completion, abandonment)
  - Session management (creation, restoration, expiration cleanup)
  - Rate limiting (checks, exceeded limits, resets)
  - System operations (database errors, cleanup jobs)
- Logs automatically expire after 30 days (automated cleanup)

3.12.2 Privacy Constraints
- No message content logged
- Only metadata and event types stored
- User identifiers retained for correlation but can be anonymized
- Conversation text never persisted in logs
- GDPR-compliant retention policies

3.12.3 Performance Monitoring
- API response times and success rates
- Streaming latency measurements
- Page load times
- Session restoration success rates
- Database query performance
- All captured passively via operational logging

## 4. Product Boundaries

### 4.1 In Scope for MVP

Core Experience:
- Three pre-written scenarios with LLM-driven branching
- Dual-chat interface with main scenario and helper
- Helper personality (sarcastic, philosophical)
- User authentication and profile
- Conversation persistence and history
- Automatic scenario conclusion
- Weekly rate limiting

Technical Implementation:
- Astro SSR with TypeScript and TailwindCSS
- Supabase authentication and storage
- Claude-4.5-haiku streaming API integration
- Self-hosted deployment on micr.us VM
- Character-by-character text streaming
- Automatic session restoration
- Basic error handling and retry logic

### 4.2 Out of Scope for MVP

Language and Content:
- Languages other than German
- More than three scenarios
- User-generated scenarios
- Custom vocabulary lists
- Post-scenario summaries
- Pronunciation practice
- Grammar explanations

Features:
- Progress tracking dashboards
- Analytics and statistics
- Achievement system (badges, points, levels)
- Social features (friends, sharing, leaderboards)
- Spaced repetition algorithms
- Personalized learning paths
- Adaptive difficulty adjustment
- Mobile-specific optimizations
- Offline functionality
- Helper intervention system (deferred to post-MVP)

Technical:
- Multi-language infrastructure
- Advanced analytics integration
- Content management system
- Admin dashboard
- A/B testing framework
- Automated testing suite
- CI/CD pipeline beyond basic deployment
- Scalability beyond single VM
- CDN integration

Business:
- Payment processing
- Subscription management
- Marketing automation
- Customer support system
- Terms of service enforcement
- Age verification
- GDPR compliance automation

### 4.3 Future Considerations

Phase 2 Possibilities:
- Additional scenarios (5-10 more)
- Spanish, French, Italian language support
- Mobile app development
- Progress tracking and analytics
- Vocabulary review system
- Custom scenario generator
- Community-created content
- Voice interaction mode
- Helper intervention system (breaking fourth wall)

Phase 3 Possibilities:
- Advanced AI tutor features
- Personalized learning paths
- Subscription monetization
- B2C marketing infrastructure
- Multi-language expansion
- White-label licensing
- Educational institution partnerships

### 4.4 Technical Constraints

Infrastructure:
- Self-hosted VM limits concurrent users
- No auto-scaling capability
- Manual deployment and monitoring
- Single region hosting
- No redundancy or failover

Performance:
- Streaming latency dependent on API response
- Database performance limited by Supabase free tier
- No caching layer for MVP
- Rate limiting required to manage costs

Browser Support:
- Modern browsers only (last 2 versions)
- No Internet Explorer support
- No polyfills for legacy features
- JavaScript required (no graceful degradation)

Content:
- B1-B2 level only (not adaptive)
- Three scenarios with limited replayability
- Fixed narrative paths (LLM improvisation within constraints)
- No dynamic difficulty adjustment

## 5. User Stories

### 5.1 Authentication and Account Management

**US-001: User Registration**
As a new user
I want to create an account with email and password
So that I can access the platform and save my progress

Acceptance Criteria:
- Email and password input fields are clearly visible
- Password must meet minimum security requirements (8+ characters)
- Email validation prevents invalid formats
- Successful registration automatically logs user in
- User is redirected to scenario selection after registration
- Duplicate email addresses are rejected with clear error message
- Registration form shows loading state during submission

**US-002: User Login**
As a returning user
I want to log in with my email and password
So that I can continue my learning journey

Acceptance Criteria:
- Email and password input fields are clearly visible
- Login button triggers authentication
- Invalid credentials show clear error message
- Successful login redirects to appropriate page (active session or scenario selection)
- Session persists across browser tabs
- Loading state shown during authentication
- "Forgot password" link present (even if non-functional in MVP)

**US-003: Session Persistence**
As a logged-in user
I want my session to persist when I close and reopen the browser
So that I don't have to log in every time

Acceptance Criteria:
- HttpOnly cookies store session token securely
- Session remains valid for reasonable duration (7 days)
- Browser refresh doesn't require re-login
- Closing browser doesn't invalidate session
- Expired sessions redirect to login with clear message
- Session restoration completes within 2 seconds

**US-004: User Logout**
As a logged-in user
I want to log out of my account
So that I can secure my account when finished

Acceptance Criteria:
- Logout button clearly visible in profile page
- Clicking logout ends session immediately
- User redirected to landing page after logout
- Session token invalidated server-side
- Cannot access protected pages after logout
- Logout confirmation not required (instant action)

**US-005: Account Deletion**
As a user
I want to delete my account and all associated data
So that I can remove my information from the platform

Acceptance Criteria:
- Account deletion option visible in profile page
- Deletion requires confirmation dialog
- Confirmation dialog warns about permanent data loss
- User must type confirmation phrase (e.g., "DELETE")
- Deletion removes: user record, all sessions, all messages, all history (complete data removal via cascading deletion)
- Cannot be undone
- User redirected to landing page after deletion
- Deleted account email can be reused for new registration

**US-006: Profile Page Access**
As a logged-in user
I want to view my profile page
So that I can see my account information and history

Acceptance Criteria:
- Profile page link accessible from all authenticated pages
- Displays username/email
- Shows logout button
- Shows account deletion option
- Displays conversation history section
- Shows current week's completion count (X/3)
- Shows week reset date
- Loads within 2 seconds

### 5.2 Scenario Selection and Navigation

**US-007: View Available Scenarios**
As a user without active session
I want to see all available scenarios
So that I can choose which conversation to practice

Acceptance Criteria:
- Three scenario cards displayed clearly
- Each card shows: emoji icon (🛒🎉🥙), title
- Completed scenarios distinguishable but not disabled
- Visual design indicates scenario is clickable
- No loading state required (static content)
- Responsive layout works on desktop

**US-008: Start New Scenario**
As a user without active session and under weekly limit
I want to start a new scenario
So that I can begin practicing German conversation

Acceptance Criteria:
- "Start Scenario" button visible on each card
- Clicking button creates new session in database
- User redirected to dual-chat interface
- Both chats display initial pre-written messages
- Session marked as active in database
- Message count initialized to 0
- Start timestamp recorded
- Transition completes within 3 seconds

**US-009: Resume Active Session**
As a user with an active session
I want to be automatically directed to my current scenario
So that I can continue my conversation

Acceptance Criteria:
- User cannot see scenario selection page when active session exists
- Automatic redirect to dual-chat interface on login
- All previous messages loaded correctly
- Scroll position starts at bottom (latest messages)
- Message counts accurate
- Last activity timestamp updated
- Resume occurs within 3 seconds

**US-010: Resume Active Session from Selection Page**
As a user with active session who navigated to selection page
I want to see only my current scenario with resume option
So that I can return to my conversation

Acceptance Criteria:
- Other scenarios grayed out and unclickable
- Active scenario shows "Resume Scenario" button instead of "Start"
- No option to abandon or cancel scenario
- Visual indication clarifies user must complete current scenario
- Clicking resume loads active session
- Help text explains single-session rule

**US-011: Weekly Limit Enforcement**
As a user who completed 3 scenarios this week
I want to see that I've reached my limit
So that I understand when I can practice again

Acceptance Criteria:
- All scenario cards grayed out
- Personality-consistent message displayed (e.g., "You've talked enough for one week")
- Shows completion count (3/3)
- Shows reset date/countdown
- No clickable elements on scenario cards
- Message maintains helper personality voice
- Clear but playful tone

**US-012: Replay Completed Scenario**
As a user viewing scenario selection
I want to start a scenario I've already completed
So that I can practice the same conversation again

Acceptance Criteria:
- Completed scenarios remain visible and clickable
- No visual indication prevents starting completed scenario
- Starting completed scenario creates entirely new session
- Previous session data preserved in history
- New session starts fresh (no carried-over state)
- Counter increments toward weekly limit on completion

### 5.3 Main Scenario Chat Interaction

**US-013: View Main Scenario Initial Message**
As a user starting a scenario
I want to see the opening scene description in German
So that I understand the context and can begin interacting

Acceptance Criteria:
- Initial message displays immediately on scenario start
- Message entirely in German
- Sets scene clearly (location, characters, situation)
- NPC introduces itself or begins conversation
- Message styled as NPC message (left-aligned)
- Timestamp visible
- No loading state (pre-written content)

**US-014: Send Message in Main Chat**
As a user in a scenario
I want to type and send messages in German
So that I can practice conversation

Acceptance Criteria:
- Text input field visible and focused at bottom of left panel
- Input accepts any characters (including German umlauts: ä, ö, ü, ß)
- Send button triggers message submission
- Enter key also sends message (Shift+Enter for line break)
- User message appears immediately in chat
- User message right-aligned with distinct styling
- Input field clears after sending
- Timestamp recorded
- Message saved to database
- LLM API call triggered for NPC response

**US-015: Receive NPC Response**
As a user after sending a message
I want to see the NPC's response in German
So that I can continue the conversation

Acceptance Criteria:
- Loading spinner appears while waiting for response
- Response streams character-by-character (typing effect)
- NPC message left-aligned with distinct styling
- Message entirely in German regardless of user's input language
- Response relevant to user's message content
- Natural conversation flow maintained
- Timestamp recorded
- Message saved to database
- Scroll automatically to latest message

**US-016: Handle Long Conversations**
As a user progressing through a scenario
I want the conversation to naturally conclude
So that I don't get stuck in endless dialogue

Acceptance Criteria:
- Scenario accepts 15-30 messages typically
- After ~20 messages, NPC begins steering toward conclusion
- After 30 messages, NPC forces natural ending
- Conclusion feels organic (not abrupt)
- User cannot send more messages after conclusion
- Completion flag triggers automatically
- Session marked complete in database
- Success message shown briefly
- User redirected to scenario selection

**US-017: German Language Enforcement**
As a user attempting to use English in main chat
I want the NPC to continue in German only
So that I'm encouraged to practice German

Acceptance Criteria:
- NPC responds in German even if user writes in English
- NPC may acknowledge language switch within German response
- Example: "Bitte sprich Deutsch" (Please speak German)
- No error messages or explicit rejections
- Maintains conversational tone
- Encourages user to try again in German
- Does not break immersion

**US-018: Main Chat Scroll Behavior**
As a user viewing a long conversation
I want the chat to auto-scroll to new messages
So that I don't miss responses

Acceptance Criteria:
- New messages automatically scroll into view
- User can manually scroll up to read history
- Auto-scroll disabled when user scrolls up manually
- Auto-scroll re-enabled when user scrolls to bottom
- Smooth scrolling animation
- Works during character-by-character streaming
- Touch-friendly on mobile

**US-019: Main Chat Error Recovery**
As a user when API fails
I want to understand what happened and retry
So that I don't lose my progress

Acceptance Criteria:
- After 3 failed retry attempts, clear error message shown
- Error message: "Connection lost. Your progress wasn't saved."
- Last successful message remains visible
- Retry button allows attempting last message again
- Return to selection button exits scenario
- Partial progress saved to database
- Session not marked complete
- User can resume later if desired

### 5.4 Helper Chat Interaction

**US-020: View Helper Initial Message**
As a user starting a scenario
I want to see the helper's introduction in English
So that I understand its personality and purpose

Acceptance Criteria:
- Initial message displays immediately on scenario start
- Message in English
- Establishes sarcastic, philosophical tone
- Explains helper's role briefly
- Example tone: "Ah, you're attempting German. How ambitious."
- Message styled as helper message (left-aligned in right panel)
- Timestamp visible
- Sets expectations for interaction style

**US-021: Ask Helper for Vocabulary Help**
As a user unsure of a German word
I want to ask the helper for translation
So that I can continue the conversation

Acceptance Criteria:
- Helper input field accepts any language (typically English)
- Send button triggers helper API call
- User message appears in right chat immediately
- Helper response streams character-by-character
- Helper provides vocabulary with context
- Helper maintains sarcastic personality
- Example: "The word you're fumbling for is 'Rechnung' (bill). Try not to butcher the pronunciation."
- Helpful information embedded in personality response
- Response time under 10 seconds typically

**US-022: Ask Helper for Grammar Explanation**
As a user confused about German grammar
I want to ask the helper for clarification
So that I can use correct grammar

Acceptance Criteria:
- Helper recognizes grammar questions
- Provides explanation with examples
- Maintains personality while being informative
- May mock user's confusion playfully
- Example: "Dative case. Again. Let me explain as if you're five..."
- Explanation clear enough to be useful
- Uses English for explanation, German for examples

**US-023: Ask Helper for Conversation Suggestions**
As a user unsure what to say next
I want to ask the helper for suggestions
So that I can keep the conversation going

Acceptance Criteria:
- Helper provides 1-3 conversation options in German
- Options appropriate to scenario context
- Maintains awareness of main chat history
- May suggest unexpected or humorous options
- Example: "You could say 'Ich brauche das' or just point dramatically."
- User can copy suggestions or use as inspiration
- Suggestions match B1-B2 difficulty level

**US-024: Helper Tone Variation**
As a user interacting with helper
I want the helper's tone to vary naturally
So that the experience remains engaging

Acceptance Criteria:
- Helper maintains consistent sarcastic, philosophical personality
- Tone shifts slightly based on context (more supportive for grammar, more sarcastic for repeated questions)
- Approximately 80% helpful sarcasm, 20% existential tangents
- Example tangent: "Language is just collective delusion, but here's your word anyway..."
- Still provides useful information in every response
- Doesn't prevent user from getting help
- Adds personality without frustration

**US-025: Helper Misleading Response**
As a user asking the helper for help
I want to occasionally receive misleading information
So that I learn to verify information critically

Acceptance Criteria:
- Approximately 20% of responses contain misleading elements
- Misleading information plausible but incorrect
- Personality maintains playful, not malicious, tone
- User discovers error through scenario interaction
- Example: Suggests incorrect declension with deadpan delivery
- Never harmful (no offensive vocabulary)
- Maintains educational value overall

### 5.5 Session Persistence and Restoration

**US-026: Automatic Session Saving**
As a user actively conversing
I want my progress automatically saved
So that I don't lose work if something goes wrong

Acceptance Criteria:
- Every message saved to database immediately after sending
- Session metadata updated with each interaction
- Last activity timestamp updated continuously
- Message counts incremented accurately
- No manual save button required
- Saving happens asynchronously (doesn't block UI)
- Failed save attempts retry automatically

**US-027: Page Refresh Restoration**
As a user who refreshed the browser
I want to return to my exact conversation state
So that I can continue without disruption

Acceptance Criteria:
- Page refresh loads active session automatically
- All messages from both chats restored
- Scroll position starts at bottom (latest messages)
- Message counts accurate
- No data loss
- Restoration completes within 3 seconds
- Works across browser tabs

**US-028: Browser Close/Reopen Restoration**
As a user who closed and reopened the browser
I want to resume my active session
So that I can continue when ready

Acceptance Criteria:
- Opening site redirects to active session if exists
- Session remains active until completion or 7-day expiration
- All conversation data intact
- Timestamp updated to show last activity
- Duration continues counting from previous session
- No limit on number of close/reopen cycles

**US-029: Navigation During Active Session**
As a user in an active session
I want to access my profile page
So that I can view my information without losing progress

Acceptance Criteria:
- Profile page link visible from session view
- Clicking profile page exits session temporarily
- Session remains active (not completed)
- Returning to "continue learning" redirects to active session
- No data loss when navigating away
- Last activity timestamp updated

**US-030: Session Expiration**
As a user with abandoned session older than 7 days
I want the session automatically cleaned up
So that I can start fresh scenarios

Acceptance Criteria:
- Sessions inactive for 7+ days deleted automatically
- Deletion runs on background schedule (e.g., nightly)
- User can start new scenario after expiration
- No notification of expiration sent
- Expired session does not appear in history
- User record's active session flag cleared

### 5.6 Scenario Completion and History

**US-031: Scenario Completion Detection**
As the system monitoring scenario progress
I want to detect when the scenario reaches natural conclusion
So that I can mark it complete

Acceptance Criteria:
- LLM outputs completion flag in response
- Flag format defined in system prompt
- Backend parses completion flag automatically
- Session marked `is_completed = true`
- Completion timestamp recorded
- Total duration calculated and stored
- User's completed count incremented
- Week's completion count incremented
- Message counts finalized

**US-032: Completion Confirmation**
As a user completing a scenario
I want to see acknowledgment of completion
So that I know I've finished

Acceptance Criteria:
- Brief success message displayed after final NPC message
- Example: "Scenario complete! Returning to selection..."
- Message displays for 3-5 seconds
- Automatic redirect to scenario selection
- No additional user action required
- Completed scenario now visible in history

**US-033: View Conversation History**
As a user in profile page
I want to see my completed scenarios
So that I can review my progress

Acceptance Criteria:
- History section visible in profile page
- Horizontal scrollable list of scenario cards
- Each card shows: emoji icon, completion date
- Chronologically ordered (newest first)
- Only completed scenarios appear
- Empty state if no completions: "No scenarios completed yet"
- Smooth scrolling animation

**US-034: Replay History**
As a user viewing history
I want to see the full conversation from a completed scenario
So that I can review what I practiced

Acceptance Criteria:
- Clicking history card opens modal/popup
- Modal displays dual-chat side-by-side view
- Shows complete message history from both chats
- Messages styled identically to original session
- Timestamps preserved
- Read-only (cannot edit or respond)
- Close button returns to profile
- Modal scrollable independently

**US-035: History Limitations**
As a user viewing history
I want to understand what I can and cannot do
So that my expectations are appropriate

Acceptance Criteria:
- Cannot delete individual scenarios from history
- Cannot export conversation data
- Cannot search or filter history
- Cannot share scenarios with other users
- No statistics or analytics shown
- Only visual access to read completed conversations

### 5.7 Rate Limiting and Access Control

**US-036: Weekly Limit Check**
As the system before scenario start
I want to verify user hasn't exceeded weekly limit
So that costs and usage are controlled

Acceptance Criteria:
- Check performed before creating new session
- Counts only completed scenarios in current week
- Week defined as fixed 7-day period (e.g., Monday-Sunday)
- Limit set at 3 completions per week
- Started but uncompleted scenarios don't count toward limit
- Check completes within 1 second

**US-037: Weekly Limit Display**
As a user at scenario selection
I want to see my current usage
So that I know how many scenarios remain

Acceptance Criteria:
- Completion counter visible (e.g., "2/3 scenarios this week")
- Updates immediately after completing scenario
- Shows reset date (e.g., "Resets Monday, Nov 13")
- Visual design consistent with overall aesthetic
- Clear but not intrusive

**US-038: Weekly Limit Block**
As a user who reached weekly limit
I want to be prevented from starting new scenarios
So that the limit is enforced

Acceptance Criteria:
- All scenario cards grayed out and unclickable
- Message displayed in helper personality voice
- Example: "You've exhausted your conversational allowance. Return Monday."
- Shows exact reset time/date
- No workarounds or bypasses
- Active session (if any) can still be completed
- Clear countdown to reset

**US-039: Weekly Limit Reset**
As a user after weekly reset time passes
I want my limit restored
So that I can continue practicing

Acceptance Criteria:
- Weekly completion count reset to 0 at designated time
- All scenarios become available again
- Reset happens automatically (no user action)
- Users in active sessions unaffected
- Accurate to within 1 minute of reset time
- No notification sent (user discovers on next visit)

**US-040: Authentication Required**
As a non-authenticated user
I want to be redirected to login when accessing protected pages
So that the platform enforces access control

Acceptance Criteria:
- Accessing scenario selection without login redirects to login page
- Accessing profile without login redirects to login page
- Accessing active session without login redirects to login page
- Landing page accessible without authentication
- Post-login redirect returns user to intended destination
- Clear message explains login required

### 5.8 Error Handling and Edge Cases

**US-041: API Timeout Handling**
As a user when LLM API times out
I want to see clear error messaging
So that I understand what happened

Acceptance Criteria:
- 30-second timeout for scenario chat, 20-second for helper
- After timeout, error message displayed
- Example: "Response took too long. Please try again."
- Retry button allows resending last message
- Original message preserved in history
- Session remains active
- Timeout tracked in logs

**US-042: API Retry Logic**
As the system when API call fails
I want to automatically retry
So that temporary issues don't disrupt users

Acceptance Criteria:
- 3 retry attempts before showing error
- Exponential backoff between retries (1s, 2s, 4s)
- User sees loading state during retries
- After 3 failures, display error message
- User can manually retry after error shown
- Failed attempts logged for monitoring
- Partial responses discarded (not saved)

**US-043: Network Disconnection**
As a user who loses internet connection
I want to be notified and prevented from wasting effort
So that I don't lose unsent messages

Acceptance Criteria:
- Network status monitored continuously
- Offline indicator appears when connection lost
- Input fields disabled during offline state
- Attempted sends show error: "No connection. Check your internet."
- Connection restoration detected automatically
- Normal functionality resumes when back online
- Offline state persists across components

**US-044: Session Restoration Failure**
As a user when session restoration fails
I want to recover gracefully
So that I'm not permanently stuck

Acceptance Criteria:
- Failed restoration redirects to scenario selection
- Error message: "Couldn't load session. Starting fresh."
- Original session data preserved in database
- User can attempt restoration again later
- Logs error for debugging
- Doesn't delete session (only resets UI)

**US-045: Streaming Interruption**
As a user when streaming response interrupts
I want to see partial content and retry
So that I can continue the conversation

Acceptance Criteria:
- Partial message displayed as streamed
- Clear indication message is incomplete (e.g., ellipsis)
- Retry button appears below partial message
- Retrying fetches complete response
- Partial content not saved to database
- User can read partial content while deciding to retry
- Works for both main and helper chats

**US-046: Content Filtering Trigger**
As the system when LLM output triggers content filter
I want to handle gracefully without exposing error
So that user experience remains smooth

Acceptance Criteria:
- Filtered response treated as scenario conclusion
- Scenario marked complete normally
- No error message shown to user
- Event logged for review with scenario ID
- User redirected to scenario selection
- No indication filtering occurred
- Prevents inappropriate content display

**US-047: Database Write Failure**
As the system when database write fails
I want to retry and alert if necessary
So that user data isn't silently lost

Acceptance Criteria:
- 3 automatic retry attempts for failed writes
- If all retries fail, show error: "Couldn't save progress."
- User can continue session (data in memory)
- Retry button allows manual save attempt
- Critical failures logged with full context
- Session remains active in browser
- User warned before closing browser

**US-048: Concurrent Session Attempt**
As a user trying to start second scenario with active session
I want to be prevented by UI
So that I don't violate single-session rule

Acceptance Criteria:
- Scenario selection page shows only active scenario when session exists
- Other scenarios grayed out and unclickable
- "Resume Scenario" button instead of "Start"
- Help text explains: "Complete your current scenario first"
- Direct URL access to start new scenario blocked by backend
- Error message if backend enforcement triggers
- Redirect to active session

### 5.9 Mobile and Responsive Behavior

**US-049: Mobile Layout**
As a user on mobile device
I want to access both chats effectively
So that I can practice on any device

Acceptance Criteria:
- Dual chats stack vertically on mobile
- Scenario chat appears on top
- Helper chat appears below
- Both chats independently scrollable
- Input fields fixed at bottom of respective sections
- Touch-friendly tap targets (minimum 44px)
- No horizontal scrolling required

**US-050: Mobile Text Input**
As a user typing on mobile
I want comfortable text entry
So that I can write without frustration

Acceptance Criteria:
- Keyboard doesn't obscure input field
- Input field expands as user types
- Send button accessible with keyboard open
- German keyboard suggestions available
- Special characters (ä, ö, ü, ß) easily accessible
- Autocorrect doesn't interfere aggressively
- Enter key sends message (no line breaks on mobile)

**US-051: Mobile Scroll Behavior**
As a user reading conversation on mobile
I want smooth scrolling
So that I can review messages easily

Acceptance Criteria:
- Auto-scroll to new messages works on mobile
- Manual scroll smooth and responsive
- No bounce/overscroll issues
- Pull-to-refresh disabled (prevents accidental refresh)
- Scroll position preserved during keyboard open/close
- Touch gestures feel native

### 5.10 Performance and Technical Requirements

**US-052: Initial Page Load**
As a user visiting the site
I want fast page load
So that I can start practicing quickly

Acceptance Criteria:
- Landing page loads within 2 seconds
- Scenario selection page loads within 3 seconds
- Active session restoration within 3 seconds
- Profile page loads within 2 seconds
- All measured on typical broadband connection
- Critical CSS inlined for faster first paint
- Images optimized for web

**US-053: Streaming Response Performance**
As a user waiting for LLM response
I want streaming to start quickly
So that I see progress immediately

Acceptance Criteria:
- First token appears within 2 seconds typically
- Character-by-character streaming smooth (no stutter)
- Streaming maintains 60fps scroll performance
- Loading spinner appears immediately on send
- Spinner replaced by first character smoothly
- Entire response completes within 10 seconds typically

**US-054: Database Query Performance**
As the system accessing database
I want fast queries
So that users don't experience lag

Acceptance Criteria:
- Session lookup queries complete within 500ms
- History queries complete within 1 second
- Session writes complete within 500ms
- Database indexes optimize common queries
- Connection pooling prevents timeout issues
- Queries monitored for slow performance

**US-055: Browser Compatibility**
As a user with modern browser
I want full functionality
So that all features work correctly

Acceptance Criteria:
- Chrome/Edge (last 2 versions): Full support
- Firefox (last 2 versions): Full support
- Safari (last 2 versions): Full support
- Mobile Safari (iOS 15+): Full support
- Mobile Chrome (last 2 versions): Full support
- No support for Internet Explorer
- Graceful error message for unsupported browsers

### 5.11 Security and Privacy

**US-056: Secure Authentication**
As a user creating account
I want my credentials stored securely
So that my account is protected

Acceptance Criteria:
- Passwords hashed using bcrypt or Argon2
- Minimum password length: 8 characters
- HttpOnly cookies prevent XSS attacks
- Session tokens cryptographically secure
- HTTPS enforced (HTTP redirects to HTTPS)
- No credentials logged
- Password reset capability (even if basic for MVP)

**US-057: Session Security**
As a logged-in user
I want my session protected from hijacking
So that my account remains secure

Acceptance Criteria:
- Session tokens stored in httpOnly cookies
- Cookies marked as Secure (HTTPS only)
- Cookies marked as SameSite=Strict
- Session expiration enforced server-side
- Old sessions invalidated on new login
- Logout invalidates token immediately

**US-058: Data Privacy**
As a user of the platform
I want my conversations kept private
So that my learning data isn't exposed

Acceptance Criteria:
- Conversation content not logged to files
- Only metadata logged (timestamps, counts, IDs)
- Database access restricted to application
- No message content sent to third parties (except LLM API)
- User data encrypted at rest (Supabase handles)
- User data encrypted in transit (HTTPS)

**US-059: Account Data Access**
As a user viewing profile
I want to access only my own data
So that privacy is maintained

Acceptance Criteria:
- Profile page shows only current user's data
- History shows only current user's scenarios
- Database row-level security policies filter data by authenticated user ID
- Direct URL manipulation cannot access other users' data
- Authorization checks at both application and database levels
- SQL injection prevention in queries

**US-060: GDPR Compliance Basics**
As a European user
I want basic data protection rights
So that I can control my information

Acceptance Criteria:
- Account deletion removes all user data (profile, sessions, messages) via cascading deletion
- Deletion is permanent and complete
- Users can view their own data (profile, history) via UI
- No data retention after account deletion
- Database-level access controls (row-level security) ensure data isolation
- Clear privacy policy (even if basic)
- Cookie consent not required for MVP (functional cookies only)

## 6. Success Metrics

### 6.1 Primary Metrics

6.1.1 Average Session Duration
- Target: 10-15 minutes per session
- Measurement: Duration from scenario start to completion or abandonment
- Rationale: Aligns with expected 20-25 message exchanges; indicates engagement level
- Success Threshold: 70% of sessions between 8-20 minutes

6.1.2 Scenario Completion Rate
- Target: >60% of started scenarios reach completion flag
- Measurement: (Completed sessions / Started sessions) × 100
- Rationale: High completion indicates engaging content and appropriate difficulty
- Success Threshold: >50% completion rate in first month

6.1.3 User Retention (7-Day)
- Target: >40% of users return within 7 days of signup
- Measurement: Users with activity on Day 0 and Day 1-7
- Rationale: Repeat visits indicate value perception and habit formation
- Success Threshold: >30% retention in first month

### 6.2 Secondary Metrics (Captured for Analysis)

6.2.1 Message Count Distribution
- Metric: Average messages per scenario (main chat)
- Expected: 15-25 messages
- Purpose: Validate scenario length assumptions
- Analysis: Identify scenarios that are too short/long

6.2.2 Helper Chat Usage
- Metric: Ratio of helper messages to main messages
- Expected: 0.3-0.7 (fewer helper queries indicates confidence)
- Purpose: Understand reliance patterns
- Analysis: High ratios may indicate difficulty or anxiety issues

6.2.3 Weekly Limit Impact
- Metric: Percentage of users hitting weekly limit
- Expected: 20-40% of active users
- Purpose: Understand engagement depth and limit appropriateness
- Analysis: Very low percentage suggests limit too high; very high suggests limit too restrictive

6.2.4 Session Abandonment Timing
- Metric: Distribution of abandonment points (message count when user stops)
- Expected: Most abandonments in first 5 messages or not at all
- Purpose: Identify friction points in scenarios
- Analysis: Clustering at specific points indicates content issues

### 6.3 Technical Metrics

6.3.1 API Success Rate
- Target: >95% successful responses after retries
- Measurement: (Successful API calls / Total API calls) × 100
- Rationale: System reliability directly impacts user experience
- Success Threshold: >90% in production

6.3.2 Average API Response Time
- Target: <8 seconds for complete response
- Measurement: Time from API call to completion (scenario chat)
- Rationale: Claude-4.5-haiku expected to be fast; longer times indicate issues
- Success Threshold: <10 seconds p95

6.3.3 Session Restoration Success Rate
- Target: >98% successful restorations
- Measurement: (Successful loads / Load attempts) × 100
- Rationale: Core feature must work reliably
- Success Threshold: >95% success rate

6.3.4 Streaming Latency
- Target: <2 seconds to first token
- Measurement: Time from API call to first character display
- Rationale: Perceived responsiveness critical for engagement
- Success Threshold: <3 seconds p95

6.3.5 Page Load Time
- Target: <3 seconds for scenario selection page
- Measurement: Time to interactive
- Rationale: Standard web performance expectation
- Success Threshold: <5 seconds p95

### 6.4 Qualitative Success Indicators

6.4.1 User Sentiment
- Method: Post-session optional feedback
- Target: Users describe experience as "engaging," "fun," "helpful"
- Red Flags: "Frustrating," "confusing," "boring"
- Measurement Approach: Simple 1-question survey after 3rd completion

6.4.2 Helper Personality Reception
- Method: Specific feedback on helper character
- Target: Users perceive helper as distinctive and valuable
- Red Flags: "Annoying," "unhelpful," "distracting"
- Measurement Approach: Optional comment box in profile

6.4.3 Scenario Quality
- Method: Track which scenarios have highest completion rates
- Target: All scenarios >50% completion
- Red Flags: One scenario significantly underperforming
- Measurement Approach: Compare completion rates across three scenarios

6.4.4 Return Visitor Behavior
- Method: Track multi-scenario completions
- Target: >50% of users complete multiple scenarios
- Red Flags: One-and-done users dominate
- Measurement Approach: Analyze user completion history

6.4.5 Immersion Quality Metrics
- Helper Engagement Ratio: Track helper messages per scenario. Target: declining ratio across user's first 5 scenarios (indicates growing confidence)
- Voluntary Replay Rate: % of users who replay completed scenarios without counting toward limit (indicates narrative investment)
- Session Resume Rate: % of users who return to incomplete sessions vs abandoning (indicates commitment mechanics working). Target: >70%

### 6.5 Cost Metrics

6.5.1 API Cost Per Session
- Metric: Average API costs per completed scenario
- Expected: $0.10-0.30 per session (estimate for Claude-4.5-haiku)
- Purpose: Validate business model assumptions
- Analysis: Track trends and optimize prompts if costs exceed targets

6.5.2 Monthly Active Users (MAU) Capacity
- Metric: Total users vs. budget constraints
- Expected: Support 100-500 MAU within budget
- Purpose: Understand scaling limitations
- Analysis: Plan for cost management or monetization

### 6.6 Monitoring and Reporting

6.6.1 Dashboard Requirements
- Real-time display not required for MVP
- Weekly manual reports sufficient
- Key metrics: Completion rate, retention, API success rate
- Access: Development team only

6.6.2 Data Collection
- All metrics collected passively from session data
- No additional user tracking required
- Database queries generate reports
- Privacy-compliant (no PII in metrics)

6.6.3 Success Evaluation Timeline
- Week 1: Technical metrics (API performance, errors)
- Week 2-4: Engagement metrics (completion rate, session duration)
- Month 2-3: Retention and behavior patterns
- Month 3: Decision point for iteration or pivot

### 6.7 Failure Criteria (When to Pivot)

Red Flags requiring product reassessment:
- Completion rate <30% consistently
- Retention rate <15% after optimization attempts
- API costs >$1 per session
- User feedback predominantly negative
- Technical issues affect >20% of sessions
- Helper personality consistently cited as frustrating rather than engaging

## 7. MVP Phasing and Prioritization

### 7.1 Sprint Structure

**Total Timeline:** 6 sprints (12 weeks)  
**Sprint Duration:** 2 weeks each  
**Team Size Assumption:** 1-2 developers + 1 product manager

### 7.2 Phase 0: Foundation (Sprints 1-2, Weeks 1-4)

**Goal:** User can sign up, start scenario, exchange German messages

**Priority P0 (Must Have):**
- US-001: User Registration
- US-002: User Login
- US-003: Session Persistence
- US-007: View Available Scenarios
- US-008: Start New Scenario
- US-013: View Main Scenario Initial Message
- US-014: Send Message in Main Chat
- US-015: Receive NPC Response

**Priority P1 (Should Have):**
- US-004: User Logout
- US-018: Main Chat Scroll Behavior
- US-052: Initial Page Load
- US-053: Streaming Response Performance

**Technical Deliverables:**
- Astro project scaffolding with SSR
- Supabase authentication integration
- Database schema: profiles, sessions, messages, scenarios tables with constraints
- Initial scenario seeding (3 scenarios via SQL migration)
- Claude Streaming API integration (scenario chat only)
- Basic dual-chat UI layout (scenario side functional, helper placeholder)
- Single scenario prompt template implemented (.MD file)

**Milestone Acceptance:**
- User can register and log in
- User can start marketplace scenario (🛒)
- User can exchange 5+ German messages with NPC
- NPC responds appropriately in German
- Messages persist in database
- Streaming displays character-by-character

**Out of Scope for Phase 0:**
- Helper chat functionality
- Session restoration
- Rate limiting
- Error handling beyond basic try/catch
- Profile page
- History

---

### 7.3 Phase 1: Core Experience (Sprints 3-4, Weeks 5-8)

**Goal:** Dual chat working, sessions persist, scenarios complete

**Priority P0 (Must Have):**
- US-020: View Helper Initial Message
- US-021: Ask Helper for Vocabulary Help
- US-026: Automatic Session Saving
- US-027: Page Refresh Restoration
- US-031: Scenario Completion Detection
- US-032: Completion Confirmation
- US-010: Resume Active Session from Selection Page

**Priority P1 (Should Have):**
- US-017: German Language Enforcement
- US-023: Ask Helper for Conversation Suggestions
- US-022: Ask Helper for Grammar Explanation
- US-024: Helper Tone Variation
- US-016: Handle Long Conversations
- US-009: Resume Active Session (auto-redirect)

**Priority P2 (Nice to Have):**
- US-025: Helper Misleading Response
- US-028: Browser Close/Reopen Restoration
- US-029: Navigation During Active Session

**Technical Deliverables:**
- Helper chat LLM integration with streaming
- Helper prompt template (.MD file) with personality
- Session persistence logic (save messages to normalized table)
- Session restoration on page load (load from messages table)
- Completion flag parsing
- Scenario conclusion logic (message count tracking via database)
- Remaining two scenario prompts as .MD files (🎉 party, 🥙 kebab)
- Single active session enforcement (unique database constraint)

**Milestone Acceptance:**
- Both chats fully functional
- Helper provides vocabulary/grammar help with personality
- Sessions auto-save and restore on refresh
- Scenarios conclude naturally after 15-30 messages
- User can complete all 3 scenarios
- Session resumption works from selection page

**Out of Scope for Phase 1:**
- History viewing
- Rate limiting
- Profile page beyond basic
- Advanced error handling
- Mobile optimization

---

### 7.4 Phase 2: Polish & Launch (Sprints 5-6, Weeks 9-12)

**Goal:** Intervention system, rate limiting, MVP launch-ready

**Priority P0 (Must Have):**
- US-036: Weekly Limit Check
- US-037: Weekly Limit Display
- US-038: Weekly Limit Block
- US-006: Profile Page Access
- US-033: View Conversation History
- US-034: Replay History
- US-042: API Retry Logic
- US-041: API Timeout Handling

**Priority P1 (Should Have):**
- US-005: Account Deletion
- US-011: Weekly Limit Enforcement
- US-039: Weekly Limit Reset
- US-030: Session Expiration (7-day cleanup)
- US-019: Main Chat Error Recovery
- US-043: Network Disconnection
- US-044: Session Restoration Failure
- US-045: Streaming Interruption
- US-048: Concurrent Session Attempt

**Priority P2 (Nice to Have):**
- US-012: Replay Completed Scenario
- US-035: History Limitations (documentation)
- US-046: Content Filtering Trigger
- US-047: Database Write Failure
- US-040: Authentication Required (edge case handling)

**Technical Deliverables:**
- Rate limiting logic in application layer (weekly counter, UTC storage/reset)
- Profile page with history display
- History modal with dual-chat replay (load from messages table)
- Comprehensive error handling with retry logic
- Automated cleanup for expired sessions and old logs (scheduled database functions)
- Structured logging system with severity levels
- Loading states and error messages in helper voice
- Browser compatibility testing
- Performance optimization
- Security hardening (HTTPS, cookie settings, row-level security)

**Milestone Acceptance:**
- Weekly limit enforced correctly
- History viewable and replayable
- Error states handled gracefully
- All 60 P0/P1 user stories completed
- System stable under normal load
- Security checklist passed
- Performance targets met (Section 6.3)

**Launch Criteria:**
- All P0 user stories tested and working
- API success rate >90%
- Session restoration success rate >95%
- Zero critical security vulnerabilities
- Privacy policy published
- Basic monitoring in place

---

### 7.5 Post-MVP / Phase 3 (Future)

**Deferred to Post-Launch:**
- US-049, US-050, US-051: Mobile optimization
- US-056-060: Advanced security features
- Helper intervention system (breaking fourth wall)
- Additional scenarios beyond 3
- Analytics dashboard
- Progress tracking
- Vocabulary summaries
- Custom scenario creation
- Multi-language support
- Voice interaction

**Prioritization Rationale:**
- Mobile optimization deferred because dual-chat is desktop-first design; vertical stacking adequate for MVP validation
- Advanced security features deferred beyond basic auth/HTTPS because limited user base at launch
- Intervention system deferred because adds complexity to prompt engineering and testing; helper personality alone sufficient for MVP differentiation
- Analytics/tracking deferred because manual weekly reports sufficient for initial product-market fit validation

---

### 7.6 Definition of Done (DoD)

**For each user story to be considered "complete":**

1. **Functional:** Acceptance criteria met and manually tested
2. **Code Quality:** TypeScript with no linter errors, reasonable test coverage on critical paths
3. **Performance:** Meets targets in US-052-054 where applicable
4. **Security:** No new vulnerabilities introduced, authentication checks in place
5. **UX:** Loading states, error messages, responsive behavior implemented
6. **Documentation:** Code comments for complex logic, README updated if needed
7. **Data:** Database migrations tested, rollback plan exists
8. **Reviewed:** Code reviewed by at least one other team member
9. **Deployed:** Changes deployed to staging environment and smoke tested
10. **Product Sign-off:** PM validates against acceptance criteria

---

### 7.7 Risk Mitigation by Phase

**Phase 0 Risks:**
- Claude API reliability unknown → Mitigation: Test with multiple prompts early, implement retry logic immediately
- Streaming implementation complexity → Mitigation: Use Anthropic SDK examples, allocate extra buffer time
- Database schema changes → Mitigation: Keep schema simple initially, plan for migrations

**Phase 1 Risks:**
- Helper personality not engaging → Mitigation: Test with 5-10 target users, iterate prompt quickly
- Session restoration bugs → Mitigation: Comprehensive state testing, clear error messages
- Scenario quality varies → Mitigation: Playtest each scenario 3+ times, adjust prompts

**Phase 2 Risks:**
- Rate limiting edge cases → Mitigation: Document timezone handling explicitly, test boundary conditions
- History modal performance → Mitigation: Limit history display to 20 most recent, paginate if needed
- Launch deadline pressure → Mitigation: P2 user stories clearly marked as optional, can be cut

---

### 7.8 Success Criteria by Phase

**Phase 0 Success:**
- One developer can complete a full scenario end-to-end
- Zero blocking bugs in core flow
- API response time <10s p95

**Phase 1 Success:**
- Helper personality receives positive feedback from 3/5 testers
- Scenario completion rate >40% in internal testing
- Session restoration works 100% of time in testing

**Phase 2 Success:**
- All primary metrics (6.1) measurable
- System handles 10 concurrent users without issues
- Launch checklist 100% complete

**MVP Success (3 months post-launch):**
- 100+ registered users
- Completion rate >50%
- Retention >30%
- API costs <$0.30/session
- Zero critical bugs reported

---

End of Product Requirements Document
