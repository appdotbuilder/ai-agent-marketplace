import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, creditTransactionsTable } from '../db/schema';
import { type WithdrawCreditsInput } from '../schema';
import { withdrawCredits } from '../handlers/withdraw_credits';
import { eq } from 'drizzle-orm';

// Test input
const testInput: WithdrawCreditsInput = {
  user_id: 1,
  amount: 50.00
};

describe('withdrawCredits', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should successfully withdraw credits from user account', async () => {
    // Create test user with sufficient balance
    const [user] = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        username: 'testuser',
        full_name: 'Test User',
        credit_balance: '100.00',
        total_earned: '100.00',
        user_type: 'creator'
      })
      .returning()
      .execute();

    const result = await withdrawCredits({ ...testInput, user_id: user.id });

    // Verify transaction was created
    expect(result).not.toBeNull();
    expect(result!.user_id).toEqual(user.id);
    expect(result!.transaction_type).toEqual('withdrawal');
    expect(result!.amount).toEqual(50.00);
    expect(typeof result!.amount).toBe('number');
    expect(result!.description).toEqual('Credit withdrawal of $50');
    expect(result!.reference_id).toBeNull();
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.id).toBeDefined();
  });

  it('should update user credit balance correctly', async () => {
    // Create test user with sufficient balance
    const [user] = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        username: 'testuser',
        full_name: 'Test User',
        credit_balance: '75.50',
        total_earned: '75.50',
        user_type: 'creator'
      })
      .returning()
      .execute();

    await withdrawCredits({ ...testInput, user_id: user.id, amount: 25.50 });

    // Verify user balance was updated
    const [updatedUser] = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, user.id))
      .execute();

    expect(parseFloat(updatedUser.credit_balance)).toEqual(50.00);
    expect(updatedUser.updated_at).toBeInstanceOf(Date);
  });

  it('should create withdrawal transaction record in database', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        username: 'testuser',
        full_name: 'Test User',
        credit_balance: '100.00',
        total_earned: '100.00',
        user_type: 'creator'
      })
      .returning()
      .execute();

    const result = await withdrawCredits({ ...testInput, user_id: user.id });

    // Verify transaction exists in database
    const transactions = await db.select()
      .from(creditTransactionsTable)
      .where(eq(creditTransactionsTable.id, result!.id))
      .execute();

    expect(transactions).toHaveLength(1);
    expect(transactions[0].user_id).toEqual(user.id);
    expect(transactions[0].transaction_type).toEqual('withdrawal');
    expect(parseFloat(transactions[0].amount)).toEqual(50.00);
    expect(transactions[0].description).toEqual('Credit withdrawal of $50');
  });

  it('should return null for non-existent user', async () => {
    const result = await withdrawCredits({ ...testInput, user_id: 999 });

    expect(result).toBeNull();
  });

  it('should return null when user has insufficient balance', async () => {
    // Create test user with insufficient balance
    const [user] = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        username: 'testuser',
        full_name: 'Test User',
        credit_balance: '25.00',
        total_earned: '25.00',
        user_type: 'creator'
      })
      .returning()
      .execute();

    const result = await withdrawCredits({ ...testInput, user_id: user.id, amount: 50.00 });

    expect(result).toBeNull();

    // Verify balance wasn't changed
    const [unchangedUser] = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, user.id))
      .execute();

    expect(parseFloat(unchangedUser.credit_balance)).toEqual(25.00);
  });

  it('should handle exact balance withdrawal', async () => {
    // Create test user with exact amount
    const [user] = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        username: 'testuser',
        full_name: 'Test User',
        credit_balance: '30.00',
        total_earned: '30.00',
        user_type: 'creator'
      })
      .returning()
      .execute();

    const result = await withdrawCredits({ ...testInput, user_id: user.id, amount: 30.00 });

    expect(result).not.toBeNull();
    expect(result!.amount).toEqual(30.00);

    // Verify balance is now zero
    const [updatedUser] = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, user.id))
      .execute();

    expect(parseFloat(updatedUser.credit_balance)).toEqual(0.00);
  });

  it('should handle small withdrawal amounts', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        username: 'testuser',
        full_name: 'Test User',
        credit_balance: '10.00',
        total_earned: '10.00',
        user_type: 'creator'
      })
      .returning()
      .execute();

    const result = await withdrawCredits({ ...testInput, user_id: user.id, amount: 0.01 });

    expect(result).not.toBeNull();
    expect(result!.amount).toEqual(0.01);
    expect(result!.description).toEqual('Credit withdrawal of $0.01');

    // Verify balance was reduced correctly
    const [updatedUser] = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, user.id))
      .execute();

    expect(parseFloat(updatedUser.credit_balance)).toEqual(9.99);
  });
});