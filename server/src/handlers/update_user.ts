import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UpdateUserInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export const updateUser = async (input: UpdateUserInput): Promise<User | null> => {
  try {
    const { id, ...updateData } = input;

    // Check if user exists first
    const existingUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, id))
      .execute();

    if (existingUser.length === 0) {
      return null;
    }

    // Build update object with only provided fields
    const updateFields: Partial<typeof usersTable.$inferInsert> = {};
    
    if (updateData.email !== undefined) {
      updateFields.email = updateData.email;
    }
    if (updateData.username !== undefined) {
      updateFields.username = updateData.username;
    }
    if (updateData.full_name !== undefined) {
      updateFields.full_name = updateData.full_name;
    }
    if (updateData.user_type !== undefined) {
      updateFields.user_type = updateData.user_type;
    }

    // Add updated_at timestamp
    updateFields.updated_at = new Date();

    // Perform update
    const result = await db.update(usersTable)
      .set(updateFields)
      .where(eq(usersTable.id, id))
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const updatedUser = result[0];
    return {
      ...updatedUser,
      credit_balance: parseFloat(updatedUser.credit_balance),
      total_earned: parseFloat(updatedUser.total_earned)
    };
  } catch (error) {
    console.error('User update failed:', error);
    throw error;
  }
};