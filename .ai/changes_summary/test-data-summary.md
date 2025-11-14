# Test Data Summary

The database has been successfully seeded with mock data for API testing.

## Test User

- **Email:** `test@maraum.app`
- **Password:** `test-password-12345`
- **User ID:** `00000000-0000-0000-0000-000000000001`
- **Completed scenarios:** 1
- **Current week completions:** 1

## Test Sessions

### Session 1: Completed Marketplace Scenario
- **Session ID:** `11111111-1111-1111-1111-111111111111`
- **Scenario:** Marketplace Encounter (ID: 1, 🛒)
- **Status:** Completed ✅
- **Messages:** 8 total (6 main chat, 2 helper chat)
- **Started:** 7 days ago
- **Duration:** ~15 minutes

**Sample conversation flow:**
1. Vendor greets at market stand
2. User responds in German
3. User asks helper for translation help
4. User completes purchase
5. Conversation concludes

### Session 2: Active Party Scenario
- **Session ID:** `22222222-2222-2222-2222-222222222222`
- **Scenario:** High School Party (ID: 2, 🎉)
- **Status:** In Progress 🔄
- **Messages:** 4 total (2 main chat, 2 helper chat)
- **Started:** 2 hours ago
- **Last activity:** 5 minutes ago

**Current conversation state:**
1. Someone offers drinks at a WG party
2. Helper provides context
3. User asks about Flunkyball game
4. NPC explains the drinking game

## Scenarios Available

All 3 scenarios are seeded and active:

1. **🛒 Marketplace Encounter** (ID: 1)
2. **🎉 High School Party** (ID: 2)
3. **🥙 Late Night Kebab** (ID: 3)

## API Endpoints to Test

### GET Endpoints
```bash
# List all scenarios
curl http://localhost:4321/api/scenarios

# Get specific scenario
curl http://localhost:4321/api/scenarios/1

# Get completed session with messages
curl http://localhost:4321/api/sessions/11111111-1111-1111-1111-111111111111

# Get active session with messages
curl http://localhost:3000/api/sessions/22222222-2222-2222-2222-222222222222

# Get session messages only
curl http://localhost:4321/api/sessions/11111111-1111-1111-1111-111111111111/messages
```

### POST Endpoints
```bash
# Create a new session
curl -X POST http://localhost:4321/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"scenario_id": 3}'

# Send a message to the active session (Session 2)
curl -X POST http://localhost:3000/api/sessions/22222222-2222-2222-2222-222222222222/messages \
  -H "Content-Type: application/json" \
  -d '{
    "chat_type": "main",
    "content": "Nein danke, ich schaue lieber nur zu."
  }'
```

## Database Verification

The migration reported:
- ✅ 1 test profile created
- ✅ 2 sessions created (1 completed, 1 active)
- ✅ 12 messages created
- ✅ 3 scenarios available

## Notes

- RLS is disabled for development (easier testing)
- Authentication is deferred (user_id can be NULL in current implementation)
- Message counts are automatically tracked by database triggers
- Session duration is automatically calculated on completion
- The active session (Session 2) can receive new messages via POST endpoint

## Migration File

Location: `supabase/migrations/20251114120000_seed_test_data.sql`

To reset and reapply all migrations (including test data):
```bash
supabase db reset
```

