import { useState, useEffect } from 'react';
import { WorkflowRun } from '@/types/api';
import { getRunHistory } from '@/api/github';

export const useRunHistory = (actionId: string | null) => {
  const [runHistory, setRunHistory] = useState<WorkflowRun[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    if (actionId) {
      setIsLoading(true);
      getRunHistory(actionId)
        .then(setRunHistory)
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }
  }, [actionId]);
  
  return { runHistory, isLoading };
};
