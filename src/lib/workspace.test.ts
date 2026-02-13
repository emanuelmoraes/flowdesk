import { describe, expect, it } from 'vitest';
import { getPersonalWorkspaceId } from './workspace';

describe('workspace', () => {
  it('usa uid como workspace pessoal padrão', () => {
    expect(getPersonalWorkspaceId('user-123')).toBe('user-123');
  });
});