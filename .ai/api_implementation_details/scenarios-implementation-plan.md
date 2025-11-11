# API Endpoint Implementation Plan: Scenario Endpoints

## 1. Endpoint Overview

The Scenario endpoints provide read-only access to the pre-configured conversation scenarios available in the application. These endpoints enable clients to:
- Retrieve a list of all active scenarios for scenario selection UI
- Fetch detailed information about a specific scenario

Both endpoints are publicly accessible (no authentication required for MVP) and return only active scenarios. The list endpoint includes initial messages for both chat panels to enable immediate session initialization upon scenario selection.

**Endpoints:**
1. `GET /api/scenarios` - List all active scenarios
2. `GET /api/scenarios/:scenarioId` - Get single scenario details

## 2. Request Details

### 2.1 List Available Scenarios

- **HTTP Method:** GET
- **URL Structure:** `/api/scenarios`
- **URL Pattern (Astro):** `src/pages/api/scenarios/index.ts`
- **Parameters:**
  - Required: None
  - Optional: None
- **Request Body:** None (GET request)
- **Request Headers:** None required

### 2.2 Get Single Scenario

- **HTTP Method:** GET
- **URL Structure:** `/api/scenarios/:scenarioId`
- **URL Pattern (Astro):** `src/pages/api/scenarios/[scenarioId].ts`
- **Parameters:**
  - Required:
    - `scenarioId` (path parameter, integer) - The unique identifier of the scenario
  - Optional: None
- **Request Body:** None (GET request)
- **Request Headers:** None required

## 3. Used Types

### DTOs (from `src/types.ts`)

**For List Endpoint:**
```typescript
ScenarioListItemDTO = Pick<
  Tables<"scenarios">,
  | "id"
  | "title"
  | "emoji"
  | "sort_order"
  | "is_active"
  | "initial_message_main"
  | "initial_message_helper"
>

ScenariosListResponseDTO = {
  scenarios: ScenarioListItemDTO[]
}
```

**For Detail Endpoint:**
```typescript
ScenarioDetailDTO = Tables<"scenarios">
```

**For Error Responses:**
```typescript
ApiErrorDTO = {
  error: string;
  message: string;
  details?: Record<string, any>;
}
```

### Database Types

From `src/db/database.types.ts`:
- `Tables<"scenarios">` - Full scenario table type

### Command Models

None required (read-only endpoints)

## 4. Response Details

### 4.1 List Available Scenarios

**Success Response (200 OK):**
```json
{
  "scenarios": [
    {
      "id": 1,
      "title": "Marketplace Encounter",
      "emoji": "🛒",
      "sort_order": 1,
      "is_active": true,
      "initial_message_main": "Du stehst auf einem belebten Wochenmarkt...",
      "initial_message_helper": "Ah, you're attempting German. How ambitious..."
    }
  ]
}
```

**Content-Type:** `application/json`

**Status Codes:**
- `200 OK` - Scenarios retrieved successfully
- `500 Internal Server Error` - Database connection failure or query error

### 4.2 Get Single Scenario

**Success Response (200 OK):**
```json
{
  "id": 1,
  "title": "Marketplace Encounter",
  "emoji": "🛒",
  "sort_order": 1,
  "is_active": true,
  "initial_message_main": "Du stehst auf einem belebten Wochenmarkt...",
  "initial_message_helper": "Ah, you're attempting German. How ambitious...",
  "created_at": "2024-10-01T00:00:00Z",
  "updated_at": "2024-10-01T00:00:00Z"
}
```

**Content-Type:** `application/json`

**Status Codes:**
- `200 OK` - Scenario retrieved successfully
- `400 Bad Request` - Invalid scenarioId format (not a positive integer)
- `404 Not Found` - Scenario doesn't exist or is not active
- `500 Internal Server Error` - Database error

## 5. Data Flow

### 5.1 List Available Scenarios Flow

```
Client Request
    ↓
GET /api/scenarios handler
    ↓
Extract Supabase client from context.locals
    ↓
Call ScenariosService.getActiveScenarios(supabase)
    ↓
Query: SELECT id, title, emoji, sort_order, is_active,
              initial_message_main, initial_message_helper
       FROM scenarios
       WHERE is_active = true
       ORDER BY sort_order ASC
    ↓
Transform database rows to ScenarioListItemDTO[]
    ↓
Return ScenariosListResponseDTO
    ↓
Response to Client (200 OK)
```

**Database Query Details:**
- Table: `scenarios`
- Filter: `is_active = true`
- Order: `sort_order ASC`
- Index Used: `idx_scenarios_scenario` (on `scenario_id, is_completed`)
- Expected Rows: 3 (for MVP)

### 5.2 Get Single Scenario Flow

