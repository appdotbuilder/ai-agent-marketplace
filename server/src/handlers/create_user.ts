import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type User } from '../schema';

export const createUser = async (input: CreateUserInput): Promise<User> => {
  try {
    // Insert user record
    const result = await db.insert(usersTable)
      .values({
        email: input.email,
        username: input.username,
        full_name: input.full_name,
        user_type: input.user_type,
        credit_balance: '0.00', // Convert to string for numeric column
        total_earned: '0.00'    // Convert to string for numeric column
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const user = result[0];
    return {
      ...user,
      credit_balance: parseFloat(user.credit_balance), // Convert string back to number
      total_earned: parseFloat(user.total_earned)      // Convert string back to number
    };
  } catch (error) {
    console.error('User creation failed:', error);
    throw error;
  }
};