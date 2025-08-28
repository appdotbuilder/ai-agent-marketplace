import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, aiAgentsTable, purchasesTable } from '../db/schema';
import { type GetUserSalesFilter } from '../schema';
import { getUserSales } from '../handlers/get_user_sales';

// Test data setup
const createTestCreator = async () => {
  const result = await db.insert(usersTable)
    .values({
      email: 'creator@test.com',
      username: 'testcreator',
      full_name: 'Test Creator',
      user_type: 'creator'
    })
    .returning()
    .execute();
  return result[0];
};

const createTestBuyer = async () => {
  const result = await db.insert(usersTable)
    .values({
      email: 'buyer@test.com',
      username: 'testbuyer',
      full_name: 'Test Buyer',
      user_type: 'buyer'
    })
    .returning()
    .execute();
  return result[0];
};

const createTestCategory = async () => {
  const result = await db.insert(categoriesTable)
    .values({
      name: 'Test Category',
      description: 'A category for testing'
    })
    .returning()
    .execute();
  return result[0];
};

const createTestAgent = async (creatorId: number, categoryId: number) => {
  const result = await db.insert(aiAgentsTable)
    .values({
      creator_id: creatorId,
      name: 'Test AI Agent',
      description: 'A test AI agent for testing purchases',
      price: '29.99',
      key_features: ['Feature 1', 'Feature 2'],
      screenshots: ['screenshot1.jpg'],
      category_id: categoryId
    })
    .returning()
    .execute();
  return result[0];
};

const createTestPurchase = async (buyerId: number, agentId: number, creatorId: number, pricePaid: number) => {
  const result = await db.insert(purchasesTable)
    .values({
      buyer_id: buyerId,
      agent_id: agentId,
      creator_id: creatorId,
      price_paid: pricePaid.toString()
    })
    .returning()
    .execute();
  return result[0];
};

describe('getUserSales', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return sales for a specific creator', async () => {
    // Setup test data
    const creator = await createTestCreator();
    const buyer = await createTestBuyer();
    const category = await createTestCategory();
    const agent = await createTestAgent(creator.id, category.id);
    
    // Create a purchase (sale from creator's perspective)
    const purchase = await createTestPurchase(buyer.id, agent.id, creator.id, 29.99);

    const filter: GetUserSalesFilter = { creator_id: creator.id };
    const result = await getUserSales(filter);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(purchase.id);
    expect(result[0].buyer_id).toBe(buyer.id);
    expect(result[0].agent_id).toBe(agent.id);
    expect(result[0].creator_id).toBe(creator.id);
    expect(result[0].price_paid).toBe(29.99);
    expect(typeof result[0].price_paid).toBe('number');
    expect(result[0].purchase_date).toBeInstanceOf(Date);
  });

  it('should return multiple sales for a creator', async () => {
    // Setup test data
    const creator = await createTestCreator();
    const buyer1 = await createTestBuyer();
    const buyer2 = await db.insert(usersTable)
      .values({
        email: 'buyer2@test.com',
        username: 'testbuyer2',
        full_name: 'Test Buyer 2',
        user_type: 'buyer'
      })
      .returning()
      .execute();
    
    const category = await createTestCategory();
    const agent1 = await createTestAgent(creator.id, category.id);
    const agent2 = await db.insert(aiAgentsTable)
      .values({
        creator_id: creator.id,
        name: 'Second AI Agent',
        description: 'Another test AI agent',
        price: '19.99',
        key_features: ['Feature A', 'Feature B'],
        screenshots: ['screenshot2.jpg'],
        category_id: category.id
      })
      .returning()
      .execute();

    // Create multiple purchases
    await createTestPurchase(buyer1.id, agent1.id, creator.id, 29.99);
    await createTestPurchase(buyer2[0].id, agent2[0].id, creator.id, 19.99);

    const filter: GetUserSalesFilter = { creator_id: creator.id };
    const result = await getUserSales(filter);

    expect(result).toHaveLength(2);
    
    // Verify both sales are present
    const prices = result.map(sale => sale.price_paid).sort();
    expect(prices).toEqual([19.99, 29.99]);
    
    // Verify all sales belong to the creator
    result.forEach(sale => {
      expect(sale.creator_id).toBe(creator.id);
      expect(typeof sale.price_paid).toBe('number');
    });
  });

  it('should return empty array when creator has no sales', async () => {
    // Create a creator but no purchases
    const creator = await createTestCreator();

    const filter: GetUserSalesFilter = { creator_id: creator.id };
    const result = await getUserSales(filter);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return empty array for non-existent creator', async () => {
    const filter: GetUserSalesFilter = { creator_id: 999 };
    const result = await getUserSales(filter);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should only return sales for the specified creator', async () => {
    // Setup two creators
    const creator1 = await createTestCreator();
    const creator2 = await db.insert(usersTable)
      .values({
        email: 'creator2@test.com',
        username: 'testcreator2',
        full_name: 'Test Creator 2',
        user_type: 'creator'
      })
      .returning()
      .execute();
    
    const buyer = await createTestBuyer();
    const category = await createTestCategory();
    
    // Create agents for both creators
    const agent1 = await createTestAgent(creator1.id, category.id);
    const agent2 = await db.insert(aiAgentsTable)
      .values({
        creator_id: creator2[0].id,
        name: 'Creator 2 Agent',
        description: 'Agent by second creator',
        price: '39.99',
        key_features: ['Feature X', 'Feature Y'],
        screenshots: ['screenshot3.jpg'],
        category_id: category.id
      })
      .returning()
      .execute();

    // Create purchases for both creators
    await createTestPurchase(buyer.id, agent1.id, creator1.id, 29.99);
    await createTestPurchase(buyer.id, agent2[0].id, creator2[0].id, 39.99);

    // Query sales for creator1 only
    const filter: GetUserSalesFilter = { creator_id: creator1.id };
    const result = await getUserSales(filter);

    expect(result).toHaveLength(1);
    expect(result[0].creator_id).toBe(creator1.id);
    expect(result[0].price_paid).toBe(29.99);
  });

  it('should handle numeric price conversion correctly', async () => {
    // Setup test data
    const creator = await createTestCreator();
    const buyer = await createTestBuyer();
    const category = await createTestCategory();
    const agent = await createTestAgent(creator.id, category.id);
    
    // Create purchase with precise decimal amount
    await createTestPurchase(buyer.id, agent.id, creator.id, 123.45);

    const filter: GetUserSalesFilter = { creator_id: creator.id };
    const result = await getUserSales(filter);

    expect(result).toHaveLength(1);
    expect(result[0].price_paid).toBe(123.45);
    expect(typeof result[0].price_paid).toBe('number');
    
    // Verify precision is maintained
    expect(result[0].price_paid.toFixed(2)).toBe('123.45');
  });
});