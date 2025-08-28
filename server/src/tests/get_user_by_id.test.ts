import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { getUserById } from '../handlers/get_user_by_id';

// Test user data
const testUser: CreateUserInput = {
  email: 'test@example.com',
  username: 'testuser',
  full_name: 'Test User',
  user_type: 'creator'
};

const anotherTestUser: CreateUserInput = {
  email: 'another@example.com',
  username: 'anotheruser',
  full_name: 'Another User',
  user_type: 'buyer'
};

describe('getUserById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return user when id exists', async () => {
    // Create test user
    const insertResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        username: testUser.username,
        full_name: testUser.full_name,
        user_type: testUser.user_type,
        credit_balance: '25.50',
        total_earned: '100.75'
      })
      .returning()
      .execute();

    const createdUser = insertResult[0];
    
    // Fetch user by ID
    const result = await getUserById(createdUser.id);

    // Verify user data
    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdUser.id);
    expect(result!.email).toEqual('test@example.com');
    expect(result!.username).toEqual('testuser');
    expect(result!.full_name).toEqual('Test User');
    expect(result!.user_type).toEqual('creator');
    expect(result!.credit_balance).toEqual(25.50);
    expect(result!.total_earned).toEqual(100.75);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when user does not exist', async () => {
    const result = await getUserById(999);
    
    expect(result).toBeNull();
  });

  it('should handle numeric conversion correctly', async () => {
    // Create user with specific numeric values
    const insertResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        username: testUser.username,
        full_name: testUser.full_name,
        user_type: testUser.user_type,
        credit_balance: '0.00',
        total_earned: '999.99'
      })
      .returning()
      .execute();

    const createdUser = insertResult[0];
    const result = await getUserById(createdUser.id);

    expect(result).not.toBeNull();
    expect(typeof result!.credit_balance).toBe('number');
    expect(typeof result!.total_earned).toBe('number');
    expect(result!.credit_balance).toEqual(0.00);
    expect(result!.total_earned).toEqual(999.99);
  });

  it('should return correct user when multiple users exist', async () => {
    // Create first user
    const firstUserResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        username: testUser.username,
        full_name: testUser.full_name,
        user_type: testUser.user_type,
        credit_balance: '50.00',
        total_earned: '200.00'
      })
      .returning()
      .execute();

    // Create second user
    const secondUserResult = await db.insert(usersTable)
      .values({
        email: anotherTestUser.email,
        username: anotherTestUser.username,
        full_name: anotherTestUser.full_name,
        user_type: anotherTestUser.user_type,
        credit_balance: '75.25',
        total_earned: '150.50'
      })
      .returning()
      .execute();

    const firstUser = firstUserResult[0];
    const secondUser = secondUserResult[0];

    // Fetch first user
    const result1 = await getUserById(firstUser.id);
    expect(result1).not.toBeNull();
    expect(result1!.username).toEqual('testuser');
    expect(result1!.email).toEqual('test@example.com');
    expect(result1!.user_type).toEqual('creator');
    expect(result1!.credit_balance).toEqual(50.00);

    // Fetch second user
    const result2 = await getUserById(secondUser.id);
    expect(result2).not.toBeNull();
    expect(result2!.username).toEqual('anotheruser');
    expect(result2!.email).toEqual('another@example.com');
    expect(result2!.user_type).toEqual('buyer');
    expect(result2!.credit_balance).toEqual(75.25);
  });

  it('should handle zero values correctly', async () => {
    // Create user with zero credit balance and earnings
    const insertResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        username: testUser.username,
        full_name: testUser.full_name,
        user_type: testUser.user_type
        // credit_balance and total_earned will default to '0'
      })
      .returning()
      .execute();

    const createdUser = insertResult[0];
    const result = await getUserById(createdUser.id);

    expect(result).not.toBeNull();
    expect(result!.credit_balance).toEqual(0);
    expect(result!.total_earned).toEqual(0);
    expect(typeof result!.credit_balance).toBe('number');
    expect(typeof result!.total_earned).toBe('number');
  });
});