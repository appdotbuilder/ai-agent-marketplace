import { db } from '../db';
import { usersTable } from '../db/schema';
import { type User } from '../schema';

export const getUsers = async (): Promise<User[]> => {
  try {
    const result = await db.select()
      .from(usersTable)
      .execute();

    // Convert numeric fields back to numbers for schema compliance
    return result.map(user => ({
      ...user,
      credit_balance: parseFloat(user.credit_balance),
      total_earned: parseFloat(user.total_earned)
    }));
  } catch (error) {
    console.error('Failed to fetch users:', error);
    throw error;
  }
};