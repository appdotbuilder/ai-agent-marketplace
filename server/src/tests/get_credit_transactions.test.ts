import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, creditTransactionsTable } from '../db/schema';
import { type GetCreditTransactionsFilter } from '../schema';
import { getCreditTransactions } from '../handlers/get_credit_transactions';

describe('getCreditTransactions', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let otherUserId: number;

  beforeEach(async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'test@example.com',
          username: 'testuser',
          full_name: 'Test User',
          user_type: 'buyer'
        },
        {
          email: 'other@example.com',
          username: 'otheruser',
          full_name: 'Other User',
          user_type: 'creator'
        }
      ])
      .returning()
      .execute();

    testUserId = users[0].id;
    otherUserId = users[1].id;
  });

  it('should return empty array when user has no transactions', async () => {
    const filter: GetCreditTransactionsFilter = {
      user_id: testUserId
    };

    const result = await getCreditTransactions(filter);

    expect(result).toEqual([]);
  });

  it('should return all transactions for a user', async () => {
    // Create test transactions
    await db.insert(creditTransactionsTable)
      .values([
        {
          user_id: testUserId,
          transaction_type: 'purchase',
          amount: '25.50',
          description: 'Bought AI Agent X'
        },
        {
          user_id: testUserId,
          transaction_type: 'sale_earning',
          amount: '100.00',
          description: 'Sold AI Agent Y'
        },
        {
          user_id: otherUserId,
          transaction_type: 'withdrawal',
          amount: '50.00',
          description: 'Withdrawal to bank'
        }
      ])
      .execute();

    const filter: GetCreditTransactionsFilter = {
      user_id: testUserId
    };

    const result = await getCreditTransactions(filter);

    expect(result).toHaveLength(2);
    expect(result[0].user_id).toEqual(testUserId);
    expect(result[1].user_id).toEqual(testUserId);
    
    // Check numeric conversion
    expect(typeof result[0].amount).toBe('number');
    expect(typeof result[1].amount).toBe('number');
    
    // Verify amounts (sorted numerically)
    const amounts = result.map(t => t.amount).sort((a, b) => a - b);
    expect(amounts).toEqual([25.5, 100]);
  });

  it('should filter by transaction type', async () => {
    // Create transactions of different types
    await db.insert(creditTransactionsTable)
      .values([
        {
          user_id: testUserId,
          transaction_type: 'purchase',
          amount: '25.50',
          description: 'Purchase transaction'
        },
        {
          user_id: testUserId,
          transaction_type: 'sale_earning',
          amount: '75.00',
          description: 'Sale earning transaction'
        },
        {
          user_id: testUserId,
          transaction_type: 'withdrawal',
          amount: '30.00',
          description: 'Withdrawal transaction'
        },
        {
          user_id: testUserId,
          transaction_type: 'refund',
          amount: '15.00',
          description: 'Refund transaction'
        }
      ])
      .execute();

    // Test filtering by purchase type
    const purchaseFilter: GetCreditTransactionsFilter = {
      user_id: testUserId,
      transaction_type: 'purchase'
    };

    const purchaseResults = await getCreditTransactions(purchaseFilter);
    
    expect(purchaseResults).toHaveLength(1);
    expect(purchaseResults[0].transaction_type).toEqual('purchase');
    expect(purchaseResults[0].amount).toEqual(25.5);
    expect(purchaseResults[0].description).toEqual('Purchase transaction');

    // Test filtering by sale_earning type
    const saleFilter: GetCreditTransactionsFilter = {
      user_id: testUserId,
      transaction_type: 'sale_earning'
    };

    const saleResults = await getCreditTransactions(saleFilter);
    
    expect(saleResults).toHaveLength(1);
    expect(saleResults[0].transaction_type).toEqual('sale_earning');
    expect(saleResults[0].amount).toEqual(75);
  });

  it('should return transactions in chronological order (newest first)', async () => {
    // Create transactions with slight delays to ensure different timestamps
    const transaction1 = await db.insert(creditTransactionsTable)
      .values({
        user_id: testUserId,
        transaction_type: 'purchase',
        amount: '10.00',
        description: 'First transaction'
      })
      .returning()
      .execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const transaction2 = await db.insert(creditTransactionsTable)
      .values({
        user_id: testUserId,
        transaction_type: 'sale_earning',
        amount: '20.00',
        description: 'Second transaction'
      })
      .returning()
      .execute();

    await new Promise(resolve => setTimeout(resolve, 10));

    const transaction3 = await db.insert(creditTransactionsTable)
      .values({
        user_id: testUserId,
        transaction_type: 'withdrawal',
        amount: '30.00',
        description: 'Third transaction'
      })
      .returning()
      .execute();

    const filter: GetCreditTransactionsFilter = {
      user_id: testUserId
    };

    const result = await getCreditTransactions(filter);

    expect(result).toHaveLength(3);
    
    // Should be ordered by created_at DESC (newest first)
    expect(result[0].description).toEqual('Third transaction');
    expect(result[1].description).toEqual('Second transaction');
    expect(result[2].description).toEqual('First transaction');
    
    // Verify chronological order
    expect(result[0].created_at >= result[1].created_at).toBe(true);
    expect(result[1].created_at >= result[2].created_at).toBe(true);
  });

  it('should handle all transaction types correctly', async () => {
    const transactionTypes = ['purchase', 'sale_earning', 'withdrawal', 'refund'] as const;
    
    // Create one transaction of each type
    const values = transactionTypes.map((type, index) => ({
      user_id: testUserId,
      transaction_type: type,
      amount: `${(index + 1) * 10}.00`,
      description: `${type} transaction`,
      reference_id: index > 0 ? index : null
    }));

    await db.insert(creditTransactionsTable)
      .values(values)
      .execute();

    // Test each transaction type filter
    for (const transactionType of transactionTypes) {
      const filter: GetCreditTransactionsFilter = {
        user_id: testUserId,
        transaction_type: transactionType
      };

      const result = await getCreditTransactions(filter);
      
      expect(result).toHaveLength(1);
      expect(result[0].transaction_type).toEqual(transactionType);
      expect(result[0].description).toEqual(`${transactionType} transaction`);
    }
  });

  it('should include all transaction fields correctly', async () => {
    await db.insert(creditTransactionsTable)
      .values({
        user_id: testUserId,
        transaction_type: 'purchase',
        amount: '99.99',
        description: 'Test purchase with reference',
        reference_id: 12345
      })
      .execute();

    const filter: GetCreditTransactionsFilter = {
      user_id: testUserId
    };

    const result = await getCreditTransactions(filter);

    expect(result).toHaveLength(1);
    
    const transaction = result[0];
    expect(transaction.id).toBeDefined();
    expect(transaction.user_id).toEqual(testUserId);
    expect(transaction.transaction_type).toEqual('purchase');
    expect(transaction.amount).toEqual(99.99);
    expect(typeof transaction.amount).toBe('number');
    expect(transaction.description).toEqual('Test purchase with reference');
    expect(transaction.reference_id).toEqual(12345);
    expect(transaction.created_at).toBeInstanceOf(Date);
  });

  it('should handle null description and reference_id', async () => {
    await db.insert(creditTransactionsTable)
      .values({
        user_id: testUserId,
        transaction_type: 'withdrawal',
        amount: '50.00',
        description: null,
        reference_id: null
      })
      .execute();

    const filter: GetCreditTransactionsFilter = {
      user_id: testUserId
    };

    const result = await getCreditTransactions(filter);

    expect(result).toHaveLength(1);
    expect(result[0].description).toBeNull();
    expect(result[0].reference_id).toBeNull();
    expect(result[0].amount).toEqual(50);
  });
});