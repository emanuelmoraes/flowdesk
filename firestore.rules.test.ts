import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const rules = readFileSync(join(process.cwd(), 'firestore.rules'), 'utf8');

describe('firestore.rules - regressão de permissões', () => {
  it('mantém política deny-by-default no fallback global', () => {
    expect(rules).toContain('match /{document=**} {');
    expect(rules).toContain('allow read, write: if false;');
  });

  it('restringe leitura/escrita de projeto por member/owner/roles elevadas', () => {
    expect(rules).toContain('allow read: if isProjectMember(projectId) || canManageAllProjects();');
    expect(rules).toContain('allow update: if (isProjectOwner(projectId) || canManageAllProjects())');
    expect(rules).toContain('allow delete: if isProjectOwner(projectId) || canDeleteProjects();');
  });

  it('restringe tickets ao contexto do projeto e valida campos críticos', () => {
    expect(rules).toContain('allow read: if signedIn()');
    expect(rules).toContain('(isProjectMember(resource.data.projectId) || canManageAllProjects())');
    expect(rules).toContain('request.resource.data.projectId == resource.data.projectId');
    expect(rules).toContain('request.resource.data.updatedAt == request.time');
  });

  it('impede elevação de privilégio de role por usuário comum', () => {
    expect(rules).toContain('(canManageUsers() || request.resource.data.role == resource.data.role)');
    expect(rules).toContain('allow read: if signedIn() && (request.auth.uid == userId || canManageUsers());');
  });

  it('limita acesso a logs e reforça janela de retenção', () => {
    expect(rules).toContain('allow read: if canManageUsers();');
    expect(rules).toContain("request.resource.data.retentionUntil >= request.time + duration.value(30, 'd')");
    expect(rules).toContain("request.resource.data.retentionUntil <= request.time + duration.value(365, 'd')");
  });
});