import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { getUserBalance } from '../handlers/get_user_balance';

describe('getUserBalance', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return user balance for existing user', async () => {
    // Create test user with specific balance values
    const testUser = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        username: 'testuser',
        full_name: 'Test User',
        credit_balance: '150.75',
        total_earned: '500.25',
        user_type: 'creator'
      })
      .returning()
      .execute();

    const userId = testUser[0].id;

    const result = await getUserBalance(userId);

    expect(result).not.toBeNull();
    expect(result!.user_id).toBe(userId);
    expect(result!.credit_balance).toBe(150.75);
    expect(result!.total_earned).toBe(500.25);
    expect(typeof result!.credit_balance).toBe('number');
    expect(typeof result!.total_earned).toBe('number');
  });

  it('should return null for non-existent user', async () => {
    const result = await getUserBalance(999999);

    expect(result).toBeNull();
  });

  it('should handle zero balances correctly', async () => {
    // Create user with zero balances (default values)
    const testUser = await db.insert(usersTable)
      .values({
        email: 'zero@example.com',
        username: 'zerouser',
        full_name: 'Zero User',
        user_type: 'buyer'
        // credit_balance and total_earned will use default '0' values
      })
      .returning()
      .execute();

    const userId = testUser[0].id;

    const result = await getUserBalance(userId);

    expect(result).not.toBeNull();
    expect(result!.user_id).toBe(userId);
    expect(result!.credit_balance).toBe(0);
    expect(result!.total_earned).toBe(0);
    expect(typeof result!.credit_balance).toBe('number');
    expect(typeof result!.total_earned).toBe('number');
  });

  it('should handle decimal precision correctly', async () => {
    // Create user with precise decimal values
    const testUser = await db.insert(usersTable)
      .values({
        email: 'precise@example.com',
        username: 'preciseuser',
        full_name: 'Precise User',
        credit_balance: '99.99',
        total_earned: '1234.56',
        user_type: 'both'
      })
      .returning()
      .execute();

    const userId = testUser[0].id;

    const result = await getUserBalance(userId);

    expect(result).not.toBeNull();
    expect(result!.credit_balance).toBe(99.99);
    expect(result!.total_earned).toBe(1234.56);
  });

  it('should handle large numbers correctly', async () => {
    // Create user with large balance values
    const testUser = await db.insert(usersTable)
      .values({
        email: 'wealthy@example.com',
        username: 'wealthyuser',
        full_name: 'Wealthy User',
        credit_balance: '12345678.90',
        total_earned: '98765432.10',
        user_type: 'creator'
      })
      .returning()
      .execute();

    const userId = testUser[0].id;

    const result = await getUserBalance(userId);

    expect(result).not.toBeNull();
    expect(result!.credit_balance).toBe(12345678.90);
    expect(result!.total_earned).toBe(98765432.10);
    expect(typeof result!.credit_balance).toBe('number');
    expect(typeof result!.total_earned).toBe('number');
  });
});