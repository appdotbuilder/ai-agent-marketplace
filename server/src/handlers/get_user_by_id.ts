import { db } from '../db';
import { usersTable } from '../db/schema';
import { type User } from '../schema';
import { eq } from 'drizzle-orm';

export const getUserById = async (id: number): Promise<User | null> => {
  try {
    const result = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, id))
      .execute();

    if (result.length === 0) {
      return null;
    }

    const user = result[0];
    
    // Convert numeric fields back to numbers
    return {
      ...user,
      credit_balance: parseFloat(user.credit_balance),
      total_earned: parseFloat(user.total_earned)
    };
  } catch (error) {
    console.error('Failed to fetch user by id:', error);
    throw error;
  }
};