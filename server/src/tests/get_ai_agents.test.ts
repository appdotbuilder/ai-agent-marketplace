import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, aiAgentsTable } from '../db/schema';
import { type GetAIAgentsFilter } from '../schema';
import { getAIAgents } from '../handlers/get_ai_agents';

describe('getAIAgents', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Test data setup
  const setupTestData = async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'creator1@test.com',
          username: 'creator1',
          full_name: 'Creator One',
          user_type: 'creator',
        },
        {
          email: 'creator2@test.com',
          username: 'creator2',
          full_name: 'Creator Two',
          user_type: 'creator',
        }
      ])
      .returning()
      .execute();

    // Create test categories
    const categories = await db.insert(categoriesTable)
      .values([
        {
          name: 'Productivity',
          description: 'Productivity tools',
        },
        {
          name: 'Entertainment',
          description: 'Entertainment apps',
        }
      ])
      .returning()
      .execute();

    // Create test AI agents
    const agents = await db.insert(aiAgentsTable)
      .values([
        {
          creator_id: users[0].id,
          name: 'Task Manager AI',
          description: 'An AI that helps manage your daily tasks efficiently',
          price: '29.99',
          key_features: ['Task scheduling', 'Priority management', 'Smart reminders'],
          screenshots: ['screenshot1.jpg', 'screenshot2.jpg'],
          category_id: categories[0].id,
          is_active: true,
          total_sales: 50,
        },
        {
          creator_id: users[1].id,
          name: 'Music Generator AI',
          description: 'Creates beautiful music compositions automatically',
          price: '49.99',
          key_features: ['Music generation', 'Multiple genres', 'Export options'],
          screenshots: ['music1.jpg'],
          category_id: categories[1].id,
          is_active: true,
          total_sales: 25,
        },
        {
          creator_id: users[0].id,
          name: 'Writing Assistant AI',
          description: 'Helps with writing and content creation tasks',
          price: '19.99',
          key_features: ['Grammar check', 'Style suggestions', 'Content ideas'],
          screenshots: [],
          category_id: categories[0].id,
          is_active: false, // Inactive agent
          total_sales: 0,
        }
      ])
      .returning()
      .execute();

    return { users, categories, agents };
  };

  it('should return all active AI agents by default', async () => {
    await setupTestData();

    const filter: GetAIAgentsFilter = {
      is_active: true
    };
    const results = await getAIAgents(filter);

    expect(results).toHaveLength(2); // Only active agents
    expect(results.every(agent => agent.is_active)).toBe(true);
    
    // Check numeric conversion
    results.forEach(agent => {
      expect(typeof agent.price).toBe('number');
    });

    // Check for specific agents
    const taskManager = results.find(agent => agent.name === 'Task Manager AI');
    const musicGenerator = results.find(agent => agent.name === 'Music Generator AI');
    
    expect(taskManager).toBeDefined();
    expect(musicGenerator).toBeDefined();
    expect(taskManager!.price).toBe(29.99);
    expect(musicGenerator!.price).toBe(49.99);
  });

  it('should filter by category_id', async () => {
    const { categories } = await setupTestData();

    const filter: GetAIAgentsFilter = {
      category_id: categories[0].id, // Productivity category
      is_active: true
    };
    const results = await getAIAgents(filter);

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Task Manager AI');
    expect(results[0].category_id).toBe(categories[0].id);
  });

  it('should filter by creator_id', async () => {
    const { users } = await setupTestData();

    const filter: GetAIAgentsFilter = {
      creator_id: users[1].id, // Creator Two
      is_active: true
    };
    const results = await getAIAgents(filter);

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Music Generator AI');
    expect(results[0].creator_id).toBe(users[1].id);
  });

  it('should filter by price range', async () => {
    await setupTestData();

    // Test minimum price filter
    const minFilter: GetAIAgentsFilter = {
      min_price: 30,
      is_active: true
    };
    const minResults = await getAIAgents(minFilter);
    expect(minResults).toHaveLength(1);
    expect(minResults[0].name).toBe('Music Generator AI');
    expect(minResults[0].price).toBe(49.99);

    // Test maximum price filter
    const maxFilter: GetAIAgentsFilter = {
      max_price: 30,
      is_active: true
    };
    const maxResults = await getAIAgents(maxFilter);
    expect(maxResults).toHaveLength(1);
    expect(maxResults[0].name).toBe('Task Manager AI');
    expect(maxResults[0].price).toBe(29.99);

    // Test price range filter
    const rangeFilter: GetAIAgentsFilter = {
      min_price: 20,
      max_price: 40,
      is_active: true
    };
    const rangeResults = await getAIAgents(rangeFilter);
    expect(rangeResults).toHaveLength(1);
    expect(rangeResults[0].price).toBe(29.99);
  });

  it('should filter by search term in name', async () => {
    await setupTestData();

    const filter: GetAIAgentsFilter = {
      search: 'Music',
      is_active: true
    };
    const results = await getAIAgents(filter);

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Music Generator AI');
  });

  it('should filter by search term in description', async () => {
    await setupTestData();

    const filter: GetAIAgentsFilter = {
      search: 'tasks',
      is_active: true
    };
    const results = await getAIAgents(filter);

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Task Manager AI');
  });

  it('should handle case-insensitive search', async () => {
    await setupTestData();

    const filter: GetAIAgentsFilter = {
      search: 'MUSIC',
      is_active: true
    };
    const results = await getAIAgents(filter);

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Music Generator AI');
  });

  it('should return inactive agents when is_active is false', async () => {
    await setupTestData();

    const filter: GetAIAgentsFilter = {
      is_active: false,
    };
    const results = await getAIAgents(filter);

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Writing Assistant AI');
    expect(results[0].is_active).toBe(false);
  });

  it('should combine multiple filters', async () => {
    const { users, categories } = await setupTestData();

    const filter: GetAIAgentsFilter = {
      creator_id: users[0].id,
      category_id: categories[0].id,
      max_price: 25,
      is_active: true
    };
    const results = await getAIAgents(filter);

    // Should return empty since Task Manager AI costs 29.99 (above max_price of 25)
    expect(results).toHaveLength(0);

    // Adjust filter to include Task Manager AI
    const adjustedFilter: GetAIAgentsFilter = {
      creator_id: users[0].id,
      category_id: categories[0].id,
      max_price: 35,
      is_active: true
    };
    const adjustedResults = await getAIAgents(adjustedFilter);

    expect(adjustedResults).toHaveLength(1);
    expect(adjustedResults[0].name).toBe('Task Manager AI');
  });

  it('should return empty array when no agents match filters', async () => {
    await setupTestData();

    const filter: GetAIAgentsFilter = {
      search: 'nonexistent',
      is_active: true
    };
    const results = await getAIAgents(filter);

    expect(results).toHaveLength(0);
  });

  it('should return proper AIAgent structure with all required fields', async () => {
    await setupTestData();

    const filter: GetAIAgentsFilter = {
      is_active: true
    };
    const results = await getAIAgents(filter);

    expect(results.length).toBeGreaterThan(0);
    
    const agent = results[0];
    expect(agent.id).toBeDefined();
    expect(typeof agent.creator_id).toBe('number');
    expect(typeof agent.name).toBe('string');
    expect(typeof agent.description).toBe('string');
    expect(typeof agent.price).toBe('number');
    expect(Array.isArray(agent.key_features)).toBe(true);
    expect(Array.isArray(agent.screenshots)).toBe(true);
    expect(typeof agent.category_id).toBe('number');
    expect(typeof agent.is_active).toBe('boolean');
    expect(typeof agent.total_sales).toBe('number');
    expect(agent.created_at).toBeInstanceOf(Date);
    expect(agent.updated_at).toBeInstanceOf(Date);
  });
});