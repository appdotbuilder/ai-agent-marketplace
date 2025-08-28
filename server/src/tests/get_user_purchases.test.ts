import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, aiAgentsTable, purchasesTable } from '../db/schema';
import { type GetUserPurchasesFilter, type CreateUserInput, type CreateCategoryInput, type CreateAIAgentInput } from '../schema';
import { getUserPurchases } from '../handlers/get_user_purchases';

// Test data
const testBuyer: CreateUserInput = {
  email: 'buyer@test.com',
  username: 'test_buyer',
  full_name: 'Test Buyer',
  user_type: 'buyer'
};

const testCreator: CreateUserInput = {
  email: 'creator@test.com',
  username: 'test_creator',
  full_name: 'Test Creator',
  user_type: 'creator'
};

const testCategory: CreateCategoryInput = {
  name: 'AI Tools',
  description: 'Tools for AI development'
};

const testAgent: CreateAIAgentInput = {
  creator_id: 0, // Will be set after user creation
  name: 'Test AI Agent',
  description: 'An AI agent for testing purposes',
  price: 29.99,
  key_features: ['Feature 1', 'Feature 2'],
  screenshots: ['screenshot1.png'],
  category_id: 0 // Will be set after category creation
};

describe('getUserPurchases', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when user has no purchases', async () => {
    // Create a buyer but no purchases
    const [buyer] = await db.insert(usersTable)
      .values({
        email: testBuyer.email,
        username: testBuyer.username,
        full_name: testBuyer.full_name,
        user_type: testBuyer.user_type
      })
      .returning()
      .execute();

    const filter: GetUserPurchasesFilter = {
      user_id: buyer.id
    };

    const result = await getUserPurchases(filter);

    expect(result).toEqual([]);
  });

  it('should return user purchases with correct data', async () => {
    // Create prerequisite data
    const [buyer] = await db.insert(usersTable)
      .values({
        email: testBuyer.email,
        username: testBuyer.username,
        full_name: testBuyer.full_name,
        user_type: testBuyer.user_type
      })
      .returning()
      .execute();

    const [creator] = await db.insert(usersTable)
      .values({
        email: testCreator.email,
        username: testCreator.username,
        full_name: testCreator.full_name,
        user_type: testCreator.user_type
      })
      .returning()
      .execute();

    const [category] = await db.insert(categoriesTable)
      .values({
        name: testCategory.name,
        description: testCategory.description
      })
      .returning()
      .execute();

    const [agent] = await db.insert(aiAgentsTable)
      .values({
        creator_id: creator.id,
        name: testAgent.name,
        description: testAgent.description,
        price: testAgent.price.toString(),
        key_features: testAgent.key_features,
        screenshots: testAgent.screenshots,
        category_id: category.id
      })
      .returning()
      .execute();

    // Create purchase
    const [purchase] = await db.insert(purchasesTable)
      .values({
        buyer_id: buyer.id,
        agent_id: agent.id,
        creator_id: creator.id,
        price_paid: '29.99'
      })
      .returning()
      .execute();

    const filter: GetUserPurchasesFilter = {
      user_id: buyer.id
    };

    const result = await getUserPurchases(filter);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: purchase.id,
      buyer_id: buyer.id,
      agent_id: agent.id,
      creator_id: creator.id,
      price_paid: 29.99, // Should be converted to number
      purchase_date: expect.any(Date)
    });

    // Verify numeric conversion
    expect(typeof result[0].price_paid).toBe('number');
    expect(result[0].price_paid).toBe(29.99);
  });

  it('should return multiple purchases for a user', async () => {
    // Create prerequisite data
    const [buyer] = await db.insert(usersTable)
      .values({
        email: testBuyer.email,
        username: testBuyer.username,
        full_name: testBuyer.full_name,
        user_type: testBuyer.user_type
      })
      .returning()
      .execute();

    const [creator] = await db.insert(usersTable)
      .values({
        email: testCreator.email,
        username: testCreator.username,
        full_name: testCreator.full_name,
        user_type: testCreator.user_type
      })
      .returning()
      .execute();

    const [category] = await db.insert(categoriesTable)
      .values({
        name: testCategory.name,
        description: testCategory.description
      })
      .returning()
      .execute();

    // Create two agents
    const [agent1] = await db.insert(aiAgentsTable)
      .values({
        creator_id: creator.id,
        name: 'First Agent',
        description: testAgent.description,
        price: '19.99',
        key_features: testAgent.key_features,
        screenshots: testAgent.screenshots,
        category_id: category.id
      })
      .returning()
      .execute();

    const [agent2] = await db.insert(aiAgentsTable)
      .values({
        creator_id: creator.id,
        name: 'Second Agent',
        description: testAgent.description,
        price: '39.99',
        key_features: testAgent.key_features,
        screenshots: testAgent.screenshots,
        category_id: category.id
      })
      .returning()
      .execute();

    // Create two purchases
    await db.insert(purchasesTable)
      .values([
        {
          buyer_id: buyer.id,
          agent_id: agent1.id,
          creator_id: creator.id,
          price_paid: '19.99'
        },
        {
          buyer_id: buyer.id,
          agent_id: agent2.id,
          creator_id: creator.id,
          price_paid: '39.99'
        }
      ])
      .execute();

    const filter: GetUserPurchasesFilter = {
      user_id: buyer.id
    };

    const result = await getUserPurchases(filter);

    expect(result).toHaveLength(2);

    // Verify both purchases are returned
    const prices = result.map(p => p.price_paid).sort();
    expect(prices).toEqual([19.99, 39.99]);

    // Verify all purchases belong to the buyer
    result.forEach(purchase => {
      expect(purchase.buyer_id).toBe(buyer.id);
      expect(purchase.creator_id).toBe(creator.id);
      expect(typeof purchase.price_paid).toBe('number');
      expect(purchase.purchase_date).toBeInstanceOf(Date);
    });
  });

  it('should not return purchases from other users', async () => {
    // Create two buyers
    const [buyer1] = await db.insert(usersTable)
      .values({
        email: 'buyer1@test.com',
        username: 'buyer1',
        full_name: 'Buyer One',
        user_type: 'buyer'
      })
      .returning()
      .execute();

    const [buyer2] = await db.insert(usersTable)
      .values({
        email: 'buyer2@test.com',
        username: 'buyer2',
        full_name: 'Buyer Two',
        user_type: 'buyer'
      })
      .returning()
      .execute();

    const [creator] = await db.insert(usersTable)
      .values({
        email: testCreator.email,
        username: testCreator.username,
        full_name: testCreator.full_name,
        user_type: testCreator.user_type
      })
      .returning()
      .execute();

    const [category] = await db.insert(categoriesTable)
      .values({
        name: testCategory.name,
        description: testCategory.description
      })
      .returning()
      .execute();

    const [agent] = await db.insert(aiAgentsTable)
      .values({
        creator_id: creator.id,
        name: testAgent.name,
        description: testAgent.description,
        price: testAgent.price.toString(),
        key_features: testAgent.key_features,
        screenshots: testAgent.screenshots,
        category_id: category.id
      })
      .returning()
      .execute();

    // Create purchases for both buyers
    await db.insert(purchasesTable)
      .values([
        {
          buyer_id: buyer1.id,
          agent_id: agent.id,
          creator_id: creator.id,
          price_paid: '29.99'
        },
        {
          buyer_id: buyer2.id,
          agent_id: agent.id,
          creator_id: creator.id,
          price_paid: '29.99'
        }
      ])
      .execute();

    // Get purchases for buyer1 only
    const filter: GetUserPurchasesFilter = {
      user_id: buyer1.id
    };

    const result = await getUserPurchases(filter);

    expect(result).toHaveLength(1);
    expect(result[0].buyer_id).toBe(buyer1.id);
  });

  it('should handle database errors gracefully', async () => {
    const filter: GetUserPurchasesFilter = {
      user_id: -1 // Non-existent user ID
    };

    // This should not throw an error, just return empty array
    const result = await getUserPurchases(filter);
    expect(result).toEqual([]);
  });
});