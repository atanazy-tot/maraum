/**
 * Scenarios Service
 *
 * Encapsulates all scenario-related business logic and database queries.
 * This service provides methods to retrieve scenario data from the database
 * and transform it into the appropriate DTO formats for API responses.
 */

import type { SupabaseClient } from "@/db/supabase.client";
import type { ScenarioListItemDTO, ScenarioDetailDTO } from "@/types";

/**
 * Retrieves all active scenarios, ordered by sort_order.
 *
 * This method queries the scenarios table for all scenarios where is_active = true,
 * selecting only the fields needed for the ScenarioListItemDTO. The results are
 * ordered by sort_order in ascending order.
 *
 * @param supabase - The Supabase client instance
 * @returns Promise resolving to an array of scenario list items
 * @throws Error if the database query fails
 */
export async function getActiveScenarios(supabase: SupabaseClient): Promise<ScenarioListItemDTO[]> {
  const { data, error } = await supabase
    .from("scenarios")
    .select("id, title, emoji, sort_order, is_active, initial_message_main, initial_message_helper")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch active scenarios: ${error.message}`);
  }

  return data as ScenarioListItemDTO[];
}

/**
 * Retrieves a single scenario by its ID, only if it's active.
 *
 * This method queries the scenarios table for a specific scenario by ID,
 * filtering by is_active = true to ensure only active scenarios are returned.
 * Returns null if the scenario doesn't exist or is not active.
 *
 * @param supabase - The Supabase client instance
 * @param id - The unique identifier of the scenario
 * @returns Promise resolving to the scenario details or null if not found
 * @throws Error if the database query fails
 */
export async function getScenarioById(supabase: SupabaseClient, id: number): Promise<ScenarioDetailDTO | null> {
  const { data, error } = await supabase.from("scenarios").select("*").eq("id", id).eq("is_active", true).single();

  if (error) {
    // Supabase returns PGRST116 error code when no rows are found with .single()
    if (error.code === "PGRST116") {
      return null;
    }
    throw new Error(`Failed to fetch scenario by ID: ${error.message}`);
  }

  return data as ScenarioDetailDTO;
}
