import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, aiAgentsTable } from '../db/schema';
import { type UpdateAIAgentInput } from '../schema';
import { updateAIAgent } from '../handlers/update_ai_agent';
import { eq } from 'drizzle-orm';

describe('updateAIAgent', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUser: any;
  let testCategory: any;
  let testAgent: any;

  // Helper to create test data
  const createTestData = async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'creator@test.com',
        username: 'testcreator',
        full_name: 'Test Creator',
        user_type: 'creator'
      })
      .returning()
      .execute();
    testUser = {
      ...userResult[0],
      credit_balance: parseFloat(userResult[0].credit_balance),
      total_earned: parseFloat(userResult[0].total_earned)
    };

    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'A category for testing'
      })
      .returning()
      .execute();
    testCategory = categoryResult[0];

    // Create test AI agent
    const agentResult = await db.insert(aiAgentsTable)
      .values({
        creator_id: testUser.id,
        name: 'Original Agent',
        description: 'Original description for testing',
        price: '99.99',
        key_features: ['feature1', 'feature2'],
        screenshots: ['screenshot1.jpg'],
        category_id: testCategory.id
      })
      .returning()
      .execute();
    testAgent = {
      ...agentResult[0],
      price: parseFloat(agentResult[0].price)
    };
  };

  it('should update agent name', async () => {
    await createTestData();

    const updateInput: UpdateAIAgentInput = {
      id: testAgent.id,
      name: 'Updated Agent Name'
    };

    const result = await updateAIAgent(updateInput);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(testAgent.id);
    expect(result!.name).toEqual('Updated Agent Name');
    expect(result!.description).toEqual('Original description for testing'); // Unchanged
    expect(result!.price).toEqual(99.99); // Unchanged
    expect(result!.updated_at).toBeInstanceOf(Date);
    expect(result!.updated_at > testAgent.updated_at).toBe(true);
  });

  it('should update agent description', async () => {
    await createTestData();

    const updateInput: UpdateAIAgentInput = {
      id: testAgent.id,
      description: 'Updated description with more details'
    };

    const result = await updateAIAgent(updateInput);

    expect(result).not.toBeNull();
    expect(result!.description).toEqual('Updated description with more details');
    expect(result!.name).toEqual('Original Agent'); // Unchanged
  });

  it('should update agent price', async () => {
    await createTestData();

    const updateInput: UpdateAIAgentInput = {
      id: testAgent.id,
      price: 149.99
    };

    const result = await updateAIAgent(updateInput);

    expect(result).not.toBeNull();
    expect(result!.price).toEqual(149.99);
    expect(typeof result!.price).toBe('number');
  });

  it('should update key features', async () => {
    await createTestData();

    const newFeatures = ['updated_feature1', 'updated_feature2', 'new_feature3'];
    const updateInput: UpdateAIAgentInput = {
      id: testAgent.id,
      key_features: newFeatures
    };

    const result = await updateAIAgent(updateInput);

    expect(result).not.toBeNull();
    expect(result!.key_features).toEqual(newFeatures);
    expect(Array.isArray(result!.key_features)).toBe(true);
  });

  it('should update screenshots', async () => {
    await createTestData();

    const newScreenshots = ['new1.jpg', 'new2.png', 'new3.gif'];
    const updateInput: UpdateAIAgentInput = {
      id: testAgent.id,
      screenshots: newScreenshots
    };

    const result = await updateAIAgent(updateInput);

    expect(result).not.toBeNull();
    expect(result!.screenshots).toEqual(newScreenshots);
    expect(Array.isArray(result!.screenshots)).toBe(true);
  });

  it('should update category', async () => {
    await createTestData();

    // Create another category
    const newCategoryResult = await db.insert(categoriesTable)
      .values({
        name: 'New Category',
        description: 'Another test category'
      })
      .returning()
      .execute();
    const newCategory = newCategoryResult[0];

    const updateInput: UpdateAIAgentInput = {
      id: testAgent.id,
      category_id: newCategory.id
    };

    const result = await updateAIAgent(updateInput);

    expect(result).not.toBeNull();
    expect(result!.category_id).toEqual(newCategory.id);
  });

  it('should update is_active status', async () => {
    await createTestData();

    const updateInput: UpdateAIAgentInput = {
      id: testAgent.id,
      is_active: false
    };

    const result = await updateAIAgent(updateInput);

    expect(result).not.toBeNull();
    expect(result!.is_active).toBe(false);
    expect(testAgent.is_active).toBe(true); // Original was true
  });

  it('should update multiple fields at once', async () => {
    await createTestData();

    const updateInput: UpdateAIAgentInput = {
      id: testAgent.id,
      name: 'Multi-Updated Agent',
      price: 199.99,
      is_active: false,
      key_features: ['multi1', 'multi2']
    };

    const result = await updateAIAgent(updateInput);

    expect(result).not.toBeNull();
    expect(result!.name).toEqual('Multi-Updated Agent');
    expect(result!.price).toEqual(199.99);
    expect(result!.is_active).toBe(false);
    expect(result!.key_features).toEqual(['multi1', 'multi2']);
    expect(result!.description).toEqual('Original description for testing'); // Unchanged
  });

  it('should persist changes to database', async () => {
    await createTestData();

    const updateInput: UpdateAIAgentInput = {
      id: testAgent.id,
      name: 'Persisted Update',
      price: 299.99
    };

    await updateAIAgent(updateInput);

    // Query database directly to verify persistence
    const savedAgent = await db.select()
      .from(aiAgentsTable)
      .where(eq(aiAgentsTable.id, testAgent.id))
      .execute();

    expect(savedAgent).toHaveLength(1);
    expect(savedAgent[0].name).toEqual('Persisted Update');
    expect(parseFloat(savedAgent[0].price)).toEqual(299.99);
    expect(savedAgent[0].updated_at).toBeInstanceOf(Date);
  });

  it('should return null for non-existent agent', async () => {
    await createTestData();

    const updateInput: UpdateAIAgentInput = {
      id: 99999, // Non-existent ID
      name: 'Should not work'
    };

    const result = await updateAIAgent(updateInput);

    expect(result).toBeNull();
  });

  it('should handle empty update gracefully', async () => {
    await createTestData();

    const updateInput: UpdateAIAgentInput = {
      id: testAgent.id
      // No fields to update except id
    };

    const result = await updateAIAgent(updateInput);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(testAgent.id);
    expect(result!.name).toEqual(testAgent.name); // Unchanged
    expect(result!.updated_at).toBeInstanceOf(Date);
    expect(result!.updated_at > testAgent.updated_at).toBe(true); // Should still update timestamp
  });

  it('should handle foreign key constraint for category_id', async () => {
    await createTestData();

    const updateInput: UpdateAIAgentInput = {
      id: testAgent.id,
      category_id: 99999 // Non-existent category
    };

    await expect(updateAIAgent(updateInput)).rejects.toThrow(/foreign key constraint|violates/i);
  });

  it('should validate numeric conversion for price updates', async () => {
    await createTestData();

    const updateInput: UpdateAIAgentInput = {
      id: testAgent.id,
      price: 123.456789
    };

    const result = await updateAIAgent(updateInput);

    expect(result).not.toBeNull();
    expect(typeof result!.price).toBe('number');
    expect(result!.price).toBeCloseTo(123.46, 2); // Should handle precision correctly
  });
});