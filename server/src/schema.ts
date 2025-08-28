import { z } from 'zod';

// User schema
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  username: z.string(),
  full_name: z.string(),
  credit_balance: z.number(),
  total_earned: z.number(),
  user_type: z.enum(['creator', 'buyer', 'both']),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Category schema
export const categorySchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  created_at: z.coerce.date()
});

export type Category = z.infer<typeof categorySchema>;

// AI Agent schema
export const aiAgentSchema = z.object({
  id: z.number(),
  creator_id: z.number(),
  name: z.string(),
  description: z.string(),
  price: z.number(),
  key_features: z.array(z.string()),
  screenshots: z.array(z.string()),
  category_id: z.number(),
  is_active: z.boolean(),
  total_sales: z.number().int(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type AIAgent = z.infer<typeof aiAgentSchema>;

// Purchase schema
export const purchaseSchema = z.object({
  id: z.number(),
  buyer_id: z.number(),
  agent_id: z.number(),
  creator_id: z.number(),
  price_paid: z.number(),
  purchase_date: z.coerce.date()
});

export type Purchase = z.infer<typeof purchaseSchema>;

// Credit Transaction schema
export const creditTransactionSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  transaction_type: z.enum(['purchase', 'sale_earning', 'withdrawal', 'refund']),
  amount: z.number(),
  description: z.string().nullable(),
  reference_id: z.number().nullable(), // Can reference purchase_id or other transaction
  created_at: z.coerce.date()
});

export type CreditTransaction = z.infer<typeof creditTransactionSchema>;

// Input schemas for creating records

// Create user input
export const createUserInputSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(50),
  full_name: z.string().min(1).max(100),
  user_type: z.enum(['creator', 'buyer', 'both']).default('buyer')
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

// Create category input
export const createCategoryInputSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().nullable().optional()
});

export type CreateCategoryInput = z.infer<typeof createCategoryInputSchema>;

// Create AI agent input
export const createAIAgentInputSchema = z.object({
  creator_id: z.number(),
  name: z.string().min(1).max(200),
  description: z.string().min(10),
  price: z.number().positive(),
  key_features: z.array(z.string()).min(1),
  screenshots: z.array(z.string()).optional().default([]),
  category_id: z.number()
});

export type CreateAIAgentInput = z.infer<typeof createAIAgentInputSchema>;

// Purchase agent input
export const purchaseAgentInputSchema = z.object({
  buyer_id: z.number(),
  agent_id: z.number()
});

export type PurchaseAgentInput = z.infer<typeof purchaseAgentInputSchema>;

// Buy credits input
export const buyCreditsInputSchema = z.object({
  user_id: z.number(),
  amount: z.number().positive(),
  payment_method: z.string() // Could be 'credit_card', 'paypal', etc.
});

export type BuyCreditsInput = z.infer<typeof buyCreditsInputSchema>;

// Withdraw credits input
export const withdrawCreditsInputSchema = z.object({
  user_id: z.number(),
  amount: z.number().positive()
});

export type WithdrawCreditsInput = z.infer<typeof withdrawCreditsInputSchema>;

// Update schemas

// Update AI agent input
export const updateAIAgentInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().min(10).optional(),
  price: z.number().positive().optional(),
  key_features: z.array(z.string()).min(1).optional(),
  screenshots: z.array(z.string()).optional(),
  category_id: z.number().optional(),
  is_active: z.boolean().optional()
});

export type UpdateAIAgentInput = z.infer<typeof updateAIAgentInputSchema>;

// Update user input
export const updateUserInputSchema = z.object({
  id: z.number(),
  email: z.string().email().optional(),
  username: z.string().min(3).max(50).optional(),
  full_name: z.string().min(1).max(100).optional(),
  user_type: z.enum(['creator', 'buyer', 'both']).optional()
});

export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;

// Query schemas

// Get AI agents filter
export const getAIAgentsFilterSchema = z.object({
  category_id: z.number().optional(),
  creator_id: z.number().optional(),
  search: z.string().optional(),
  min_price: z.number().optional(),
  max_price: z.number().optional(),
  is_active: z.boolean().optional().default(true)
});

export type GetAIAgentsFilter = z.infer<typeof getAIAgentsFilterSchema>;

// Get user purchases filter
export const getUserPurchasesFilterSchema = z.object({
  user_id: z.number()
});

export type GetUserPurchasesFilter = z.infer<typeof getUserPurchasesFilterSchema>;

// Get user sales filter (for creators)
export const getUserSalesFilterSchema = z.object({
  creator_id: z.number()
});

export type GetUserSalesFilter = z.infer<typeof getUserSalesFilterSchema>;

// Get credit transactions filter
export const getCreditTransactionsFilterSchema = z.object({
  user_id: z.number(),
  transaction_type: z.enum(['purchase', 'sale_earning', 'withdrawal', 'refund']).optional()
});

export type GetCreditTransactionsFilter = z.infer<typeof getCreditTransactionsFilterSchema>;