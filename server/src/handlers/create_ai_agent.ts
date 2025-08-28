import { db } from '../db';
import { aiAgentsTable, usersTable, categoriesTable } from '../db/schema';
import { type CreateAIAgentInput, type AIAgent } from '../schema';
import { eq } from 'drizzle-orm';

export const createAIAgent = async (input: CreateAIAgentInput): Promise<AIAgent> => {
  try {
    // Validate that the creator exists and has creator permissions
    const creator = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.creator_id))
      .execute();

    if (creator.length === 0) {
      throw new Error('Creator not found');
    }

    const creatorUser = creator[0];
    if (creatorUser.user_type === 'buyer') {
      throw new Error('User must be a creator to create AI agents');
    }

    // Validate that the category exists
    const category = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, input.category_id))
      .execute();

    if (category.length === 0) {
      throw new Error('Category not found');
    }

    // Insert AI agent record
    const result = await db.insert(aiAgentsTable)
      .values({
        creator_id: input.creator_id,
        name: input.name,
        description: input.description,
        price: input.price.toString(), // Convert number to string for numeric column
        key_features: input.key_features,
        screenshots: input.screenshots,
        category_id: input.category_id
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const agent = result[0];
    return {
      ...agent,
      price: parseFloat(agent.price) // Convert string back to number
    };
  } catch (error) {
    console.error('AI agent creation failed:', error);
    throw error;
  }
};