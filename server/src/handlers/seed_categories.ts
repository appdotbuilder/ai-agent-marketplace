import { initCategories } from './init_categories';

// Script to seed the database with predefined categories
async function seedCategories() {
  try {
    console.log('Starting category initialization...');
    const categories = await initCategories();
    console.log('Categories initialized successfully:');
    categories.forEach(cat => {
      console.log(`- ${cat.name}: ${cat.description}`);
    });
    console.log('Category seeding completed!');
  } catch (error) {
    console.error('Failed to seed categories:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (import.meta.main) {
  seedCategories();
}

export { seedCategories };