import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UpdateUserInput, type CreateUserInput } from '../schema';
import { updateUser } from '../handlers/update_user';
import { eq } from 'drizzle-orm';

// Test user data
const testUserInput: CreateUserInput = {
  email: 'test@example.com',
  username: 'testuser',
  full_name: 'Test User',
  user_type: 'buyer'
};

const createTestUser = async () => {
  const result = await db.insert(usersTable)
    .values({
      ...testUserInput,
      credit_balance: '0',
      total_earned: '0'
    })
    .returning()
    .execute();
  
  return {
    ...result[0],
    credit_balance: parseFloat(result[0].credit_balance),
    total_earned: parseFloat(result[0].total_earned)
  };
};

describe('updateUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update user email', async () => {
    const user = await createTestUser();
    
    const updateInput: UpdateUserInput = {
      id: user.id,
      email: 'newemail@example.com'
    };

    const result = await updateUser(updateInput);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(user.id);
    expect(result!.email).toEqual('newemail@example.com');
    expect(result!.username).toEqual(user.username); // Unchanged
    expect(result!.full_name).toEqual(user.full_name); // Unchanged
    expect(result!.user_type).toEqual(user.user_type); // Unchanged
    expect(result!.updated_at > user.updated_at).toBe(true);
  });

  it('should update user username', async () => {
    const user = await createTestUser();
    
    const updateInput: UpdateUserInput = {
      id: user.id,
      username: 'newusername'
    };

    const result = await updateUser(updateInput);

    expect(result).not.toBeNull();
    expect(result!.username).toEqual('newusername');
    expect(result!.email).toEqual(user.email); // Unchanged
  });

  it('should update user full_name', async () => {
    const user = await createTestUser();
    
    const updateInput: UpdateUserInput = {
      id: user.id,
      full_name: 'New Full Name'
    };

    const result = await updateUser(updateInput);

    expect(result).not.toBeNull();
    expect(result!.full_name).toEqual('New Full Name');
    expect(result!.email).toEqual(user.email); // Unchanged
  });

  it('should update user type', async () => {
    const user = await createTestUser();
    
    const updateInput: UpdateUserInput = {
      id: user.id,
      user_type: 'creator'
    };

    const result = await updateUser(updateInput);

    expect(result).not.toBeNull();
    expect(result!.user_type).toEqual('creator');
    expect(result!.email).toEqual(user.email); // Unchanged
  });

  it('should update multiple fields at once', async () => {
    const user = await createTestUser();
    
    const updateInput: UpdateUserInput = {
      id: user.id,
      email: 'updated@example.com',
      username: 'updateduser',
      full_name: 'Updated User Name',
      user_type: 'both'
    };

    const result = await updateUser(updateInput);

    expect(result).not.toBeNull();
    expect(result!.email).toEqual('updated@example.com');
    expect(result!.username).toEqual('updateduser');
    expect(result!.full_name).toEqual('Updated User Name');
    expect(result!.user_type).toEqual('both');
    expect(result!.updated_at > user.updated_at).toBe(true);
  });

  it('should save changes to database', async () => {
    const user = await createTestUser();
    
    const updateInput: UpdateUserInput = {
      id: user.id,
      email: 'verified@example.com'
    };

    await updateUser(updateInput);

    // Verify in database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, user.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual('verified@example.com');
  });

  it('should return null for non-existent user', async () => {
    const updateInput: UpdateUserInput = {
      id: 999, // Non-existent ID
      email: 'nonexistent@example.com'
    };

    const result = await updateUser(updateInput);

    expect(result).toBeNull();
  });

  it('should preserve numeric field types', async () => {
    const user = await createTestUser();
    
    const updateInput: UpdateUserInput = {
      id: user.id,
      username: 'numerictest'
    };

    const result = await updateUser(updateInput);

    expect(result).not.toBeNull();
    expect(typeof result!.credit_balance).toBe('number');
    expect(typeof result!.total_earned).toBe('number');
    expect(result!.credit_balance).toEqual(0);
    expect(result!.total_earned).toEqual(0);
  });

  it('should handle unique constraint violations', async () => {
    // Create two users
    const user1 = await createTestUser();
    
    const user2Input = {
      ...testUserInput,
      email: 'user2@example.com',
      username: 'user2'
    };
    
    const user2Result = await db.insert(usersTable)
      .values({
        ...user2Input,
        credit_balance: '0',
        total_earned: '0'
      })
      .returning()
      .execute();
    
    const user2 = {
      ...user2Result[0],
      credit_balance: parseFloat(user2Result[0].credit_balance),
      total_earned: parseFloat(user2Result[0].total_earned)
    };

    // Try to update user2 with user1's email (should fail)
    const updateInput: UpdateUserInput = {
      id: user2.id,
      email: user1.email // This should violate unique constraint
    };

    await expect(updateUser(updateInput)).rejects.toThrow(/duplicate key value violates unique constraint|UNIQUE constraint failed/i);
  });

  it('should handle partial updates correctly', async () => {
    const user = await createTestUser();
    
    // Update only username
    const updateInput: UpdateUserInput = {
      id: user.id,
      username: 'partialupdate'
    };

    const result = await updateUser(updateInput);

    expect(result).not.toBeNull();
    expect(result!.username).toEqual('partialupdate');
    // All other fields should remain unchanged
    expect(result!.email).toEqual(user.email);
    expect(result!.full_name).toEqual(user.full_name);
    expect(result!.user_type).toEqual(user.user_type);
    expect(result!.credit_balance).toEqual(user.credit_balance);
    expect(result!.total_earned).toEqual(user.total_earned);
  });
});