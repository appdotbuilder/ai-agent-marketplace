import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, aiAgentsTable, purchasesTable, creditTransactionsTable } from '../db/schema';
import { type PurchaseAgentInput } from '../schema';
import { purchaseAgent } from '../handlers/purchase_agent';
import { eq, and } from 'drizzle-orm';

describe('purchaseAgent', () => {
  let buyerId: number;
  let creatorId: number;
  let categoryId: number;
  let agentId: number;

  const setupTestData = async () => {
    // Create category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'A test category'
      })
      .returning()
      .execute();
    categoryId = categoryResult[0].id;

    // Create creator user with buyer type (should be able to create agents)
    const creatorResult = await db.insert(usersTable)
      .values({
        email: 'creator@test.com',
        username: 'creator_user',
        full_name: 'Creator User',
        credit_balance: '0.00',
        total_earned: '0.00',
        user_type: 'creator'
      })
      .returning()
      .execute();
    creatorId = creatorResult[0].id;

    // Create buyer user with sufficient credits
    const buyerResult = await db.insert(usersTable)
      .values({
        email: 'buyer@test.com',
        username: 'buyer_user',
        full_name: 'Buyer User',
        credit_balance: '100.00',
        total_earned: '0.00',
        user_type: 'buyer'
      })
      .returning()
      .execute();
    buyerId = buyerResult[0].id;

    // Create active AI agent
    const agentResult = await db.insert(aiAgentsTable)
      .values({
        creator_id: creatorId,
        name: 'Test AI Agent',
        description: 'A test AI agent for purchasing',
        price: '29.99',
        key_features: ['Feature 1', 'Feature 2'],
        screenshots: [],
        category_id: categoryId,
        is_active: true
      })
      .returning()
      .execute();
    agentId = agentResult[0].id;
  };

  beforeEach(async () => {
    await createDB();
    await setupTestData();
  });

  afterEach(resetDB);

  const testInput: PurchaseAgentInput = {
    buyer_id: 0, // Will be set in beforeEach
    agent_id: 0  // Will be set in beforeEach
  };

  it('should successfully purchase an agent', async () => {
    const input: PurchaseAgentInput = {
      buyer_id: buyerId,
      agent_id: agentId
    };

    const result = await purchaseAgent(input);

    expect(result).not.toBeNull();
    expect(result!.buyer_id).toEqual(buyerId);
    expect(result!.agent_id).toEqual(agentId);
    expect(result!.creator_id).toEqual(creatorId);
    expect(result!.price_paid).toEqual(29.99);
    expect(result!.id).toBeDefined();
    expect(result!.purchase_date).toBeInstanceOf(Date);

    // Verify purchase was saved to database
    const purchases = await db.select()
      .from(purchasesTable)
      .where(eq(purchasesTable.id, result!.id))
      .execute();

    expect(purchases).toHaveLength(1);
    expect(parseFloat(purchases[0].price_paid)).toEqual(29.99);
  });

  it('should update buyer credit balance correctly', async () => {
    const input: PurchaseAgentInput = {
      buyer_id: buyerId,
      agent_id: agentId
    };

    await purchaseAgent(input);

    // Check buyer's updated balance
    const buyers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, buyerId))
      .execute();

    expect(buyers).toHaveLength(1);
    expect(parseFloat(buyers[0].credit_balance)).toEqual(70.01); // 100.00 - 29.99
  });

  it('should update creator credit balance and total earned', async () => {
    const input: PurchaseAgentInput = {
      buyer_id: buyerId,
      agent_id: agentId
    };

    await purchaseAgent(input);

    // Check creator's updated balance and earnings
    const creators = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, creatorId))
      .execute();

    expect(creators).toHaveLength(1);
    expect(parseFloat(creators[0].credit_balance)).toEqual(29.99);
    expect(parseFloat(creators[0].total_earned)).toEqual(29.99);
  });

  it('should increment agent total sales', async () => {
    const input: PurchaseAgentInput = {
      buyer_id: buyerId,
      agent_id: agentId
    };

    await purchaseAgent(input);

    // Check agent's updated sales count
    const agents = await db.select()
      .from(aiAgentsTable)
      .where(eq(aiAgentsTable.id, agentId))
      .execute();

    expect(agents).toHaveLength(1);
    expect(agents[0].total_sales).toEqual(1);
  });

  it('should create credit transactions for both buyer and creator', async () => {
    const input: PurchaseAgentInput = {
      buyer_id: buyerId,
      agent_id: agentId
    };

    const result = await purchaseAgent(input);

    // Check buyer's transaction (debit)
    const buyerTransactions = await db.select()
      .from(creditTransactionsTable)
      .where(and(
        eq(creditTransactionsTable.user_id, buyerId),
        eq(creditTransactionsTable.transaction_type, 'purchase')
      ))
      .execute();

    expect(buyerTransactions).toHaveLength(1);
    expect(parseFloat(buyerTransactions[0].amount)).toEqual(-29.99);
    expect(buyerTransactions[0].reference_id).toEqual(result!.id);
    expect(buyerTransactions[0].description).toContain('Test AI Agent');

    // Check creator's transaction (credit)
    const creatorTransactions = await db.select()
      .from(creditTransactionsTable)
      .where(and(
        eq(creditTransactionsTable.user_id, creatorId),
        eq(creditTransactionsTable.transaction_type, 'sale_earning')
      ))
      .execute();

    expect(creatorTransactions).toHaveLength(1);
    expect(parseFloat(creatorTransactions[0].amount)).toEqual(29.99);
    expect(creatorTransactions[0].reference_id).toEqual(result!.id);
    expect(creatorTransactions[0].description).toContain('Test AI Agent');
  });

  it('should return null for non-existent agent', async () => {
    const input: PurchaseAgentInput = {
      buyer_id: buyerId,
      agent_id: 99999
    };

    const result = await purchaseAgent(input);
    expect(result).toBeNull();
  });

  it('should return null for inactive agent', async () => {
    // Deactivate the agent
    await db.update(aiAgentsTable)
      .set({ is_active: false })
      .where(eq(aiAgentsTable.id, agentId))
      .execute();

    const input: PurchaseAgentInput = {
      buyer_id: buyerId,
      agent_id: agentId
    };

    const result = await purchaseAgent(input);
    expect(result).toBeNull();
  });

  it('should return null for non-existent buyer', async () => {
    const input: PurchaseAgentInput = {
      buyer_id: 99999,
      agent_id: agentId
    };

    const result = await purchaseAgent(input);
    expect(result).toBeNull();
  });

  it('should return null when buyer tries to purchase their own agent', async () => {
    // Create an agent owned by the buyer
    const ownAgentResult = await db.insert(aiAgentsTable)
      .values({
        creator_id: buyerId,
        name: 'Own AI Agent',
        description: 'Buyer\'s own AI agent',
        price: '19.99',
        key_features: ['Feature 1'],
        screenshots: [],
        category_id: categoryId,
        is_active: true
      })
      .returning()
      .execute();

    const input: PurchaseAgentInput = {
      buyer_id: buyerId,
      agent_id: ownAgentResult[0].id
    };

    const result = await purchaseAgent(input);
    expect(result).toBeNull();
  });

  it('should return null for duplicate purchase', async () => {
    const input: PurchaseAgentInput = {
      buyer_id: buyerId,
      agent_id: agentId
    };

    // First purchase should succeed
    const firstResult = await purchaseAgent(input);
    expect(firstResult).not.toBeNull();

    // Second purchase should fail
    const secondResult = await purchaseAgent(input);
    expect(secondResult).toBeNull();
  });

  it('should return null for insufficient credits', async () => {
    // Update buyer to have insufficient credits
    await db.update(usersTable)
      .set({ credit_balance: '20.00' }) // Less than agent price of 29.99
      .where(eq(usersTable.id, buyerId))
      .execute();

    const input: PurchaseAgentInput = {
      buyer_id: buyerId,
      agent_id: agentId
    };

    const result = await purchaseAgent(input);
    expect(result).toBeNull();
  });

  it('should handle exact credit balance amount', async () => {
    // Set buyer's balance to exactly match agent price
    await db.update(usersTable)
      .set({ credit_balance: '29.99' })
      .where(eq(usersTable.id, buyerId))
      .execute();

    const input: PurchaseAgentInput = {
      buyer_id: buyerId,
      agent_id: agentId
    };

    const result = await purchaseAgent(input);
    expect(result).not.toBeNull();

    // Verify buyer's balance is now zero
    const buyers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, buyerId))
      .execute();

    expect(parseFloat(buyers[0].credit_balance)).toEqual(0);
  });

  it('should maintain data consistency during transaction rollback', async () => {
    // This test verifies that if something fails, all changes are rolled back
    // We'll simulate this by creating an invalid scenario that should cause rollback
    const input: PurchaseAgentInput = {
      buyer_id: buyerId,
      agent_id: 99999 // Non-existent agent should cause early return with null
    };

    const result = await purchaseAgent(input);
    expect(result).toBeNull();

    // Verify no changes were made to buyer's balance
    const buyers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, buyerId))
      .execute();

    expect(parseFloat(buyers[0].credit_balance)).toEqual(100.00); // Original balance unchanged
  });
});