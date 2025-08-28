import { db } from '../db';
import { aiAgentsTable, usersTable, categoriesTable } from '../db/schema';
import { type AIAgent } from '../schema';
import { eq } from 'drizzle-orm';

export const getAIAgentById = async (id: number): Promise<AIAgent | null> => {
  try {
    // Query with joins to get complete agent information
    const result = await db.select()
      .from(aiAgentsTable)
      .innerJoin(usersTable, eq(aiAgentsTable.creator_id, usersTable.id))
      .innerJoin(categoriesTable, eq(aiAgentsTable.category_id, categoriesTable.id))
      .where(eq(aiAgentsTable.id, id))
      .execute();

    if (result.length === 0) {
      return null;
    }

    const agentData = result[0];
    
    // Return the AI agent with numeric conversions
    return {
      id: agentData.ai_agents.id,
      creator_id: agentData.ai_agents.creator_id,
      name: agentData.ai_agents.name,
      description: agentData.ai_agents.description,
      price: parseFloat(agentData.ai_agents.price), // Convert numeric to number
      key_features: agentData.ai_agents.key_features,
      screenshots: agentData.ai_agents.screenshots,
      category_id: agentData.ai_agents.category_id,
      is_active: agentData.ai_agents.is_active,
      total_sales: agentData.ai_agents.total_sales,
      created_at: agentData.ai_agents.created_at,
      updated_at: agentData.ai_agents.updated_at
    };
  } catch (error) {
    console.error('Get AI agent by ID failed:', error);
    throw error;
  }
};