import { db } from '../db';
import { usersTable, creditTransactionsTable } from '../db/schema';
import { type BuyCreditsInput, type CreditTransaction } from '../schema';
import { eq } from 'drizzle-orm';

export const buyCredits = async (input: BuyCreditsInput): Promise<CreditTransaction | null> => {
  try {
    // First, verify the user exists
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (users.length === 0) {
      throw new Error(`User with id ${input.user_id} not found`);
    }

    const user = users[0];

    // Simulate payment processing (in real app, this would call Stripe/PayPal API)
    // For testing purposes, we'll assume payment always succeeds
    const paymentSuccess = await processPayment(input.amount, input.payment_method);
    
    if (!paymentSuccess) {
      return null; // Payment failed
    }

    // Start transaction to update user balance and create transaction record
    const result = await db.transaction(async (tx) => {
      // Re-fetch user balance inside transaction to ensure consistency
      const currentUsers = await tx.select()
        .from(usersTable)
        .where(eq(usersTable.id, input.user_id))
        .execute();

      if (currentUsers.length === 0) {
        throw new Error(`User with id ${input.user_id} not found`);
      }

      const currentUser = currentUsers[0];
      const newBalance = parseFloat(currentUser.credit_balance) + input.amount;

      // Update user's credit balance
      await tx.update(usersTable)
        .set({ 
          credit_balance: newBalance.toString(),
          updated_at: new Date()
        })
        .where(eq(usersTable.id, input.user_id))
        .execute();

      // Create credit transaction record
      const transactionResult = await tx.insert(creditTransactionsTable)
        .values({
          user_id: input.user_id,
          transaction_type: 'purchase',
          amount: input.amount.toString(),
          description: `Credit purchase via ${input.payment_method}`,
          reference_id: null // Could store payment processor transaction ID
        })
        .returning()
        .execute();

      return transactionResult[0];
    });

    // Convert numeric field back to number before returning
    return {
      ...result,
      amount: parseFloat(result.amount)
    };

  } catch (error) {
    console.error('Credit purchase failed:', error);
    throw error;
  }
};

// Mock payment processing function
// In a real application, this would integrate with Stripe, PayPal, etc.
async function processPayment(amount: number, paymentMethod: string): Promise<boolean> {
  // Simulate payment processing delay
  await new Promise(resolve => setTimeout(resolve, 10));
  
  // For testing, we'll simulate success for valid inputs
  // In real implementation, this would make API calls to payment processor
  if (amount <= 0) {
    return false; // Invalid amount
  }
  
  if (!paymentMethod || paymentMethod.trim() === '') {
    return false; // Invalid payment method
  }
  
  // For testing purposes, always succeed for valid inputs
  // In production, this would handle actual payment processing results
  return true;
}