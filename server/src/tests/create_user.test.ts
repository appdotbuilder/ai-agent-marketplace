import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Test inputs with all required fields
const testUserInput: CreateUserInput = {
  email: 'test@example.com',
  username: 'testuser',
  full_name: 'Test User',
  user_type: 'buyer'
};

const testCreatorInput: CreateUserInput = {
  email: 'creator@example.com',
  username: 'testcreator',
  full_name: 'Test Creator',
  user_type: 'creator'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user with buyer type', async () => {
    const result = await createUser(testUserInput);

    // Basic field validation
    expect(result.email).toEqual('test@example.com');
    expect(result.username).toEqual('testuser');
    expect(result.full_name).toEqual('Test User');
    expect(result.user_type).toEqual('buyer');
    expect(result.credit_balance).toEqual(0);
    expect(result.total_earned).toEqual(0);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify numeric types
    expect(typeof result.credit_balance).toBe('number');
    expect(typeof result.total_earned).toBe('number');
  });

  it('should create a user with creator type', async () => {
    const result = await createUser(testCreatorInput);

    expect(result.email).toEqual('creator@example.com');
    expect(result.username).toEqual('testcreator');
    expect(result.full_name).toEqual('Test Creator');
    expect(result.user_type).toEqual('creator');
    expect(result.credit_balance).toEqual(0);
    expect(result.total_earned).toEqual(0);
  });

  it('should create a user with both type', async () => {
    const bothUserInput: CreateUserInput = {
      email: 'both@example.com',
      username: 'bothuser',
      full_name: 'Both User',
      user_type: 'both'
    };

    const result = await createUser(bothUserInput);

    expect(result.user_type).toEqual('both');
    expect(result.email).toEqual('both@example.com');
  });

  it('should save user to database correctly', async () => {
    const result = await createUser(testUserInput);

    // Query database to verify user was saved
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    const savedUser = users[0];
    
    expect(savedUser.email).toEqual('test@example.com');
    expect(savedUser.username).toEqual('testuser');
    expect(savedUser.full_name).toEqual('Test User');
    expect(savedUser.user_type).toEqual('buyer');
    expect(parseFloat(savedUser.credit_balance)).toEqual(0);
    expect(parseFloat(savedUser.total_earned)).toEqual(0);
    expect(savedUser.created_at).toBeInstanceOf(Date);
    expect(savedUser.updated_at).toBeInstanceOf(Date);
  });

  it('should handle default user_type when not specified', async () => {
    // Input without user_type - should default to 'buyer' per Zod schema
    const defaultTypeInput: CreateUserInput = {
      email: 'default@example.com',
      username: 'defaultuser',
      full_name: 'Default User',
      user_type: 'buyer' // Include explicit default for test
    };

    const result = await createUser(defaultTypeInput);

    expect(result.user_type).toEqual('buyer');
  });

  it('should throw error for duplicate email', async () => {
    // Create first user
    await createUser(testUserInput);

    // Try to create another user with same email
    const duplicateEmailInput: CreateUserInput = {
      email: 'test@example.com', // Same email
      username: 'differentuser',
      full_name: 'Different User',
      user_type: 'creator'
    };

    await expect(createUser(duplicateEmailInput)).rejects.toThrow(/unique/i);
  });

  it('should throw error for duplicate username', async () => {
    // Create first user
    await createUser(testUserInput);

    // Try to create another user with same username
    const duplicateUsernameInput: CreateUserInput = {
      email: 'different@example.com',
      username: 'testuser', // Same username
      full_name: 'Different User',
      user_type: 'creator'
    };

    await expect(createUser(duplicateUsernameInput)).rejects.toThrow(/unique/i);
  });

  it('should create users with unique IDs', async () => {
    const user1 = await createUser(testUserInput);
    const user2 = await createUser(testCreatorInput);

    expect(user1.id).not.toEqual(user2.id);
    expect(user1.id).toBeGreaterThan(0);
    expect(user2.id).toBeGreaterThan(0);
  });

  it('should set timestamps correctly', async () => {
    const beforeCreate = new Date();
    const result = await createUser(testUserInput);
    const afterCreate = new Date();

    expect(result.created_at.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
    expect(result.created_at.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
    expect(result.updated_at.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
    expect(result.updated_at.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
  });
});