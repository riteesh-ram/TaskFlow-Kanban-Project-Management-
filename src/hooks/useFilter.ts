import { useCallback, useState } from 'react';

// Generic search + tags filter hook.
export function useFilter() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  const toggleFilter = useCallback((filter: string) => {
    setActiveFilters((prev) => (prev.includes(filter) ? prev.filter((f) => f !== filter) : [...prev, filter]));
  }, []);

  const filterItems = useCallback(
    <T extends { title?: string; description?: string; labels?: string[] }>(items: T[]) => {
      let filtered = items;

      if (searchQuery) {
        filtered = filtered.filter((item) => {
          const title = item.title || '';
          const description = item.description || '';
          return title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            description.toLowerCase().includes(searchQuery.toLowerCase());
        });
      }

      if (activeFilters.length > 0) {
        filtered = filtered.filter((item) => item.labels?.some((label) => activeFilters.includes(label)));
      }

      return filtered;
    },
    [activeFilters, searchQuery]
  );

  return {
    searchQuery,
    setSearchQuery,
    activeFilters,
    toggleFilter,
    filterItems,
  };
}