```
Client Request
    ↓
GET /api/scenarios/:scenarioId handler
    ↓
Extract and validate scenarioId from path params
    ↓
[Invalid ID] → Return 400 Bad Request
    ↓
Extract Supabase client from context.locals
    ↓
Call ScenariosService.getScenarioById(supabase, scenarioId)
    ↓
Query: SELECT *
       FROM scenarios
       WHERE id = :scenarioId
       AND is_active = true
       LIMIT 1
    ↓
[Not Found] → Return 404 Not Found
    ↓
Transform database row to ScenarioDetailDTO
    ↓
Return ScenarioDetailDTO
    ↓
Response to Client (200 OK)
```

**Database Query Details:**
- Table: `scenarios`
- Filter: `id = :scenarioId AND is_active = true`
- Limit: 1
- Index Used: Primary key on `id`
- Expected Rows: 0 or 1

## 6. Security Considerations

### 6.1 Authentication & Authorization

**Current State (MVP):**
- No authentication required (public endpoints)
- All active scenarios are publicly accessible
- No user context needed

**Future Considerations:**
- May require authentication when personalization features are added
- May need to check user subscription level for premium scenarios

### 6.2 Input Validation

**List Endpoint:**
- No user input to validate

**Detail Endpoint:**
- Validate `scenarioId` is a positive integer
- Reject negative numbers, zero, decimals, non-numeric values
- Use Zod schema for validation

### 6.3 SQL Injection Prevention

- Use Supabase client parameterized queries (built-in protection)
- Never concatenate user input into SQL strings
- Supabase SDK handles escaping automatically

### 6.4 Information Disclosure

- Only return scenarios where `is_active = true`
- Never expose inactive/draft scenarios to public
- Timestamps in detail endpoint are acceptable for public data

### 6.5 Rate Limiting

- Not implemented in MVP
- Consider implementing in future for DoS protection
- Astro middleware could add rate limiting logic

## 7. Error Handling

### 7.1 List Endpoint Error Scenarios

| Error Type | Status Code | Error Code | Message | Details |
|------------|-------------|------------|---------|---------|
| Database connection failure | 500 | `database_error` | "Unable to retrieve scenarios. Please try again later." | Database error details (server logs only) |
| Database query error | 500 | `database_error` | "Unable to retrieve scenarios. Please try again later." | Query error details (server logs only) |

### 7.2 Detail Endpoint Error Scenarios

| Error Type | Status Code | Error Code | Message | Details |
|------------|-------------|------------|---------|---------|
| Invalid scenarioId format | 400 | `validation_error` | "Invalid scenario ID. Please provide a valid positive integer." | `{ field: "scenarioId", provided: <value> }` |
| Scenario not found | 404 | `not_found` | "That scenario doesn't exist or isn't available. Perhaps it wandered off to find better opportunities?" | `{ scenarioId: <id> }` |
| Database error | 500 | `database_error` | "Unable to retrieve scenario. Please try again later." | Database error details (server logs only) |

### 7.3 Error Response Format

All errors follow the `ApiErrorDTO` structure:

```typescript
{
  error: string;      // Machine-readable error code
  message: string;    // Human-readable message (helper's voice)
  details?: Record<string, any>;  // Additional context (optional)
}
```

### 7.4 Error Logging Strategy

**What to Log:**
- All 500 errors (database errors)
- All 404 errors (with scenarioId context)
- All validation errors (with provided input)

**Log Format:**
```typescript
{
  timestamp: ISO8601,
  level: "error" | "warn",
  endpoint: "/api/scenarios" | "/api/scenarios/:scenarioId",
  error_code: string,
  message: string,
  details: {
    scenarioId?: number,
    error?: Error,
    stack?: string
  }
}
```

**Where to Log:**
- Console (development)
- Structured logging service (production - to be determined)
- Not logged to database `logs` table (system events only)

## 8. Performance Considerations

### 8.1 Database Query Optimization

**List Endpoint:**
- Query is highly optimized (only 3 rows for MVP)
- Filtered by `is_active = true` (indexed)
- Sorted by `sort_order` (minimal overhead)
- No JOINs required
- Expected query time: < 5ms

**Detail Endpoint:**
- Primary key lookup (fastest possible query)
- Additional filter on `is_active` (still very fast)
- Expected query time: < 2ms

### 8.2 Caching Strategy

**Current (MVP):**
- No caching implemented
- Not necessary given minimal data (3 scenarios)

**Future Optimization:**
- Consider in-memory caching for scenario list
- Cache invalidation on scenario updates
- CDN caching with appropriate headers

### 8.3 Response Size

**List Endpoint:**
- ~1-2 KB per scenario (including German/English messages)
- Total response: ~3-6 KB for 3 scenarios
- Minimal payload, no optimization needed

