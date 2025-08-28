import { db } from '../db';
import { aiAgentsTable, usersTable, categoriesTable } from '../db/schema';
import { type GetAIAgentsFilter, type AIAgent } from '../schema';
import { eq, and, gte, lte, ilike, or } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

export const getAIAgents = async (filter: GetAIAgentsFilter): Promise<AIAgent[]> => {
  try {
    // Build conditions array for filtering
    const conditions: SQL[] = [];

    // Always filter by is_active (defaults to true if not specified)
    conditions.push(eq(aiAgentsTable.is_active, filter.is_active ?? true));

    // Filter by category if specified
    if (filter.category_id !== undefined) {
      conditions.push(eq(aiAgentsTable.category_id, filter.category_id));
    }

    // Filter by creator if specified
    if (filter.creator_id !== undefined) {
      conditions.push(eq(aiAgentsTable.creator_id, filter.creator_id));
    }

    // Filter by price range
    if (filter.min_price !== undefined) {
      conditions.push(gte(aiAgentsTable.price, filter.min_price.toString()));
    }

    if (filter.max_price !== undefined) {
      conditions.push(lte(aiAgentsTable.price, filter.max_price.toString()));
    }

    // Search filter - search in name and description
    if (filter.search) {
      const searchTerm = `%${filter.search}%`;
      conditions.push(
        or(
          ilike(aiAgentsTable.name, searchTerm),
          ilike(aiAgentsTable.description, searchTerm)
        )!
      );
    }

    // Execute query with joins and conditions
    const results = await db.select({
      id: aiAgentsTable.id,
      creator_id: aiAgentsTable.creator_id,
      name: aiAgentsTable.name,
      description: aiAgentsTable.description,
      price: aiAgentsTable.price,
      key_features: aiAgentsTable.key_features,
      screenshots: aiAgentsTable.screenshots,
      category_id: aiAgentsTable.category_id,
      is_active: aiAgentsTable.is_active,
      total_sales: aiAgentsTable.total_sales,
      created_at: aiAgentsTable.created_at,
      updated_at: aiAgentsTable.updated_at,
    })
      .from(aiAgentsTable)
      .innerJoin(usersTable, eq(aiAgentsTable.creator_id, usersTable.id))
      .innerJoin(categoriesTable, eq(aiAgentsTable.category_id, categoriesTable.id))
      .where(conditions.length === 1 ? conditions[0] : and(...conditions))
      .execute();

    // Convert numeric fields back to numbers and return proper AIAgent objects
    return results.map(result => ({
      id: result.id,
      creator_id: result.creator_id,
      name: result.name,
      description: result.description,
      price: parseFloat(result.price), // Convert numeric to number
      key_features: result.key_features,
      screenshots: result.screenshots,
      category_id: result.category_id,
      is_active: result.is_active,
      total_sales: result.total_sales,
      created_at: result.created_at,
      updated_at: result.updated_at,
    }));
  } catch (error) {
    console.error('Failed to get AI agents:', error);
    throw error;
  }
};