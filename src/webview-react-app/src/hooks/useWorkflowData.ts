import { useState, useEffect } from 'react';

export const useWorkflowData = (actionId: string | null) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (actionId) {
      setIsLoading(true);
      // In a real implementation, you would fetch data here.
      // For now, just simulate loading.
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 1000); // Simulate 1 second loading time

      return () => clearTimeout(timer);
    }
  }, [actionId]);

  return { isLoading, error, setIsLoading, setError };
};
