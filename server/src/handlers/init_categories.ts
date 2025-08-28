import { db } from '../db';
import { categoriesTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type Category } from '../schema';

// Pre-defined categories for the AI marketplace
const PREDEFINED_CATEGORIES = [
  {
    name: 'Image Prompts',
    description: 'AI agents specialized in generating creative and effective image prompts for various use cases'
  },
  {
    name: 'Video Prompts',
    description: 'AI agents that create compelling video prompts and concepts for content creation'
  },
  {
    name: 'Workflows',
    description: 'Automated workflow AI agents that streamline business processes and productivity'
  },
  {
    name: 'AI Agent Prompts',
    description: 'Meta AI agents that help create and optimize prompts for other AI agents'
  }
];

export const initCategories = async (): Promise<Category[]> => {
  try {
    // First, get all existing categories
    const allCategories = await db.select()
      .from(categoriesTable)
      .execute();
    
    // If we already have all categories, return them
    if (allCategories.length >= PREDEFINED_CATEGORIES.length) {
      const existingNames = new Set(allCategories.map(cat => cat.name));
      const hasAllPredefined = PREDEFINED_CATEGORIES.every(cat => existingNames.has(cat.name));
      
      if (hasAllPredefined) {
        console.log('All predefined categories already exist');
        return allCategories.filter(cat => 
          PREDEFINED_CATEGORIES.some(predefined => predefined.name === cat.name)
        );
      }
    }

    const createdCategories: Category[] = [];

    for (const categoryData of PREDEFINED_CATEGORIES) {
      // Check if category already exists
      const existingCategory = allCategories.find(cat => cat.name === categoryData.name);

      if (!existingCategory) {
        try {
          // Create new category if it doesn't exist
          const result = await db.insert(categoriesTable)
            .values({
              name: categoryData.name,
              description: categoryData.description
            })
            .returning()
            .execute();

          createdCategories.push(result[0]);
          console.log(`Created category: ${categoryData.name}`);
        } catch (insertError: any) {
          // Handle race condition where category was created between our check and insert
          if (insertError.message?.includes('duplicate key value violates unique constraint')) {
            console.log(`Category was created by another process: ${categoryData.name}`);
            const refetchedCategory = await db.select()
              .from(categoriesTable)
              .where(eq(categoriesTable.name, categoryData.name))
              .execute();
            
            if (refetchedCategory.length > 0) {
              createdCategories.push(refetchedCategory[0]);
            }
          } else {
            throw insertError;
          }
        }
      } else {
        console.log(`Category already exists: ${categoryData.name}`);
        createdCategories.push(existingCategory);
      }
    }

    return createdCategories;
  } catch (error) {
    console.error('Failed to initialize categories:', error);
    throw error;
  }
};