**Detail Endpoint:**
- ~1-2 KB per scenario
- Single scenario response
- No optimization needed

### 8.4 Potential Bottlenecks

- **Database Connection Pool:** Supabase handles connection pooling
- **Network Latency:** Mitigated by Supabase's CDN infrastructure
- **Serialization:** JSON serialization is fast for small payloads

## 9. Implementation Steps

### Step 1: Create Scenarios Service

**File:** `src/lib/services/scenarios.service.ts`

**Purpose:** Encapsulate all scenario-related business logic and database queries

**Methods:**
1. `getActiveScenarios(supabase: SupabaseClient): Promise<ScenarioListItemDTO[]>`
   - Query scenarios table for active scenarios
   - Order by sort_order
   - Select only fields needed for ScenarioListItemDTO
   - Handle database errors
   - Return typed DTO array

2. `getScenarioById(supabase: SupabaseClient, id: number): Promise<ScenarioDetailDTO | null>`
   - Query scenarios table by id
   - Filter by is_active = true
   - Return full scenario data
   - Return null if not found
   - Handle database errors

**Error Handling:**
- Throw custom errors with context
- Let endpoint handlers transform to ApiErrorDTO
- Include error codes for consistent handling

**Implementation Notes:**
- Use Supabase's `.select()` method for type-safe queries
- Use `.eq()` for equality filters
- Use `.order()` for sorting
- Use `.single()` for single record retrieval
- Handle Supabase error responses appropriately

### Step 2: Create Validation Schemas

**File:** `src/lib/validation/scenarios.validation.ts`

**Purpose:** Zod schemas for input validation

**Schemas:**
1. `scenarioIdSchema`
   - Validates positive integer
   - Coerces string to number if needed
   - Custom error messages

```typescript
import { z } from 'zod';

export const scenarioIdSchema = z.coerce.number().int().positive({
  message: "Scenario ID must be a positive integer"
});
```

**Usage:**
- Use in detail endpoint to validate path parameter
- Provide clear validation error messages

### Step 3: Implement List Endpoint

**File:** `src/pages/api/scenarios/index.ts`

**Implementation:**
```typescript
import type { APIRoute } from 'astro';
import { getActiveScenarios } from '@/lib/services/scenarios.service';
import type { ScenariosListResponseDTO, ApiErrorDTO } from '@/types';

export const prerender = false;

export const GET: APIRoute = async (context) => {
  try {
    // Extract Supabase client from context.locals
    const supabase = context.locals.supabase;
    
    // Call service to get active scenarios
    const scenarios = await getActiveScenarios(supabase);
    
    // Return response
    const response: ScenariosListResponseDTO = { scenarios };
    
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    // Log error
    console.error('Error fetching scenarios:', error);
    
    // Return error response
    const errorResponse: ApiErrorDTO = {
      error: 'database_error',
      message: 'Unable to retrieve scenarios. Please try again later.'
    };
    
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
```

**Key Points:**
- Use `export const prerender = false` for API routes
- Access Supabase from `context.locals.supabase`
- Use uppercase `GET` for handler
- Handle errors with try-catch
- Return properly formatted Response objects
- Use correct status codes and headers

### Step 4: Implement Detail Endpoint

**File:** `src/pages/api/scenarios/[scenarioId].ts`

**Implementation:**
```typescript
import type { APIRoute } from 'astro';
import { getScenarioById } from '@/lib/services/scenarios.service';
import { scenarioIdSchema } from '@/lib/validation/scenarios.validation';
import type { ScenarioDetailDTO, ApiErrorDTO } from '@/types';

export const prerender = false;

export const GET: APIRoute = async (context) => {
  try {
    // Extract and validate scenarioId
    const scenarioIdParam = context.params.scenarioId;
    
    const validationResult = scenarioIdSchema.safeParse(scenarioIdParam);
    
    if (!validationResult.success) {
      const errorResponse: ApiErrorDTO = {
        error: 'validation_error',
        message: 'Invalid scenario ID. Please provide a valid positive integer.',
        details: {
          field: 'scenarioId',
          provided: scenarioIdParam
        }
      };
      
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const scenarioId = validationResult.data;
    
    // Extract Supabase client from context.locals
    const supabase = context.locals.supabase;
    
    // Call service to get scenario
    const scenario = await getScenarioById(supabase, scenarioId);
    
    // Handle not found
    if (!scenario) {
      const errorResponse: ApiErrorDTO = {
        error: 'not_found',
        message: "That scenario doesn't exist or isn't available. Perhaps it wandered off to find better opportunities?",
        details: { scenarioId }
      };
      
      return new Response(JSON.stringify(errorResponse), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Return response
    return new Response(JSON.stringify(scenario), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    // Log error
    console.error('Error fetching scenario:', error);
    
    // Return error response
    const errorResponse: ApiErrorDTO = {
      error: 'database_error',
      message: 'Unable to retrieve scenario. Please try again later.'
    };
    
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
```

