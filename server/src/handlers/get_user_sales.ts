import { db } from '../db';
import { purchasesTable } from '../db/schema';
import { type GetUserSalesFilter, type Purchase } from '../schema';
import { eq } from 'drizzle-orm';

export const getUserSales = async (filter: GetUserSalesFilter): Promise<Purchase[]> => {
  try {
    // Fetch all purchases where the current user is the creator (seller)
    const results = await db.select()
      .from(purchasesTable)
      .where(eq(purchasesTable.creator_id, filter.creator_id))
      .execute();

    // Convert numeric fields from string to number
    return results.map(purchase => ({
      ...purchase,
      price_paid: parseFloat(purchase.price_paid) // Convert numeric field
    }));
  } catch (error) {
    console.error('Failed to fetch user sales:', error);
    throw error;
  }
};