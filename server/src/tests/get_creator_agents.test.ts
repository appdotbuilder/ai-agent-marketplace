import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, aiAgentsTable } from '../db/schema';
import { getCreatorAgents } from '../handlers/get_creator_agents';

describe('getCreatorAgents', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all agents created by a specific creator', async () => {
    // Create test users
    const [creator, otherCreator] = await db.insert(usersTable)
      .values([
        {
          email: 'creator@test.com',
          username: 'creator1',
          full_name: 'Test Creator',
          user_type: 'creator'
        },
        {
          email: 'other@test.com',
          username: 'other1',
          full_name: 'Other Creator',
          user_type: 'creator'
        }
      ])
      .returning()
      .execute();

    // Create test category
    const [category] = await db.insert(categoriesTable)
      .values({
        name: 'AI Tools',
        description: 'Tools for AI development'
      })
      .returning()
      .execute();

    // Create agents for the creator
    await db.insert(aiAgentsTable)
      .values([
        {
          creator_id: creator.id,
          name: 'Agent 1',
          description: 'First test agent',
          price: '29.99',
          key_features: ['feature1', 'feature2'],
          screenshots: ['screenshot1.jpg'],
          category_id: category.id,
          is_active: true
        },
        {
          creator_id: creator.id,
          name: 'Agent 2',
          description: 'Second test agent',
          price: '49.99',
          key_features: ['feature3'],
          screenshots: [],
          category_id: category.id,
          is_active: false
        },
        {
          creator_id: otherCreator.id,
          name: 'Other Agent',
          description: 'Agent from other creator',
          price: '19.99',
          key_features: ['other_feature'],
          screenshots: [],
          category_id: category.id,
          is_active: true
        }
      ])
      .execute();

    const result = await getCreatorAgents(creator.id);

    // Should return only agents from the specified creator
    expect(result).toHaveLength(2);
    
    // Verify all returned agents belong to the creator
    result.forEach(agent => {
      expect(agent.creator_id).toEqual(creator.id);
    });

    // Verify numeric field conversions
    expect(typeof result[0].price).toEqual('number');
    expect(typeof result[1].price).toEqual('number');

    // Verify agent details
    const agent1 = result.find(a => a.name === 'Agent 1');
    const agent2 = result.find(a => a.name === 'Agent 2');

    expect(agent1).toBeDefined();
    expect(agent1!.price).toEqual(29.99);
    expect(agent1!.is_active).toEqual(true);
    expect(agent1!.key_features).toEqual(['feature1', 'feature2']);

    expect(agent2).toBeDefined();
    expect(agent2!.price).toEqual(49.99);
    expect(agent2!.is_active).toEqual(false);
    expect(agent2!.key_features).toEqual(['feature3']);
  });

  it('should return both active and inactive agents', async () => {
    // Create test user
    const [creator] = await db.insert(usersTable)
      .values({
        email: 'creator@test.com',
        username: 'creator1',
        full_name: 'Test Creator',
        user_type: 'creator'
      })
      .returning()
      .execute();

    // Create test category
    const [category] = await db.insert(categoriesTable)
      .values({
        name: 'AI Tools',
        description: 'Tools for AI development'
      })
      .returning()
      .execute();

    // Create both active and inactive agents
    await db.insert(aiAgentsTable)
      .values([
        {
          creator_id: creator.id,
          name: 'Active Agent',
          description: 'Active test agent',
          price: '29.99',
          key_features: ['feature1'],
          screenshots: [],
          category_id: category.id,
          is_active: true
        },
        {
          creator_id: creator.id,
          name: 'Inactive Agent',
          description: 'Inactive test agent',
          price: '39.99',
          key_features: ['feature2'],
          screenshots: [],
          category_id: category.id,
          is_active: false
        }
      ])
      .execute();

    const result = await getCreatorAgents(creator.id);

    expect(result).toHaveLength(2);
    
    const activeAgent = result.find(a => a.name === 'Active Agent');
    const inactiveAgent = result.find(a => a.name === 'Inactive Agent');

    expect(activeAgent).toBeDefined();
    expect(activeAgent!.is_active).toEqual(true);

    expect(inactiveAgent).toBeDefined();
    expect(inactiveAgent!.is_active).toEqual(false);
  });

  it('should return empty array for creator with no agents', async () => {
    // Create test user with no agents
    const [creator] = await db.insert(usersTable)
      .values({
        email: 'creator@test.com',
        username: 'creator1',
        full_name: 'Test Creator',
        user_type: 'creator'
      })
      .returning()
      .execute();

    const result = await getCreatorAgents(creator.id);

    expect(result).toEqual([]);
  });

  it('should return agents ordered by creation date (newest first)', async () => {
    // Create test user
    const [creator] = await db.insert(usersTable)
      .values({
        email: 'creator@test.com',
        username: 'creator1',
        full_name: 'Test Creator',
        user_type: 'creator'
      })
      .returning()
      .execute();

    // Create test category
    const [category] = await db.insert(categoriesTable)
      .values({
        name: 'AI Tools',
        description: 'Tools for AI development'
      })
      .returning()
      .execute();

    // Create agents with slight delay to ensure different timestamps
    const [firstAgent] = await db.insert(aiAgentsTable)
      .values({
        creator_id: creator.id,
        name: 'First Agent',
        description: 'First created agent',
        price: '29.99',
        key_features: ['feature1'],
        screenshots: [],
        category_id: category.id,
        is_active: true
      })
      .returning()
      .execute();

    // Small delay to ensure different timestamp
    await new Promise(resolve => setTimeout(resolve, 10));

    const [secondAgent] = await db.insert(aiAgentsTable)
      .values({
        creator_id: creator.id,
        name: 'Second Agent',
        description: 'Second created agent',
        price: '39.99',
        key_features: ['feature2'],
        screenshots: [],
        category_id: category.id,
        is_active: true
      })
      .returning()
      .execute();

    const result = await getCreatorAgents(creator.id);

    expect(result).toHaveLength(2);
    
    // Should be ordered by creation date (newest first)
    expect(result[0].name).toEqual('Second Agent');
    expect(result[1].name).toEqual('First Agent');
    
    // Verify timestamps are in descending order
    expect(result[0].created_at.getTime()).toBeGreaterThan(result[1].created_at.getTime());
  });

  it('should handle agents with all optional fields populated', async () => {
    // Create test user
    const [creator] = await db.insert(usersTable)
      .values({
        email: 'creator@test.com',
        username: 'creator1',
        full_name: 'Test Creator',
        user_type: 'creator'
      })
      .returning()
      .execute();

    // Create test category
    const [category] = await db.insert(categoriesTable)
      .values({
        name: 'AI Tools',
        description: 'Tools for AI development'
      })
      .returning()
      .execute();

    // Create agent with full data
    await db.insert(aiAgentsTable)
      .values({
        creator_id: creator.id,
        name: 'Full Feature Agent',
        description: 'Agent with all features',
        price: '99.99',
        key_features: ['feature1', 'feature2', 'feature3'],
        screenshots: ['screen1.jpg', 'screen2.jpg'],
        category_id: category.id,
        is_active: true,
        total_sales: 5
      })
      .execute();

    const result = await getCreatorAgents(creator.id);

    expect(result).toHaveLength(1);
    
    const agent = result[0];
    expect(agent.name).toEqual('Full Feature Agent');
    expect(agent.price).toEqual(99.99);
    expect(typeof agent.price).toEqual('number');
    expect(agent.key_features).toEqual(['feature1', 'feature2', 'feature3']);
    expect(agent.screenshots).toEqual(['screen1.jpg', 'screen2.jpg']);
    expect(agent.total_sales).toEqual(5);
    expect(agent.created_at).toBeInstanceOf(Date);
    expect(agent.updated_at).toBeInstanceOf(Date);
  });
});