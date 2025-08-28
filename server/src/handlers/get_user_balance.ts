import { db } from '../db';
import { usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export interface UserBalance {
  user_id: number;
  credit_balance: number;
  total_earned: number;
}

export const getUserBalance = async (userId: number): Promise<UserBalance | null> => {
  try {
    // Query user by ID to get balance information
    const result = await db.select({
      id: usersTable.id,
      credit_balance: usersTable.credit_balance,
      total_earned: usersTable.total_earned
    })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    // Return null if user doesn't exist
    if (result.length === 0) {
      return null;
    }

    const user = result[0];

    // Convert numeric fields from strings to numbers
    return {
      user_id: user.id,
      credit_balance: parseFloat(user.credit_balance),
      total_earned: parseFloat(user.total_earned)
    };
  } catch (error) {
    console.error('Get user balance failed:', error);
    throw error;
  }
};