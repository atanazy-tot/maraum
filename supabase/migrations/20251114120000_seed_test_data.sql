-- =====================================================================
-- Migration: Seed Test Data for API Testing
-- =====================================================================
-- Description: Inserts mock data into profiles, sessions, and messages
--              tables to enable testing of all API endpoints without
--              requiring authentication setup.
--
-- Test Data Created:
--   - 1 test user profile (test@maraum.app)
--   - 2 test sessions (1 completed, 1 in progress)
--   - Test messages for both sessions
--
-- Notes:
--   - This is DEVELOPMENT-ONLY test data
--   - RLS is already disabled for development
--   - Test user UUID is deterministic for easy reference
--   - Messages include realistic conversation flow
--
-- Author: Maraum Development Team
-- Date: 2025-11-14
-- Version: 1.1 (Simplified)
-- =====================================================================

-- =====================================================================
-- SECTION 1: Create Test User in Auth Schema
-- =====================================================================

do $$
declare
    test_user_id uuid := '00000000-0000-0000-0000-000000000001';
    test_email text := 'test@maraum.app';
    auth_user_exists boolean;
begin
    select exists(select 1 from auth.users where id = test_user_id) into auth_user_exists;
    
    if not auth_user_exists then
        begin
            insert into auth.users (
                id,
                instance_id,
                aud,
                role,
                email,
                encrypted_password,
                email_confirmed_at,
                created_at,
                updated_at,
                raw_app_meta_data,
                raw_user_meta_data,
                is_super_admin
            )
            values (
                test_user_id,
                '00000000-0000-0000-0000-000000000000',
                'authenticated',
                'authenticated',
                test_email,
                crypt('test-password-12345', gen_salt('bf')),
                now(),
                now(),
                now(),
                '{"provider": "email", "providers": ["email"]}'::jsonb,
                '{}'::jsonb,
                false
            );
            
            raise notice '✓ test auth user created: % (id: %)', test_email, test_user_id;
        exception
            when others then
                raise warning 'Could not auto-create auth user: %', sqlerrm;
        end;
    else
        raise notice '✓ test auth user already exists: % (id: %)', test_email, test_user_id;
    end if;
end $$;

-- =====================================================================
-- SECTION 2: Create Test Profile
-- =====================================================================

insert into profiles (
    id,
    email,
    completed_scenario_count,
    current_week_completion_count,
    week_reset_date,
    created_at,
    updated_at
)
values (
    '00000000-0000-0000-0000-000000000001',
    'test@maraum.app',
    1,
    1,
    now() + interval '7 days',
    now() - interval '30 days',
    now()
)
on conflict (id) do update set
    email = excluded.email,
    completed_scenario_count = excluded.completed_scenario_count,
    current_week_completion_count = excluded.current_week_completion_count,
    updated_at = now();

-- =====================================================================
-- SECTION 3: Create Session 1 (Marketplace - Will Be Completed)
-- =====================================================================

insert into sessions (
    id,
    user_id,
    scenario_id,
    is_completed,
    started_at,
    last_activity_at,
    message_count_main,
    message_count_helper,
    updated_at
)
values (
    '11111111-1111-1111-1111-111111111111',
    '00000000-0000-0000-0000-000000000001',
    1,
    false,
    now() - interval '7 days',
    now() - interval '7 days',
    0,
    0,
    now()
)
on conflict (id) do nothing;

-- =====================================================================
-- SECTION 4: Insert Session 1 Messages
-- =====================================================================

