import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
import { useState, useEffect, useCallback } from 'react';
import type { Category } from '../../server/src/schema';

function App() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Load categories with auto-initialization
  const loadCategories = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await trpc.getCategories.query();
      
      // Auto-initialize categories if none exist and not already initialized
      if (result.length === 0 && !hasInitialized) {
        console.log('No categories found, auto-initializing...');
        setHasInitialized(true);
        try {
          await trpc.initCategories.mutate();
          const updatedResult = await trpc.getCategories.query();
          setCategories(updatedResult);
        } catch (initError) {
          // If categories already exist due to race condition, just reload
          if (initError instanceof Error && initError.message?.includes('duplicate key value violates unique constraint')) {
            console.log('Categories were already initialized, reloading...');
            const updatedResult = await trpc.getCategories.query();
            setCategories(updatedResult);
          } else {
            throw initError;
          }
        }
      } else {
        setCategories(result);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setIsLoading(false);
    }
  }, [hasInitialized]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // Initialize predefined categories
  const handleInitializeCategories = async () => {
    try {
      setIsInitializing(true);
      await trpc.initCategories.mutate();
      await loadCategories(); // Reload categories after initialization
      console.log('Categories initialized successfully!');
    } catch (error) {
      console.error('Failed to initialize categories:', error);
    } finally {
      setIsInitializing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🤖 AI Agent Marketplace
          </h1>
          <p className="text-lg text-gray-600">
            Discover and trade cutting-edge AI agents
          </p>
        </div>

        {/* Category Management Section */}
        <Card className="mb-8 border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-t-lg">
            <CardTitle className="text-2xl flex items-center gap-2">
              📁 Category Management
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6">
              <div>
                <p className="text-gray-600 mb-2">
                  Initialize the marketplace with pre-defined categories
                </p>
                <div className="text-sm text-gray-500">
                  Categories: Image Prompts, Video Prompts, Workflows, AI Agent Prompts
                </div>
              </div>
              <Button
                onClick={handleInitializeCategories}
                disabled={isInitializing}
                className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
              >
                {isInitializing ? '🔄 Initializing...' : '🚀 Initialize Categories'}
              </Button>
            </div>

            {/* Categories Display */}
            {isLoading ? (
              <div className="text-center py-8">
                <div className="text-gray-500">Loading categories...</div>
              </div>
            ) : categories.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <div className="text-gray-500 mb-2">🗂️ No categories found</div>
                <div className="text-sm text-gray-400">
                  Click "Initialize Categories" to set up the marketplace
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Available Categories ({categories.length})
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {categories.map((category: Category) => (
                    <Card key={category.id} className="border border-gray-200 hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <Badge variant="secondary" className="mb-2">
                            {category.name}
                          </Badge>
                        </div>
                        {category.description && (
                          <p className="text-sm text-gray-600 mb-3">
                            {category.description}
                          </p>
                        )}
                        <div className="text-xs text-gray-400">
                          Created: {category.created_at.toLocaleDateString()}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Coming Soon Section */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-t-lg">
            <CardTitle className="text-2xl">🔮 Coming Soon</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl mb-2">🛒</div>
                <h3 className="font-semibold text-gray-900 mb-1">Browse Agents</h3>
                <p className="text-sm text-gray-600">Discover AI agents across all categories</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl mb-2">💳</div>
                <h3 className="font-semibold text-gray-900 mb-1">Credit System</h3>
                <p className="text-sm text-gray-600">Buy credits and purchase agents</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl mb-2">🎯</div>
                <h3 className="font-semibold text-gray-900 mb-1">Creator Tools</h3>
                <p className="text-sm text-gray-600">List and manage your AI agents</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default App;