import { db } from '../db';
import { categoriesTable } from '../db/schema';
import { type Category } from '../schema';
import { desc } from 'drizzle-orm';

export const getCategories = async (): Promise<Category[]> => {
  try {
    // Fetch all categories ordered by name
    const result = await db.select()
      .from(categoriesTable)
      .orderBy(categoriesTable.name)
      .execute();

    return result;
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    throw error;
  }
};