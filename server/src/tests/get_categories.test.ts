import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable } from '../db/schema';
import { type CreateCategoryInput } from '../schema';
import { getCategories } from '../handlers/get_categories';

describe('getCategories', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no categories exist', async () => {
    const result = await getCategories();

    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it('should return all categories', async () => {
    // Create test categories
    await db.insert(categoriesTable)
      .values([
        {
          name: 'AI Tools',
          description: 'Artificial Intelligence tools and utilities'
        },
        {
          name: 'Automation',
          description: 'Task automation agents'
        },
        {
          name: 'Data Analysis',
          description: 'Data processing and analysis tools'
        }
      ])
      .execute();

    const result = await getCategories();

    expect(result).toHaveLength(3);
    
    // Verify each category has required fields
    result.forEach(category => {
      expect(category.id).toBeDefined();
      expect(typeof category.name).toBe('string');
      expect(category.created_at).toBeInstanceOf(Date);
    });

    // Verify specific categories exist
    const categoryNames = result.map(c => c.name);
    expect(categoryNames).toContain('AI Tools');
    expect(categoryNames).toContain('Automation');
    expect(categoryNames).toContain('Data Analysis');
  });

  it('should return categories ordered by name', async () => {
    // Create categories in non-alphabetical order
    await db.insert(categoriesTable)
      .values([
        { name: 'Zebra Category', description: 'Last alphabetically' },
        { name: 'Alpha Category', description: 'First alphabetically' },
        { name: 'Beta Category', description: 'Middle alphabetically' }
      ])
      .execute();

    const result = await getCategories();

    expect(result).toHaveLength(3);
    expect(result[0].name).toBe('Alpha Category');
    expect(result[1].name).toBe('Beta Category');
    expect(result[2].name).toBe('Zebra Category');
  });

  it('should handle categories with null descriptions', async () => {
    // Create category with null description
    await db.insert(categoriesTable)
      .values([
        {
          name: 'Test Category',
          description: null
        }
      ])
      .execute();

    const result = await getCategories();

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Test Category');
    expect(result[0].description).toBeNull();
  });

  it('should preserve all category fields correctly', async () => {
    // Create a category with all fields
    const testDescription = 'This is a detailed test description';
    await db.insert(categoriesTable)
      .values({
        name: 'Complete Category',
        description: testDescription
      })
      .execute();

    const result = await getCategories();

    expect(result).toHaveLength(1);
    const category = result[0];
    
    expect(category.id).toBeTypeOf('number');
    expect(category.name).toBe('Complete Category');
    expect(category.description).toBe(testDescription);
    expect(category.created_at).toBeInstanceOf(Date);
    
    // Verify created_at is recent (within last minute)
    const now = new Date();
    const timeDiff = now.getTime() - category.created_at.getTime();
    expect(timeDiff).toBeLessThan(60000); // Less than 1 minute
  });
});