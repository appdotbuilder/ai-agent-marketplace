import { db } from '../db';
import { aiAgentsTable } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { type AIAgent } from '../schema';

export const getCreatorAgents = async (creatorId: number): Promise<AIAgent[]> => {
  try {
    // Fetch all agents created by the specific creator, ordered by creation date (newest first)
    const results = await db.select()
      .from(aiAgentsTable)
      .where(eq(aiAgentsTable.creator_id, creatorId))
      .orderBy(desc(aiAgentsTable.created_at))
      .execute();

    // Convert numeric fields back to numbers and ensure proper typing
    return results.map(agent => ({
      ...agent,
      price: parseFloat(agent.price), // Convert numeric string to number
      created_at: agent.created_at, // Already a Date object
      updated_at: agent.updated_at   // Already a Date object
    }));
  } catch (error) {
    console.error('Get creator agents failed:', error);
    throw error;
  }
};