import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, creditTransactionsTable } from '../db/schema';
import { type BuyCreditsInput } from '../schema';
import { buyCredits } from '../handlers/buy_credits';
import { eq } from 'drizzle-orm';

describe('buyCredits', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;

  beforeEach(async () => {
    // Create a test user before each test
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        username: 'testuser',
        full_name: 'Test User',
        user_type: 'buyer',
        credit_balance: '100.00',
        total_earned: '0.00'
      })
      .returning()
      .execute();

    testUserId = userResult[0].id;
  });

  it('should successfully purchase credits and update user balance', async () => {
    const input: BuyCreditsInput = {
      user_id: testUserId,
      amount: 50.00,
      payment_method: 'credit_card'
    };

    const result = await buyCredits(input);

    // Verify transaction record was created
    expect(result).toBeDefined();
    expect(result!.user_id).toEqual(testUserId);
    expect(result!.transaction_type).toEqual('purchase');
    expect(result!.amount).toEqual(50.00);
    expect(typeof result!.amount).toEqual('number');
    expect(result!.description).toEqual('Credit purchase via credit_card');
    expect(result!.reference_id).toBeNull();
    expect(result!.id).toBeDefined();
    expect(result!.created_at).toBeInstanceOf(Date);

    // Verify user's credit balance was updated
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, testUserId))
      .execute();

    expect(users).toHaveLength(1);
    expect(parseFloat(users[0].credit_balance)).toEqual(150.00); // 100 + 50
    expect(users[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create transaction record in database', async () => {
    const input: BuyCreditsInput = {
      user_id: testUserId,
      amount: 25.75,
      payment_method: 'paypal'
    };

    const result = await buyCredits(input);

    // Query transaction from database
    const transactions = await db.select()
      .from(creditTransactionsTable)
      .where(eq(creditTransactionsTable.id, result!.id))
      .execute();

    expect(transactions).toHaveLength(1);
    const transaction = transactions[0];
    expect(transaction.user_id).toEqual(testUserId);
    expect(transaction.transaction_type).toEqual('purchase');
    expect(parseFloat(transaction.amount)).toEqual(25.75);
    expect(transaction.description).toEqual('Credit purchase via paypal');
    expect(transaction.created_at).toBeInstanceOf(Date);
  });

  it('should handle different payment methods correctly', async () => {
    const paymentMethods = ['credit_card', 'paypal', 'bank_transfer', 'apple_pay'];

    for (const method of paymentMethods) {
      const input: BuyCreditsInput = {
        user_id: testUserId,
        amount: 10.00,
        payment_method: method
      };

      const result = await buyCredits(input);

      expect(result).toBeDefined();
      expect(result!.description).toEqual(`Credit purchase via ${method}`);
    }

    // Verify total balance increase
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, testUserId))
      .execute();

    expect(parseFloat(users[0].credit_balance)).toEqual(140.00); // 100 + (4 * 10)
  });

  it('should handle decimal amounts correctly', async () => {
    const input: BuyCreditsInput = {
      user_id: testUserId,
      amount: 123.45,
      payment_method: 'credit_card'
    };

    const result = await buyCredits(input);

    expect(result).toBeDefined();
    expect(result!.amount).toEqual(123.45);

    // Check user balance
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, testUserId))
      .execute();

    expect(parseFloat(users[0].credit_balance)).toEqual(223.45); // 100 + 123.45
  });

  it('should throw error for non-existent user', async () => {
    const input: BuyCreditsInput = {
      user_id: 99999, // Non-existent user
      amount: 50.00,
      payment_method: 'credit_card'
    };

    await expect(buyCredits(input)).rejects.toThrow(/User with id 99999 not found/);
  });

  it('should maintain data consistency during concurrent purchases', async () => {
    const input1: BuyCreditsInput = {
      user_id: testUserId,
      amount: 25.00,
      payment_method: 'credit_card'
    };

    const input2: BuyCreditsInput = {
      user_id: testUserId,
      amount: 75.00,
      payment_method: 'paypal'
    };

    // Execute both purchases concurrently
    const [result1, result2] = await Promise.all([
      buyCredits(input1),
      buyCredits(input2)
    ]);

    expect(result1).toBeDefined();
    expect(result2).toBeDefined();

    // Check final balance
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, testUserId))
      .execute();

    expect(parseFloat(users[0].credit_balance)).toEqual(200.00); // 100 + 25 + 75

    // Check both transactions were recorded
    const transactions = await db.select()
      .from(creditTransactionsTable)
      .where(eq(creditTransactionsTable.user_id, testUserId))
      .execute();

    expect(transactions).toHaveLength(2);
    const amounts = transactions.map(t => parseFloat(t.amount)).sort();
    expect(amounts).toEqual([25.00, 75.00]);
  });

  it('should preserve existing user data when updating balance', async () => {
    // Update user with additional data first
    await db.update(usersTable)
      .set({
        total_earned: '250.50',
        user_type: 'both'
      })
      .where(eq(usersTable.id, testUserId))
      .execute();

    const input: BuyCreditsInput = {
      user_id: testUserId,
      amount: 30.00,
      payment_method: 'credit_card'
    };

    await buyCredits(input);

    // Verify other user data was preserved
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, testUserId))
      .execute();

    const user = users[0];
    expect(parseFloat(user.credit_balance)).toEqual(130.00); // Updated
    expect(parseFloat(user.total_earned)).toEqual(250.50); // Preserved
    expect(user.user_type).toEqual('both'); // Preserved
    expect(user.email).toEqual('test@example.com'); // Preserved
    expect(user.username).toEqual('testuser'); // Preserved
  });
});