**Key Points:**
- Extract scenarioId from `context.params`
- Validate using Zod schema with `.safeParse()`
- Handle validation errors with 400 status
- Handle not found with 404 status
- Handle database errors with 500 status
- Use helper's voice for error messages

### Step 5: Add Error Logging

**Considerations:**
- Determine logging strategy (console vs. service)
- Add structured logging for all error scenarios
- Include relevant context in logs
- Don't log sensitive information
- Consider log aggregation service for production

**Implementation:**
- Start with console.error for development
- Add structured logging utility in `src/lib/utils/logger.ts`
- Use consistent log format across all endpoints

### Step 6: Write Tests

**Test Files:**
1. `src/lib/services/scenarios.service.test.ts` - Service unit tests
2. `src/pages/api/scenarios/index.test.ts` - List endpoint integration tests
3. `src/pages/api/scenarios/[scenarioId].test.ts` - Detail endpoint integration tests

**Test Cases for List Endpoint:**
- Returns all active scenarios
- Returns scenarios in sort_order
- Returns empty array if no active scenarios
- Returns 500 on database error
- Includes all required DTO fields

**Test Cases for Detail Endpoint:**
- Returns scenario by valid ID
- Returns 400 for invalid ID format (negative, zero, string, decimal)
- Returns 404 for non-existent scenario ID
- Returns 404 for inactive scenario
- Returns 500 on database error
- Includes all required DTO fields including timestamps

**Testing Tools:**
- Vitest for unit/integration tests
- Supabase test client or mocking
- Test fixtures for scenario data

### Step 7: Manual Testing

**List Endpoint:**
```bash
curl http://localhost:4321/api/scenarios
```

Expected: 200 response with 3 scenarios

**Detail Endpoint:**
```bash
# Valid scenario
curl http://localhost:4321/api/scenarios/1

# Invalid ID format
curl http://localhost:4321/api/scenarios/abc
curl http://localhost:4321/api/scenarios/-1
curl http://localhost:4321/api/scenarios/0

# Non-existent scenario
curl http://localhost:4321/api/scenarios/999
```

**Verification Checklist:**
- [ ] List returns all active scenarios
- [ ] List orders by sort_order
- [ ] Detail returns correct scenario
- [ ] Validation errors return 400
- [ ] Not found returns 404
- [ ] Database errors return 500
- [ ] All responses include correct Content-Type header
- [ ] Error responses follow ApiErrorDTO format
- [ ] Error messages use helper's voice

### Step 8: Update API Documentation

**Files to Update:**
- Update `.ai/api-plan.md` if implementation differs from plan
- Add examples of actual responses
- Document any additional error cases discovered
- Update type definitions in `src/types.ts` if needed

### Step 9: Code Review Checklist

**Before requesting review, verify:**
- [ ] Follows Astro guidelines (uppercase GET, prerender false)
- [ ] Follows backend guidelines (use context.locals.supabase)
- [ ] Follows coding practices (early returns, guard clauses, error handling)
- [ ] Uses correct DTO types from `src/types.ts`
- [ ] Validates all user input with Zod
- [ ] Returns correct HTTP status codes
- [ ] Includes proper error handling and logging
- [ ] Code is properly typed (no `any` types)
- [ ] Follows project structure conventions
- [ ] Passes all linter checks
- [ ] Includes appropriate comments for complex logic
- [ ] Service logic is extracted from endpoint handlers
- [ ] No business logic in endpoint files

### Step 10: Deployment Considerations

**Environment Variables:**
- None required (uses Supabase from context)

**Database Migrations:**
- None required (scenarios table already exists)

**Monitoring:**
- Monitor endpoint response times
- Monitor error rates
- Set up alerts for 500 errors

**Rollback Plan:**
- Endpoints are read-only, low risk
- Can disable endpoints by removing files if needed
- No database migrations to rollback

---

## Summary

This implementation plan provides comprehensive guidance for implementing two read-only scenario endpoints. The implementation follows the project's tech stack (Astro 5, TypeScript 5, Supabase), adheres to coding best practices, and maintains consistency with the existing type system.

**Key Deliverables:**
1. Scenarios service with business logic
2. Validation schemas for input
3. Two API endpoint handlers
4. Comprehensive error handling
5. Unit and integration tests
6. API documentation updates

**Estimated Effort:**
- Service implementation: 2 hours
- Endpoint implementation: 2 hours
- Testing: 2 hours
- Documentation: 1 hour
- **Total: 7 hours**

**Dependencies:**
- Supabase client configured in middleware
- Database schema and seed data
- Type definitions in `src/types.ts`

