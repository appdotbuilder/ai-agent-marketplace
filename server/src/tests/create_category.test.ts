import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable } from '../db/schema';
import { type CreateCategoryInput } from '../schema';
import { createCategory } from '../handlers/create_category';
import { eq } from 'drizzle-orm';

// Test inputs
const validCategoryInput: CreateCategoryInput = {
  name: 'Web Development',
  description: 'AI agents for web development tasks'
};

const minimalCategoryInput: CreateCategoryInput = {
  name: 'Mobile Apps'
};

describe('createCategory', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a category with description', async () => {
    const result = await createCategory(validCategoryInput);

    // Basic field validation
    expect(result.name).toEqual('Web Development');
    expect(result.description).toEqual('AI agents for web development tasks');
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a category without description', async () => {
    const result = await createCategory(minimalCategoryInput);

    // Verify fields
    expect(result.name).toEqual('Mobile Apps');
    expect(result.description).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save category to database', async () => {
    const result = await createCategory(validCategoryInput);

    // Query database to verify persistence
    const categories = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, result.id))
      .execute();

    expect(categories).toHaveLength(1);
    expect(categories[0].name).toEqual('Web Development');
    expect(categories[0].description).toEqual('AI agents for web development tasks');
    expect(categories[0].created_at).toBeInstanceOf(Date);
  });

  it('should handle undefined description correctly', async () => {
    const inputWithUndefinedDesc: CreateCategoryInput = {
      name: 'Data Science',
      description: undefined
    };

    const result = await createCategory(inputWithUndefinedDesc);

    expect(result.name).toEqual('Data Science');
    expect(result.description).toBeNull();

    // Verify in database
    const categories = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, result.id))
      .execute();

    expect(categories[0].description).toBeNull();
  });

  it('should enforce unique category names', async () => {
    // Create first category
    await createCategory(validCategoryInput);

    // Attempt to create duplicate category name
    const duplicateInput: CreateCategoryInput = {
      name: 'Web Development',
      description: 'Different description but same name'
    };

    await expect(createCategory(duplicateInput)).rejects.toThrow(/duplicate/i);
  });

  it('should create multiple categories with unique names', async () => {
    const category1 = await createCategory({
      name: 'Gaming',
      description: 'Game development AI agents'
    });

    const category2 = await createCategory({
      name: 'Finance',
      description: 'Financial analysis AI agents'
    });

    const category3 = await createCategory({
      name: 'Education'
    });

    // Verify all categories were created
    const allCategories = await db.select()
      .from(categoriesTable)
      .execute();

    expect(allCategories).toHaveLength(3);

    // Verify unique IDs
    const ids = allCategories.map(c => c.id);
    expect(new Set(ids)).toHaveProperty('size', 3);

    // Verify specific categories exist
    expect(allCategories.find(c => c.name === 'Gaming')).toBeDefined();
    expect(allCategories.find(c => c.name === 'Finance')).toBeDefined();
    expect(allCategories.find(c => c.name === 'Education')).toBeDefined();
  });
});