interface OptimisticUpdateOptions {
  applyOptimistic: () => void;
  commit: () => Promise<void>;
  rollback: () => void;
  onError?: (error: unknown) => void;
}

export async function executeOptimisticUpdate({
  applyOptimistic,
  commit,
  rollback,
  onError,
}: OptimisticUpdateOptions): Promise<boolean> {
  applyOptimistic();

  try {
    await commit();
    return true;
  } catch (error) {
    rollback();
    onError?.(error);
    return false;
  }
}