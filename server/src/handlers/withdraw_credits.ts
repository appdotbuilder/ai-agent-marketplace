import { db } from '../db';
import { usersTable, creditTransactionsTable } from '../db/schema';
import { type WithdrawCreditsInput, type CreditTransaction } from '../schema';
import { eq } from 'drizzle-orm';

export const withdrawCredits = async (input: WithdrawCreditsInput): Promise<CreditTransaction | null> => {
  try {
    // Check if user exists and get their credit balance
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (users.length === 0) {
      return null; // User not found
    }

    const user = users[0];
    const currentBalance = parseFloat(user.credit_balance);

    // Check if user has sufficient balance
    if (currentBalance < input.amount) {
      return null; // Insufficient balance
    }

    // Calculate new balance
    const newBalance = currentBalance - input.amount;

    // Start transaction to update user balance and create withdrawal record
    const [updatedUser] = await db.update(usersTable)
      .set({
        credit_balance: newBalance.toString(),
        updated_at: new Date()
      })
      .where(eq(usersTable.id, input.user_id))
      .returning()
      .execute();

    // Create withdrawal transaction record
    const [transaction] = await db.insert(creditTransactionsTable)
      .values({
        user_id: input.user_id,
        transaction_type: 'withdrawal',
        amount: input.amount.toString(),
        description: `Credit withdrawal of $${input.amount}`,
        reference_id: null
      })
      .returning()
      .execute();

    // Convert numeric fields and return transaction
    return {
      ...transaction,
      amount: parseFloat(transaction.amount)
    };
  } catch (error) {
    console.error('Credit withdrawal failed:', error);
    return null; // Return null on any error
  }
};