import { db } from '../db';
import { creditTransactionsTable } from '../db/schema';
import { type GetCreditTransactionsFilter, type CreditTransaction } from '../schema';
import { eq, and, desc, type SQL } from 'drizzle-orm';

export const getCreditTransactions = async (filter: GetCreditTransactionsFilter): Promise<CreditTransaction[]> => {
  try {
    // Build conditions array
    const conditions: SQL<unknown>[] = [];
    
    // Always filter by user_id (required field)
    conditions.push(eq(creditTransactionsTable.user_id, filter.user_id));
    
    // Add optional transaction type filter
    if (filter.transaction_type) {
      conditions.push(eq(creditTransactionsTable.transaction_type, filter.transaction_type));
    }

    // Build and execute query
    const results = await db.select()
      .from(creditTransactionsTable)
      .where(conditions.length === 1 ? conditions[0] : and(...conditions))
      .orderBy(desc(creditTransactionsTable.created_at))
      .execute();

    // Convert numeric fields back to numbers
    return results.map(transaction => ({
      ...transaction,
      amount: parseFloat(transaction.amount)
    }));
  } catch (error) {
    console.error('Failed to get credit transactions:', error);
    throw error;
  }
};