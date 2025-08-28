import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { getUsers } from '../handlers/get_users';

// Test user data
const testUsers: CreateUserInput[] = [
  {
    email: 'john.creator@example.com',
    username: 'john_creator',
    full_name: 'John Creator',
    user_type: 'creator'
  },
  {
    email: 'jane.buyer@example.com',
    username: 'jane_buyer',
    full_name: 'Jane Buyer',
    user_type: 'buyer'
  },
  {
    email: 'bob.both@example.com',
    username: 'bob_both',
    full_name: 'Bob Both',
    user_type: 'both'
  }
];

describe('getUsers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no users exist', async () => {
    const result = await getUsers();

    expect(result).toEqual([]);
  });

  it('should return all users with correct data types', async () => {
    // Create test users
    await db.insert(usersTable)
      .values(testUsers.map(user => ({
        ...user,
        credit_balance: '100.50',
        total_earned: '250.75'
      })))
      .execute();

    const result = await getUsers();

    expect(result).toHaveLength(3);

    // Verify first user details and data types
    const firstUser = result.find(u => u.email === 'john.creator@example.com');
    expect(firstUser).toBeDefined();
    expect(firstUser!.username).toEqual('john_creator');
    expect(firstUser!.full_name).toEqual('John Creator');
    expect(firstUser!.user_type).toEqual('creator');
    expect(firstUser!.credit_balance).toEqual(100.5);
    expect(firstUser!.total_earned).toEqual(250.75);
    expect(typeof firstUser!.credit_balance).toEqual('number');
    expect(typeof firstUser!.total_earned).toEqual('number');
    expect(firstUser!.id).toBeDefined();
    expect(firstUser!.created_at).toBeInstanceOf(Date);
    expect(firstUser!.updated_at).toBeInstanceOf(Date);
  });

  it('should return users with different user types', async () => {
    // Create test users
    await db.insert(usersTable)
      .values(testUsers)
      .execute();

    const result = await getUsers();

    const userTypes = result.map(u => u.user_type);
    expect(userTypes).toContain('creator');
    expect(userTypes).toContain('buyer');
    expect(userTypes).toContain('both');
  });

  it('should return users with default numeric values', async () => {
    // Create a user without specifying credit amounts (should get defaults)
    await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        username: 'test_user',
        full_name: 'Test User',
        user_type: 'buyer'
      })
      .execute();

    const result = await getUsers();

    expect(result).toHaveLength(1);
    expect(result[0].credit_balance).toEqual(0);
    expect(result[0].total_earned).toEqual(0);
    expect(typeof result[0].credit_balance).toEqual('number');
    expect(typeof result[0].total_earned).toEqual('number');
  });

  it('should handle users with various credit amounts correctly', async () => {
    // Create users with different credit amounts
    await db.insert(usersTable)
      .values([
        {
          email: 'user1@example.com',
          username: 'user1',
          full_name: 'User One',
          user_type: 'buyer',
          credit_balance: '999.99',
          total_earned: '0.01'
        },
        {
          email: 'user2@example.com',
          username: 'user2',
          full_name: 'User Two',
          user_type: 'creator',
          credit_balance: '0.00',
          total_earned: '5000.00'
        }
      ])
      .execute();

    const result = await getUsers();

    expect(result).toHaveLength(2);

    const user1 = result.find(u => u.username === 'user1');
    const user2 = result.find(u => u.username === 'user2');

    expect(user1!.credit_balance).toEqual(999.99);
    expect(user1!.total_earned).toEqual(0.01);
    expect(user2!.credit_balance).toEqual(0);
    expect(user2!.total_earned).toEqual(5000);
  });

  it('should preserve all user fields from database', async () => {
    await db.insert(usersTable)
      .values({
        email: 'complete@example.com',
        username: 'complete_user',
        full_name: 'Complete User',
        user_type: 'both',
        credit_balance: '123.45',
        total_earned: '678.90'
      })
      .execute();

    const result = await getUsers();

    expect(result).toHaveLength(1);
    const user = result[0];

    // Check all required fields are present
    expect(user.id).toBeDefined();
    expect(user.email).toEqual('complete@example.com');
    expect(user.username).toEqual('complete_user');
    expect(user.full_name).toEqual('Complete User');
    expect(user.user_type).toEqual('both');
    expect(user.credit_balance).toEqual(123.45);
    expect(user.total_earned).toEqual(678.90);
    expect(user.created_at).toBeInstanceOf(Date);
    expect(user.updated_at).toBeInstanceOf(Date);
  });
});