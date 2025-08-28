import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, aiAgentsTable } from '../db/schema';
import { type CreateAIAgentInput } from '../schema';
import { createAIAgent } from '../handlers/create_ai_agent';
import { eq } from 'drizzle-orm';

// Test users
const creatorUser = {
  email: 'creator@test.com',
  username: 'creator123',
  full_name: 'Test Creator',
  user_type: 'creator' as const
};

const buyerUser = {
  email: 'buyer@test.com',
  username: 'buyer123',
  full_name: 'Test Buyer',
  user_type: 'buyer' as const
};

// Test category
const testCategory = {
  name: 'AI Tools',
  description: 'Tools for AI development'
};

// Valid test input
const testInput: CreateAIAgentInput = {
  creator_id: 1,
  name: 'Test AI Agent',
  description: 'A comprehensive AI agent for testing purposes with advanced features',
  price: 99.99,
  key_features: ['Feature 1', 'Feature 2', 'Feature 3'],
  screenshots: ['screenshot1.jpg', 'screenshot2.jpg'],
  category_id: 1
};

describe('createAIAgent', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create an AI agent successfully', async () => {
    // Create prerequisite data
    const createdUser = await db.insert(usersTable)
      .values(creatorUser)
      .returning()
      .execute();

    const createdCategory = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();

    const inputWithIds = {
      ...testInput,
      creator_id: createdUser[0].id,
      category_id: createdCategory[0].id
    };

    const result = await createAIAgent(inputWithIds);

    // Basic field validation
    expect(result.name).toEqual('Test AI Agent');
    expect(result.description).toEqual(testInput.description);
    expect(result.price).toEqual(99.99);
    expect(typeof result.price).toBe('number'); // Ensure numeric conversion
    expect(result.key_features).toEqual(['Feature 1', 'Feature 2', 'Feature 3']);
    expect(result.screenshots).toEqual(['screenshot1.jpg', 'screenshot2.jpg']);
    expect(result.creator_id).toEqual(createdUser[0].id);
    expect(result.category_id).toEqual(createdCategory[0].id);
    expect(result.is_active).toBe(true);
    expect(result.total_sales).toBe(0);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save AI agent to database', async () => {
    // Create prerequisite data
    const createdUser = await db.insert(usersTable)
      .values(creatorUser)
      .returning()
      .execute();

    const createdCategory = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();

    const inputWithIds = {
      ...testInput,
      creator_id: createdUser[0].id,
      category_id: createdCategory[0].id
    };

    const result = await createAIAgent(inputWithIds);

    // Query database to verify save
    const agents = await db.select()
      .from(aiAgentsTable)
      .where(eq(aiAgentsTable.id, result.id))
      .execute();

    expect(agents).toHaveLength(1);
    expect(agents[0].name).toEqual('Test AI Agent');
    expect(agents[0].description).toEqual(testInput.description);
    expect(parseFloat(agents[0].price)).toEqual(99.99);
    expect(agents[0].key_features).toEqual(['Feature 1', 'Feature 2', 'Feature 3']);
    expect(agents[0].screenshots).toEqual(['screenshot1.jpg', 'screenshot2.jpg']);
    expect(agents[0].creator_id).toEqual(createdUser[0].id);
    expect(agents[0].category_id).toEqual(createdCategory[0].id);
    expect(agents[0].is_active).toBe(true);
    expect(agents[0].total_sales).toBe(0);
    expect(agents[0].created_at).toBeInstanceOf(Date);
    expect(agents[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle default screenshots correctly', async () => {
    // Create prerequisite data
    const createdUser = await db.insert(usersTable)
      .values(creatorUser)
      .returning()
      .execute();

    const createdCategory = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();

    const inputWithoutScreenshots = {
      creator_id: createdUser[0].id,
      name: 'Agent Without Screenshots',
      description: 'A test agent without screenshots provided',
      price: 49.99,
      key_features: ['Basic Feature'],
      screenshots: [], // Explicitly providing empty array
      category_id: createdCategory[0].id
    };

    const result = await createAIAgent(inputWithoutScreenshots);

    expect(result.screenshots).toEqual([]);
  });

  it('should throw error if creator does not exist', async () => {
    // Create category but not user
    const createdCategory = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();

    const inputWithInvalidUser = {
      ...testInput,
      creator_id: 999, // Non-existent user ID
      category_id: createdCategory[0].id
    };

    expect(createAIAgent(inputWithInvalidUser)).rejects.toThrow(/creator not found/i);
  });

  it('should throw error if category does not exist', async () => {
    // Create user but not category
    const createdUser = await db.insert(usersTable)
      .values(creatorUser)
      .returning()
      .execute();

    const inputWithInvalidCategory = {
      ...testInput,
      creator_id: createdUser[0].id,
      category_id: 999 // Non-existent category ID
    };

    expect(createAIAgent(inputWithInvalidCategory)).rejects.toThrow(/category not found/i);
  });

  it('should throw error if user is not a creator', async () => {
    // Create buyer user (not creator)
    const createdBuyer = await db.insert(usersTable)
      .values(buyerUser)
      .returning()
      .execute();

    const createdCategory = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();

    const inputWithBuyer = {
      ...testInput,
      creator_id: createdBuyer[0].id,
      category_id: createdCategory[0].id
    };

    expect(createAIAgent(inputWithBuyer)).rejects.toThrow(/user must be a creator/i);
  });

  it('should allow both-type users to create agents', async () => {
    // Create "both" type user
    const bothTypeUser = {
      email: 'both@test.com',
      username: 'both123',
      full_name: 'Both User',
      user_type: 'both' as const
    };

    const createdUser = await db.insert(usersTable)
      .values(bothTypeUser)
      .returning()
      .execute();

    const createdCategory = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();

    const inputWithBothUser = {
      ...testInput,
      creator_id: createdUser[0].id,
      category_id: createdCategory[0].id
    };

    const result = await createAIAgent(inputWithBothUser);

    expect(result.creator_id).toEqual(createdUser[0].id);
    expect(result.name).toEqual(testInput.name);
  });

  it('should handle complex key_features array', async () => {
    // Create prerequisite data
    const createdUser = await db.insert(usersTable)
      .values(creatorUser)
      .returning()
      .execute();

    const createdCategory = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();

    const inputWithComplexFeatures = {
      ...testInput,
      creator_id: createdUser[0].id,
      category_id: createdCategory[0].id,
      key_features: [
        'Advanced Natural Language Processing',
        'Multi-language Support',
        'Real-time Analytics Dashboard',
        'API Integration',
        'Custom Model Training'
      ]
    };

    const result = await createAIAgent(inputWithComplexFeatures);

    expect(result.key_features).toEqual(inputWithComplexFeatures.key_features);
    expect(result.key_features).toHaveLength(5);
  });
});