import { useState, useCallback } from 'react';
import { lockService } from '@/lib/redis';
import { useAuth } from '@/contexts/AuthContext';
import { v4 as uuidv4 } from 'uuid';

interface OptimisticUpdate<T> {
  id: string;
  type: 'create' | 'update' | 'delete';
  resourceType: string;
  resourceId: string;
  data: T;
  timestamp: number;
  pending: boolean;
  error?: string;
}

export function useOptimisticUpdates<T>() {
  const { user } = useAuth();
  const [pendingUpdates, setPendingUpdates] = useState<OptimisticUpdate<T>[]>([]);

  const addOptimisticUpdate = useCallback((
    type: 'create' | 'update' | 'delete',
    resourceType: string,
    resourceId: string,
    data: T
  ) => {
    const update: OptimisticUpdate<T> = {
      id: uuidv4(),
      type,
      resourceType,
      resourceId,
      data,
      timestamp: Date.now(),
      pending: true
    };

    setPendingUpdates(prev => [...prev, update]);
    return update.id;
  }, []);

  const resolveOptimisticUpdate = useCallback((updateId: string, error?: string) => {
    setPendingUpdates(prev => 
      prev.map(update => 
        update.id === updateId 
          ? { ...update, pending: false, error }
          : update
      ).filter(update => !update.error && !update.pending)
    );
  }, []);

  const performOptimisticUpdate = useCallback(async <R>(
    operation: () => Promise<R>,
    resourceType: string,
    resourceId: string,
    optimisticData: T,
    updateType: 'create' | 'update' | 'delete' = 'update'
  ): Promise<R> => {
    if (!user) throw new Error('User not authenticated');

    // Try to acquire lock for this resource
    const lockKey = `${resourceType}:${resourceId}`;
    const lockAcquired = await lockService.acquireLock(lockKey, user.id, 5000);

    if (!lockAcquired) {
      throw new Error('Resource is being edited by another user');
    }

    // Add optimistic update
    const updateId = addOptimisticUpdate(updateType, resourceType, resourceId, optimisticData);

    try {
      // Perform the actual operation
      const result = await operation();
      
      // Resolve optimistic update on success
      resolveOptimisticUpdate(updateId);
      
      return result;
    } catch (error) {
      // Resolve optimistic update with error
      resolveOptimisticUpdate(updateId, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    } finally {
      // Always release the lock
      await lockService.releaseLock(lockKey, user.id);
    }
  }, [user, addOptimisticUpdate, resolveOptimisticUpdate]);

  const isResourceLocked = useCallback(async (resourceType: string, resourceId: string) => {
    const lockKey = `${resourceType}:${resourceId}`;
    return await lockService.isLocked(lockKey);
  }, []);

  const getResourceLockInfo = useCallback(async (resourceType: string, resourceId: string) => {
    const lockKey = `${resourceType}:${resourceId}`;
    return await lockService.getLockInfo(lockKey);
  }, []);

  return {
    pendingUpdates,
    performOptimisticUpdate,
    isResourceLocked,
    getResourceLockInfo,
    addOptimisticUpdate,
    resolveOptimisticUpdate
  };
}