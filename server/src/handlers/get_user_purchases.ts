import { db } from '../db';
import { purchasesTable, aiAgentsTable, usersTable } from '../db/schema';
import { type GetUserPurchasesFilter, type Purchase } from '../schema';
import { eq } from 'drizzle-orm';

export const getUserPurchases = async (filter: GetUserPurchasesFilter): Promise<Purchase[]> => {
  try {
    // Query purchases with joined agent and creator data
    const results = await db.select()
      .from(purchasesTable)
      .innerJoin(aiAgentsTable, eq(purchasesTable.agent_id, aiAgentsTable.id))
      .innerJoin(usersTable, eq(purchasesTable.creator_id, usersTable.id))
      .where(eq(purchasesTable.buyer_id, filter.user_id))
      .execute();

    // Map results to Purchase type with proper numeric conversions
    return results.map(result => ({
      id: result.purchases.id,
      buyer_id: result.purchases.buyer_id,
      agent_id: result.purchases.agent_id,
      creator_id: result.purchases.creator_id,
      price_paid: parseFloat(result.purchases.price_paid), // Convert numeric to number
      purchase_date: result.purchases.purchase_date
    }));
  } catch (error) {
    console.error('Failed to fetch user purchases:', error);
    throw error;
  }
};