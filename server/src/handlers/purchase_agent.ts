import { db } from '../db';
import { usersTable, aiAgentsTable, purchasesTable, creditTransactionsTable } from '../db/schema';
import { type PurchaseAgentInput, type Purchase } from '../schema';
import { eq, and } from 'drizzle-orm';

export const purchaseAgent = async (input: PurchaseAgentInput): Promise<Purchase | null> => {
  try {
    // Start a transaction to ensure data consistency
    return await db.transaction(async (tx) => {
      // 1. Check if agent exists and is active
      const agents = await tx.select()
        .from(aiAgentsTable)
        .where(and(
          eq(aiAgentsTable.id, input.agent_id),
          eq(aiAgentsTable.is_active, true)
        ))
        .execute();

      if (agents.length === 0) {
        return null; // Agent doesn't exist or is inactive
      }

      const agent = agents[0];
      const agentPrice = parseFloat(agent.price);

      // 2. Check if buyer exists
      const buyers = await tx.select()
        .from(usersTable)
        .where(eq(usersTable.id, input.buyer_id))
        .execute();

      if (buyers.length === 0) {
        return null; // Buyer doesn't exist
      }

      const buyer = buyers[0];
      const buyerBalance = parseFloat(buyer.credit_balance);

      // 3. Prevent buyers from purchasing their own agents
      if (agent.creator_id === input.buyer_id) {
        return null; // Cannot buy your own agent
      }

      // 4. Check for duplicate purchase
      const existingPurchases = await tx.select()
        .from(purchasesTable)
        .where(and(
          eq(purchasesTable.buyer_id, input.buyer_id),
          eq(purchasesTable.agent_id, input.agent_id)
        ))
        .execute();

      if (existingPurchases.length > 0) {
        return null; // Already purchased this agent
      }

      // 5. Check if buyer has sufficient credits
      if (buyerBalance < agentPrice) {
        return null; // Insufficient credits
      }

      // 6. Get creator details
      const creators = await tx.select()
        .from(usersTable)
        .where(eq(usersTable.id, agent.creator_id))
        .execute();

      if (creators.length === 0) {
        return null; // Creator doesn't exist
      }

      const creator = creators[0];
      const creatorBalance = parseFloat(creator.credit_balance);
      const creatorTotalEarned = parseFloat(creator.total_earned);

      // 7. Update buyer's credit balance (deduct purchase amount)
      await tx.update(usersTable)
        .set({
          credit_balance: (buyerBalance - agentPrice).toString(),
          updated_at: new Date()
        })
        .where(eq(usersTable.id, input.buyer_id))
        .execute();

      // 8. Update creator's credit balance and total earned (add purchase amount)
      await tx.update(usersTable)
        .set({
          credit_balance: (creatorBalance + agentPrice).toString(),
          total_earned: (creatorTotalEarned + agentPrice).toString(),
          updated_at: new Date()
        })
        .where(eq(usersTable.id, agent.creator_id))
        .execute();

      // 9. Increment agent's total sales
      await tx.update(aiAgentsTable)
        .set({
          total_sales: agent.total_sales + 1,
          updated_at: new Date()
        })
        .where(eq(aiAgentsTable.id, input.agent_id))
        .execute();

      // 10. Create purchase record
      const purchaseResult = await tx.insert(purchasesTable)
        .values({
          buyer_id: input.buyer_id,
          agent_id: input.agent_id,
          creator_id: agent.creator_id,
          price_paid: agentPrice.toString()
        })
        .returning()
        .execute();

      const purchase = purchaseResult[0];

      // 11. Create credit transaction for buyer (debit)
      await tx.insert(creditTransactionsTable)
        .values({
          user_id: input.buyer_id,
          transaction_type: 'purchase',
          amount: (-agentPrice).toString(), // Negative amount for debit
          description: `Purchase of AI Agent: ${agent.name}`,
          reference_id: purchase.id
        })
        .execute();

      // 12. Create credit transaction for creator (credit)
      await tx.insert(creditTransactionsTable)
        .values({
          user_id: agent.creator_id,
          transaction_type: 'sale_earning',
          amount: agentPrice.toString(), // Positive amount for credit
          description: `Sale of AI Agent: ${agent.name}`,
          reference_id: purchase.id
        })
        .execute();

      // Return the purchase with proper numeric conversion
      return {
        ...purchase,
        price_paid: parseFloat(purchase.price_paid)
      };
    });
  } catch (error) {
    console.error('Purchase agent failed:', error);
    throw error;
  }
};