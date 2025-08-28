import { db } from '../db';
import { aiAgentsTable } from '../db/schema';
import { type UpdateAIAgentInput, type AIAgent } from '../schema';
import { eq } from 'drizzle-orm';

export const updateAIAgent = async (input: UpdateAIAgentInput): Promise<AIAgent | null> => {
  try {
    // First, check if the agent exists and get current data
    const existingAgent = await db.select()
      .from(aiAgentsTable)
      .where(eq(aiAgentsTable.id, input.id))
      .execute();

    if (existingAgent.length === 0) {
      return null;
    }

    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.name !== undefined) {
      updateData.name = input.name;
    }
    if (input.description !== undefined) {
      updateData.description = input.description;
    }
    if (input.price !== undefined) {
      updateData.price = input.price.toString();
    }
    if (input.key_features !== undefined) {
      updateData.key_features = input.key_features;
    }
    if (input.screenshots !== undefined) {
      updateData.screenshots = input.screenshots;
    }
    if (input.category_id !== undefined) {
      updateData.category_id = input.category_id;
    }
    if (input.is_active !== undefined) {
      updateData.is_active = input.is_active;
    }

    // Update the agent
    const result = await db.update(aiAgentsTable)
      .set(updateData)
      .where(eq(aiAgentsTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      return null;
    }

    // Convert numeric fields back to numbers before returning
    const agent = result[0];
    return {
      ...agent,
      price: parseFloat(agent.price)
    };
  } catch (error) {
    console.error('AI agent update failed:', error);
    throw error;
  }
};