import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, aiAgentsTable } from '../db/schema';
import { type CreateUserInput, type CreateCategoryInput, type CreateAIAgentInput } from '../schema';
import { getAIAgentById } from '../handlers/get_ai_agent_by_id';

// Test data setup
const testUser: CreateUserInput = {
  email: 'creator@test.com',
  username: 'testcreator',
  full_name: 'Test Creator',
  user_type: 'creator'
};

const testCategory: CreateCategoryInput = {
  name: 'AI Tools',
  description: 'Various AI-powered tools'
};

const testAgent: CreateAIAgentInput = {
  creator_id: 1, // Will be set after user creation
  name: 'Test AI Agent',
  description: 'A comprehensive AI agent for testing purposes',
  price: 29.99,
  key_features: ['Feature 1', 'Feature 2', 'Feature 3'],
  screenshots: ['screenshot1.jpg', 'screenshot2.jpg'],
  category_id: 1 // Will be set after category creation
};

describe('getAIAgentById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return AI agent when found', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        username: testUser.username,
        full_name: testUser.full_name,
        user_type: testUser.user_type,
        credit_balance: '0',
        total_earned: '0'
      })
      .returning()
      .execute();

    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: testCategory.name,
        description: testCategory.description
      })
      .returning()
      .execute();

    // Create AI agent
    const agentResult = await db.insert(aiAgentsTable)
      .values({
        creator_id: userResult[0].id,
        name: testAgent.name,
        description: testAgent.description,
        price: testAgent.price.toString(), // Convert to string for numeric column
        key_features: testAgent.key_features,
        screenshots: testAgent.screenshots,
        category_id: categoryResult[0].id,
        is_active: true,
        total_sales: 0
      })
      .returning()
      .execute();

    const result = await getAIAgentById(agentResult[0].id);

    // Verify all fields are returned correctly
    expect(result).toBeDefined();
    expect(result!.id).toEqual(agentResult[0].id);
    expect(result!.creator_id).toEqual(userResult[0].id);
    expect(result!.name).toEqual('Test AI Agent');
    expect(result!.description).toEqual(testAgent.description);
    expect(result!.price).toEqual(29.99);
    expect(typeof result!.price).toBe('number'); // Verify numeric conversion
    expect(result!.key_features).toEqual(['Feature 1', 'Feature 2', 'Feature 3']);
    expect(result!.screenshots).toEqual(['screenshot1.jpg', 'screenshot2.jpg']);
    expect(result!.category_id).toEqual(categoryResult[0].id);
    expect(result!.is_active).toBe(true);
    expect(result!.total_sales).toEqual(0);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when agent not found', async () => {
    const result = await getAIAgentById(999);
    expect(result).toBeNull();
  });

  it('should return agent with correct numeric price conversion', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        username: testUser.username,
        full_name: testUser.full_name,
        user_type: testUser.user_type,
        credit_balance: '0',
        total_earned: '0'
      })
      .returning()
      .execute();

    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: testCategory.name,
        description: testCategory.description
      })
      .returning()
      .execute();

    // Create agent with specific price to test conversion
    const agentResult = await db.insert(aiAgentsTable)
      .values({
        creator_id: userResult[0].id,
        name: 'Price Test Agent',
        description: 'Testing price conversion',
        price: '99.95', // Store as string
        key_features: ['Test feature'],
        screenshots: [],
        category_id: categoryResult[0].id,
        is_active: true,
        total_sales: 5
      })
      .returning()
      .execute();

    const result = await getAIAgentById(agentResult[0].id);

    expect(result).toBeDefined();
    expect(result!.price).toEqual(99.95);
    expect(typeof result!.price).toBe('number');
    expect(result!.total_sales).toEqual(5);
  });

  it('should handle agents with empty screenshots array', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        username: testUser.username,
        full_name: testUser.full_name,
        user_type: testUser.user_type,
        credit_balance: '0',
        total_earned: '0'
      })
      .returning()
      .execute();

    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: testCategory.name,
        description: testCategory.description
      })
      .returning()
      .execute();

    // Create agent with empty screenshots
    const agentResult = await db.insert(aiAgentsTable)
      .values({
        creator_id: userResult[0].id,
        name: 'No Screenshots Agent',
        description: 'Agent without screenshots',
        price: '19.99',
        key_features: ['Simple feature'],
        screenshots: [], // Empty array
        category_id: categoryResult[0].id,
        is_active: true,
        total_sales: 0
      })
      .returning()
      .execute();

    const result = await getAIAgentById(agentResult[0].id);

    expect(result).toBeDefined();
    expect(result!.screenshots).toEqual([]);
    expect(Array.isArray(result!.screenshots)).toBe(true);
  });

  it('should handle inactive agents', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        username: testUser.username,
        full_name: testUser.full_name,
        user_type: testUser.user_type,
        credit_balance: '0',
        total_earned: '0'
      })
      .returning()
      .execute();

    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: testCategory.name,
        description: testCategory.description
      })
      .returning()
      .execute();

    // Create inactive agent
    const agentResult = await db.insert(aiAgentsTable)
      .values({
        creator_id: userResult[0].id,
        name: 'Inactive Agent',
        description: 'This agent is inactive',
        price: '15.00',
        key_features: ['Inactive feature'],
        screenshots: [],
        category_id: categoryResult[0].id,
        is_active: false, // Set as inactive
        total_sales: 10
      })
      .returning()
      .execute();

    const result = await getAIAgentById(agentResult[0].id);

    // Handler should still return inactive agents (business logic decision)
    expect(result).toBeDefined();
    expect(result!.is_active).toBe(false);
    expect(result!.total_sales).toEqual(10);
  });

  it('should verify joins work correctly with related data', async () => {
    // Create user with specific data
    const userResult = await db.insert(usersTable)
      .values({
        email: 'specific@creator.com',
        username: 'specificcreator',
        full_name: 'Specific Creator Name',
        user_type: 'creator',
        credit_balance: '100.50',
        total_earned: '250.75'
      })
      .returning()
      .execute();

    // Create category with specific data
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Machine Learning',
        description: 'ML and AI related tools'
      })
      .returning()
      .execute();

    // Create agent
    const agentResult = await db.insert(aiAgentsTable)
      .values({
        creator_id: userResult[0].id,
        name: 'ML Agent',
        description: 'Advanced machine learning agent',
        price: '149.99',
        key_features: ['ML Training', 'Data Analysis', 'Predictions'],
        screenshots: ['ml1.jpg', 'ml2.jpg', 'ml3.jpg'],
        category_id: categoryResult[0].id,
        is_active: true,
        total_sales: 25
      })
      .returning()
      .execute();

    const result = await getAIAgentById(agentResult[0].id);

    // Verify the agent data is correct (joins worked)
    expect(result).toBeDefined();
    expect(result!.creator_id).toEqual(userResult[0].id);
    expect(result!.category_id).toEqual(categoryResult[0].id);
    expect(result!.name).toEqual('ML Agent');
    expect(result!.key_features).toHaveLength(3);
    expect(result!.screenshots).toHaveLength(3);
  });
});