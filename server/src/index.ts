import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import all schemas
import {
  createUserInputSchema,
  updateUserInputSchema,
  createCategoryInputSchema,
  createAIAgentInputSchema,
  updateAIAgentInputSchema,
  getAIAgentsFilterSchema,
  purchaseAgentInputSchema,
  buyCreditsInputSchema,
  withdrawCreditsInputSchema,
  getUserPurchasesFilterSchema,
  getUserSalesFilterSchema,
  getCreditTransactionsFilterSchema
} from './schema';

// Import all handlers
import { createUser } from './handlers/create_user';
import { getUsers } from './handlers/get_users';
import { getUserById } from './handlers/get_user_by_id';
import { updateUser } from './handlers/update_user';
import { createCategory } from './handlers/create_category';
import { getCategories } from './handlers/get_categories';
import { createAIAgent } from './handlers/create_ai_agent';
import { getAIAgents } from './handlers/get_ai_agents';
import { getAIAgentById } from './handlers/get_ai_agent_by_id';
import { updateAIAgent } from './handlers/update_ai_agent';
import { getCreatorAgents } from './handlers/get_creator_agents';
import { purchaseAgent } from './handlers/purchase_agent';
import { getUserPurchases } from './handlers/get_user_purchases';
import { getUserSales } from './handlers/get_user_sales';
import { buyCredits } from './handlers/buy_credits';
import { withdrawCredits } from './handlers/withdraw_credits';
import { getCreditTransactions } from './handlers/get_credit_transactions';
import { getUserBalance } from './handlers/get_user_balance';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User management routes
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),
  
  getUsers: publicProcedure
    .query(() => getUsers()),
  
  getUserById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getUserById(input.id)),
  
  updateUser: publicProcedure
    .input(updateUserInputSchema)
    .mutation(({ input }) => updateUser(input)),

  // Category management routes
  createCategory: publicProcedure
    .input(createCategoryInputSchema)
    .mutation(({ input }) => createCategory(input)),
  
  getCategories: publicProcedure
    .query(() => getCategories()),

  // AI Agent management routes
  createAIAgent: publicProcedure
    .input(createAIAgentInputSchema)
    .mutation(({ input }) => createAIAgent(input)),
  
  getAIAgents: publicProcedure
    .input(getAIAgentsFilterSchema)
    .query(({ input }) => getAIAgents(input)),
  
  getAIAgentById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getAIAgentById(input.id)),
  
  updateAIAgent: publicProcedure
    .input(updateAIAgentInputSchema)
    .mutation(({ input }) => updateAIAgent(input)),
  
  getCreatorAgents: publicProcedure
    .input(z.object({ creatorId: z.number() }))
    .query(({ input }) => getCreatorAgents(input.creatorId)),

  // Purchase and sales routes
  purchaseAgent: publicProcedure
    .input(purchaseAgentInputSchema)
    .mutation(({ input }) => purchaseAgent(input)),
  
  getUserPurchases: publicProcedure
    .input(getUserPurchasesFilterSchema)
    .query(({ input }) => getUserPurchases(input)),
  
  getUserSales: publicProcedure
    .input(getUserSalesFilterSchema)
    .query(({ input }) => getUserSales(input)),

  // Credit management routes
  buyCredits: publicProcedure
    .input(buyCreditsInputSchema)
    .mutation(({ input }) => buyCredits(input)),
  
  withdrawCredits: publicProcedure
    .input(withdrawCreditsInputSchema)
    .mutation(({ input }) => withdrawCredits(input)),
  
  getCreditTransactions: publicProcedure
    .input(getCreditTransactionsFilterSchema)
    .query(({ input }) => getCreditTransactions(input)),
  
  getUserBalance: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getUserBalance(input.userId)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();