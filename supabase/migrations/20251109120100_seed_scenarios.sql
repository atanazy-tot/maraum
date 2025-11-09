-- =====================================================================
-- Migration: Seed Initial Scenarios
-- =====================================================================
-- Description: Inserts 3 pre-defined scenarios for Maraum MVP
--              (🛒 Marketplace, 🎉 Party, 🥙 Kebab)
--
-- Scenarios:
--   1. Marketplace Encounter - Buying vegetables at a Berlin market
--   2. High School Party - Social interaction at a WG party
--   3. Late Night Kebab - Ordering food at 2 AM in Kreuzberg
--
-- Notes:
--   - Initial messages are in German (main chat) and English (helper chat)
--   - German text should be reviewed by native speaker before production
--   - Vocabulary level targets B1-B2 German learners
--   - Prompt templates stored separately in repository .MD files
--
-- Author: Maraum Development Team
-- Date: 2025-11-09
-- Version: 1.0
-- =====================================================================

-- =====================================================================
-- SEED DATA: scenarios
-- =====================================================================

-- ---------------------------------------------------------------------
-- Scenario 1: Marketplace Encounter (🛒)
-- ---------------------------------------------------------------------
-- Context: User is at a busy weekend market in Berlin, interacting
--          with a vegetable stand vendor
-- Difficulty: B1 (basic conversational German)
-- Key Vocabulary: Food items, prices, quantities, polite phrases
-- ---------------------------------------------------------------------
INSERT INTO scenarios (id, title, emoji, initial_message_main, initial_message_helper, is_active) VALUES
(
    1,
    'Marketplace Encounter',
    '🛒',
    'Du stehst auf einem belebten Wochenmarkt in Berlin. Ein Verkäufer an einem Gemüsestand lächelt dich an. "Guten Tag! Suchst du etwas Bestimmtes?"',
    'Ah, you''re attempting German. How ambitious. I suppose I could help you stumble through this conversation. Ask me if you need vocabulary, or just wing it. Your funeral.',
    true
);

COMMENT ON COLUMN scenarios.initial_message_main IS 
    'German opening message for 魔 (main chat): vendor greeting at market';

-- ---------------------------------------------------------------------
-- Scenario 2: High School Party (🎉)
-- ---------------------------------------------------------------------
-- Context: User is at a WG (shared apartment) party in Berlin with
--          loud music and many people
-- Difficulty: B2 (intermediate conversational German, casual slang)
-- Key Vocabulary: Drinks, games, social phrases, youth slang
-- ---------------------------------------------------------------------
INSERT INTO scenarios (id, title, emoji, initial_message_main, initial_message_helper, is_active) VALUES
(
    2,
    'High School Party',
    '🎉',
    'Du bist auf einer Party in einer Berliner WG. Laute Musik, viele Leute. Jemand kommt auf dich zu mit zwei Bechern. "Hey! Willst du auch was trinken? Oder spielst du lieber Flunkyball?"',
    'A party. How delightfully anxiety-inducing. Let me know if you need help with drinking vocabulary or flirting phrases. Though honestly, you''ll probably need both.',
    true
);

COMMENT ON COLUMN scenarios.initial_message_helper IS 
    'English opening message for 間 (helper chat): sarcastic AI companion';

-- ---------------------------------------------------------------------
-- Scenario 3: Late Night Kebab (🥙)
-- ---------------------------------------------------------------------
-- Context: User is at a kebab shop in Kreuzberg at 2 AM, ordering
--          late-night food
-- Difficulty: B1 (basic transactional German, food ordering)
-- Key Vocabulary: Food items, condiments, payment, late-night culture
-- Classic Berlin Experience: Post-party kebab diplomacy
-- ---------------------------------------------------------------------
INSERT INTO scenarios (id, title, emoji, initial_message_main, initial_message_helper, is_active) VALUES
(
    3,
    'Late Night Kebab',
    '🥙',
    'Es ist 2 Uhr morgens. Du stehst in einer Döner-Bude in Kreuzberg. Der Mann hinter der Theke sieht müde aus. "Was darf es sein? Mit scharf?"',
    'The classic Berlin experience: drunk kebab diplomacy. I''ll help you navigate the menu, though I can''t promise you''ll remember this conversation tomorrow.',
    true
);

-- =====================================================================
-- VERIFICATION
-- =====================================================================

-- Verify all 3 scenarios were inserted correctly
DO $$
DECLARE
    scenario_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO scenario_count FROM scenarios;
    
    IF scenario_count != 3 THEN
        RAISE EXCEPTION 'Scenario seeding failed: expected 3 scenarios, found %', scenario_count;
    END IF;
    
    RAISE NOTICE 'Successfully seeded % scenarios', scenario_count;
END $$;

-- =====================================================================
-- MIGRATION COMPLETE
-- =====================================================================
-- Next Steps:
--   1. Review German text with native speaker for natural conversation flow
--   2. Verify scenario display in frontend (title, emoji, initial messages)
--   3. Create corresponding prompt template .MD files in repository:
--      - prompts/scenario-marketplace.md
--      - prompts/scenario-party.md
--      - prompts/scenario-kebab.md
--      - prompts/helper.md
--   4. Test scenario selection and session creation flow
-- =====================================================================