-- initial main message
insert into messages (id, session_id, user_id, role, chat_type, content, sent_at, created_at)
values ('00000001-0001-0001-0001-000000000001', '11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'main_assistant', 'main', 'Du stehst auf einem belebten Wochenmarkt in Berlin. Ein Verkäufer an einem Gemüsestand lächelt dich an. "Guten Tag! Suchst du etwas Bestimmtes?"', now() - interval '7 days', now() - interval '7 days')
on conflict (id) do nothing;

-- initial helper message
insert into messages (id, session_id, user_id, role, chat_type, content, sent_at, created_at)
values ('00000001-0001-0001-0001-000000000002', '11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'helper_assistant', 'helper', 'Ah, you''re attempting German. How ambitious. I suppose I could help you stumble through this conversation.', now() - interval '7 days' + interval '1 second', now() - interval '7 days' + interval '1 second')
on conflict (id) do nothing;

-- user response
insert into messages (id, session_id, user_id, role, chat_type, content, sent_at, created_at)
values ('00000001-0001-0001-0001-000000000003', '11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'user', 'main', 'Guten Tag! Ja, ich suche frisches Gemüse.', now() - interval '7 days' + interval '30 seconds', now() - interval '7 days' + interval '30 seconds')
on conflict (id) do nothing;

-- main response
insert into messages (id, session_id, user_id, role, chat_type, content, sent_at, created_at)
values ('00000001-0001-0001-0001-000000000004', '11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'main_assistant', 'main', 'Wunderbar! Wir haben heute sehr frische Tomaten, Gurken und Paprika. Was möchtest du?', now() - interval '7 days' + interval '35 seconds', now() - interval '7 days' + interval '35 seconds')
on conflict (id) do nothing;

-- user to helper
insert into messages (id, session_id, user_id, role, chat_type, content, sent_at, created_at)
values ('00000001-0001-0001-0001-000000000005', '11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'user', 'helper', 'How do I say "I would like 3 tomatoes"?', now() - interval '7 days' + interval '1 minute', now() - interval '7 days' + interval '1 minute')
on conflict (id) do nothing;

-- helper response
insert into messages (id, session_id, user_id, role, chat_type, content, sent_at, created_at)
values ('00000001-0001-0001-0001-000000000006', '11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'helper_assistant', 'helper', 'Try "Ich möchte drei Tomaten, bitte." The vendor is waiting rather patiently, considering.', now() - interval '7 days' + interval '1 minute 5 seconds', now() - interval '7 days' + interval '1 minute 5 seconds')
on conflict (id) do nothing;

-- user purchase
insert into messages (id, session_id, user_id, role, chat_type, content, sent_at, created_at)
values ('00000001-0001-0001-0001-000000000007', '11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'user', 'main', 'Ich möchte drei Tomaten, bitte.', now() - interval '7 days' + interval '1 minute 30 seconds', now() - interval '7 days' + interval '1 minute 30 seconds')
on conflict (id) do nothing;

-- conclusion
insert into messages (id, session_id, user_id, role, chat_type, content, sent_at, created_at)
values ('00000001-0001-0001-0001-000000000008', '11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'main_assistant', 'main', 'Sehr gut! Drei Tomaten kosten zwei Euro fünfzig. Vielen Dank!', now() - interval '7 days' + interval '2 minutes', now() - interval '7 days' + interval '2 minutes')
on conflict (id) do nothing;

-- =====================================================================
-- SECTION 5: Mark Session 1 as Completed
-- =====================================================================

update sessions
set is_completed = true,
    completed_at = now() - interval '7 days' + interval '15 minutes'
where id = '11111111-1111-1111-1111-111111111111'
  and is_completed = false;

-- =====================================================================
-- SECTION 6: Create Session 2 (Party - Active)
-- =====================================================================

insert into sessions (
    id,
    user_id,
    scenario_id,
    is_completed,
    started_at,
    last_activity_at,
    message_count_main,
    message_count_helper,
    updated_at
)
values (
    '22222222-2222-2222-2222-222222222222',
    '00000000-0000-0000-0000-000000000001',
    2,
    false,
    now() - interval '2 hours',
    now() - interval '5 minutes',
    0,
    0,
    now()
)
on conflict (id) do nothing;

-- =====================================================================
-- SECTION 7: Insert Session 2 Messages
-- =====================================================================

-- initial main message
insert into messages (id, session_id, user_id, role, chat_type, content, sent_at, created_at)
values ('00000002-0002-0002-0002-000000000001', '22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001', 'main_assistant', 'main', 'Du bist auf einer Party in einer Berliner WG. Laute Musik, viele Leute. Jemand kommt auf dich zu mit zwei Bechern. "Hey! Willst du auch was trinken?"', now() - interval '2 hours', now() - interval '2 hours')
on conflict (id) do nothing;

-- initial helper message
insert into messages (id, session_id, user_id, role, chat_type, content, sent_at, created_at)
values ('00000002-0002-0002-0002-000000000002', '22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001', 'helper_assistant', 'helper', 'A party. How delightfully anxiety-inducing. Let me know if you need help with drinking vocabulary.', now() - interval '2 hours' + interval '2 seconds', now() - interval '2 hours' + interval '2 seconds')
on conflict (id) do nothing;

-- user response
insert into messages (id, session_id, user_id, role, chat_type, content, sent_at, created_at)
values ('00000002-0002-0002-0002-000000000003', '22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001', 'user', 'main', 'Ja, gerne! Was ist Flunkyball?', now() - interval '2 hours' + interval '45 seconds', now() - interval '2 hours' + interval '45 seconds')
on conflict (id) do nothing;

-- main response
insert into messages (id, session_id, user_id, role, chat_type, content, sent_at, created_at)
values ('00000002-0002-0002-0002-000000000004', '22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001', 'main_assistant', 'main', 'Das ist ein Trinkspiel! Man wirft einen Ball und muss dann schnell sein Bier trinken. Sehr lustig!', now() - interval '2 hours' + interval '50 seconds', now() - interval '2 hours' + interval '50 seconds')
on conflict (id) do nothing;

-- =====================================================================
-- VERIFICATION
-- =====================================================================

do $$
declare
    profile_count integer;
    session_count integer;
    message_count integer;
    session1_count integer;
    session2_count integer;
begin
    select count(*) into profile_count from profiles where id = '00000000-0000-0000-0000-000000000001';
    select count(*) into session_count from sessions where user_id = '00000000-0000-0000-0000-000000000001';
    select count(*) into message_count from messages where user_id = '00000000-0000-0000-0000-000000000001';
    select count(*) into session1_count from sessions where id = '11111111-1111-1111-1111-111111111111' and is_completed = true;
    select count(*) into session2_count from sessions where id = '22222222-2222-2222-2222-222222222222' and is_completed = false;
    
    if profile_count != 1 or session_count != 2 or session1_count != 1 or session2_count != 1 then
        raise exception 'Test data verification failed';
    end if;
    
    raise notice '✓ Test profile created: 1 profile';
    raise notice '✓ Test sessions created: % sessions (1 completed, 1 active)', session_count;
    raise notice '✓ Test messages created: % messages', message_count;
    raise notice '';
    raise notice 'Test data summary:';
    raise notice '  - User: test@maraum.app (ID: 00000000-0000-0000-0000-000000000001)';
    raise notice '  - Completed session: 11111111-1111-1111-1111-111111111111 (Marketplace)';
    raise notice '  - Active session: 22222222-2222-2222-2222-222222222222 (Party)';
end $$;

-- =====================================================================
-- MIGRATION COMPLETE
-- =====================================================================
