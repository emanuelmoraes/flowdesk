import { describe, expect, it, vi } from 'vitest';
import { executeOptimisticUpdate } from './optimistic';

describe('executeOptimisticUpdate', () => {
  it('aplica estado otimista e confirma em sucesso', async () => {
    const applyOptimistic = vi.fn();
    const commit = vi.fn().mockResolvedValue(undefined);
    const rollback = vi.fn();

    const success = await executeOptimisticUpdate({
      applyOptimistic,
      commit,
      rollback,
    });

    expect(success).toBe(true);
    expect(applyOptimistic).toHaveBeenCalledTimes(1);
    expect(commit).toHaveBeenCalledTimes(1);
    expect(rollback).not.toHaveBeenCalled();
  });

  it('faz rollback e dispara callback em falha', async () => {
    const applyOptimistic = vi.fn();
    const rollback = vi.fn();
    const error = new Error('falhou');
    const commit = vi.fn().mockRejectedValue(error);
    const onError = vi.fn();

    const success = await executeOptimisticUpdate({
      applyOptimistic,
      commit,
      rollback,
      onError,
    });

    expect(success).toBe(false);
    expect(applyOptimistic).toHaveBeenCalledTimes(1);
    expect(commit).toHaveBeenCalledTimes(1);
    expect(rollback).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(error);
  });
});