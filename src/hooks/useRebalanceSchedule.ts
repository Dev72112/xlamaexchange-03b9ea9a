import { useState, useCallback } from 'react';
import { createWalletClient } from '@/lib/supabaseWithWallet';
import { useMultiWallet } from '@/contexts/MultiWalletContext';
import { toast } from 'sonner';

export interface RebalanceSchedule {
  id: string;
  user_address: string;
  name: string;
  target_allocations: Record<string, number>;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  threshold_percent: number;
  next_execution: string;
  last_execution: string | null;
  status: 'active' | 'paused' | 'cancelled';
  chains: string;
  slippage: string;
  total_rebalances: number;
  created_at: string;
  updated_at: string;
}

export interface CreateScheduleParams {
  name: string;
  targetAllocations: Record<string, number>;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  thresholdPercent: number;
  chains: string;
  slippage?: string;
}

function getNextExecutionDate(frequency: string): Date {
  const now = new Date();
  switch (frequency) {
    case 'daily':
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    case 'weekly':
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    case 'biweekly':
      return new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    case 'monthly':
      return new Date(now.setMonth(now.getMonth() + 1));
    default:
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  }
}

export function useRebalanceSchedule() {
  const { activeAddress, isConnected } = useMultiWallet();
  const [schedules, setSchedules] = useState<RebalanceSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchSchedules = useCallback(async () => {
    if (!activeAddress) return [];

    setIsLoading(true);
    try {
      const client = createWalletClient(activeAddress);
      const { data, error } = await client
        .from('rebalance_schedules')
        .select('*')
        .eq('user_address', activeAddress.toLowerCase())
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSchedules((data as RebalanceSchedule[]) || []);
      return (data as RebalanceSchedule[]) || [];
    } catch (err) {
      console.error('Failed to fetch rebalance schedules:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [activeAddress]);

  const createSchedule = useCallback(async (params: CreateScheduleParams): Promise<RebalanceSchedule | null> => {
    if (!activeAddress) {
      toast.error('Wallet not connected');
      return null;
    }

    try {
      const client = createWalletClient(activeAddress);
      const nextExecution = getNextExecutionDate(params.frequency);

      const { data, error } = await client
        .from('rebalance_schedules')
        .insert({
          user_address: activeAddress.toLowerCase(),
          name: params.name,
          target_allocations: params.targetAllocations,
          frequency: params.frequency,
          threshold_percent: params.thresholdPercent,
          next_execution: nextExecution.toISOString(),
          chains: params.chains,
          slippage: params.slippage || '0.5',
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Rebalance schedule created');
      await fetchSchedules();
      return data as RebalanceSchedule;
    } catch (err) {
      console.error('Failed to create schedule:', err);
      toast.error('Failed to create schedule');
      return null;
    }
  }, [activeAddress, fetchSchedules]);

  const pauseSchedule = useCallback(async (scheduleId: string): Promise<boolean> => {
    if (!activeAddress) return false;

    try {
      const client = createWalletClient(activeAddress);
      const { error } = await client
        .from('rebalance_schedules')
        .update({ status: 'paused' })
        .eq('id', scheduleId)
        .eq('user_address', activeAddress.toLowerCase());

      if (error) throw error;

      toast.success('Schedule paused');
      await fetchSchedules();
      return true;
    } catch (err) {
      console.error('Failed to pause schedule:', err);
      toast.error('Failed to pause schedule');
      return false;
    }
  }, [activeAddress, fetchSchedules]);

  const resumeSchedule = useCallback(async (scheduleId: string): Promise<boolean> => {
    if (!activeAddress) return false;

    try {
      const client = createWalletClient(activeAddress);
      const nextExecution = new Date();
      nextExecution.setHours(nextExecution.getHours() + 1);

      const { error } = await client
        .from('rebalance_schedules')
        .update({ 
          status: 'active',
          next_execution: nextExecution.toISOString(),
        })
        .eq('id', scheduleId)
        .eq('user_address', activeAddress.toLowerCase());

      if (error) throw error;

      toast.success('Schedule resumed');
      await fetchSchedules();
      return true;
    } catch (err) {
      console.error('Failed to resume schedule:', err);
      toast.error('Failed to resume schedule');
      return false;
    }
  }, [activeAddress, fetchSchedules]);

  const cancelSchedule = useCallback(async (scheduleId: string): Promise<boolean> => {
    if (!activeAddress) return false;

    try {
      const client = createWalletClient(activeAddress);
      const { error } = await client
        .from('rebalance_schedules')
        .update({ status: 'cancelled' })
        .eq('id', scheduleId)
        .eq('user_address', activeAddress.toLowerCase());

      if (error) throw error;

      toast.success('Schedule cancelled');
      await fetchSchedules();
      return true;
    } catch (err) {
      console.error('Failed to cancel schedule:', err);
      toast.error('Failed to cancel schedule');
      return false;
    }
  }, [activeAddress, fetchSchedules]);

  const updateSchedule = useCallback(async (
    scheduleId: string, 
    updates: Partial<Pick<RebalanceSchedule, 'name' | 'frequency' | 'threshold_percent' | 'slippage'>>
  ): Promise<boolean> => {
    if (!activeAddress) return false;

    try {
      const client = createWalletClient(activeAddress);
      const { error } = await client
        .from('rebalance_schedules')
        .update(updates)
        .eq('id', scheduleId)
        .eq('user_address', activeAddress.toLowerCase());

      if (error) throw error;

      toast.success('Schedule updated');
      await fetchSchedules();
      return true;
    } catch (err) {
      console.error('Failed to update schedule:', err);
      toast.error('Failed to update schedule');
      return false;
    }
  }, [activeAddress, fetchSchedules]);

  return {
    schedules,
    isLoading,
    isConnected,
    fetchSchedules,
    createSchedule,
    pauseSchedule,
    resumeSchedule,
    cancelSchedule,
    updateSchedule,
  };
}
