import { beforeEach, describe, expect, it, vi } from 'vitest';

const firestoreMocks = vi.hoisted(() => ({
  collectionMock: vi.fn(),
  addDocMock: vi.fn(),
  updateDocMock: vi.fn(),
  docMock: vi.fn(),
  getDocMock: vi.fn(),
  serverTimestampMock: vi.fn(),
  queryMock: vi.fn(),
  whereMock: vi.fn(),
  orderByMock: vi.fn(),
  limitMock: vi.fn(),
  getDocsMock: vi.fn(),
  writeBatchMock: vi.fn(),
}));

vi.mock('@/lib/firebase', () => ({
  db: {},
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

vi.mock('firebase/firestore', () => ({
  collection: firestoreMocks.collectionMock,
  addDoc: firestoreMocks.addDocMock,
  updateDoc: firestoreMocks.updateDocMock,
  deleteDoc: vi.fn(),
  doc: firestoreMocks.docMock,
  getDoc: firestoreMocks.getDocMock,
  serverTimestamp: firestoreMocks.serverTimestampMock,
  query: firestoreMocks.queryMock,
  where: firestoreMocks.whereMock,
  orderBy: firestoreMocks.orderByMock,
  limit: firestoreMocks.limitMock,
  getDocs: firestoreMocks.getDocsMock,
  writeBatch: firestoreMocks.writeBatchMock,
}));

import {
  addProjectMember,
  createProject,
  createTicket,
  updateTicket,
  moveTicket,
  reorderTickets,
} from './services';

describe('services - fluxos críticos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    firestoreMocks.collectionMock.mockReturnValue('collection-ref');
    firestoreMocks.queryMock.mockReturnValue('query-ref');
    firestoreMocks.whereMock.mockReturnValue('where-ref');
    firestoreMocks.orderByMock.mockReturnValue('order-by-ref');
    firestoreMocks.limitMock.mockReturnValue('limit-ref');
    firestoreMocks.docMock.mockReturnValue('doc-ref');
    firestoreMocks.getDocMock.mockResolvedValue({
      exists: () => false,
      data: () => ({}),
    });
    firestoreMocks.serverTimestampMock.mockReturnValue('server-ts');
    firestoreMocks.updateDocMock.mockResolvedValue(undefined);
  });

  it('cria projeto com dados normalizados', async () => {
    firestoreMocks.getDocsMock
      .mockResolvedValueOnce({ empty: true, docs: [] })
      .mockResolvedValueOnce({ empty: true, docs: [] });
    firestoreMocks.addDocMock.mockResolvedValueOnce({ id: 'project-1' });

    const id = await createProject('  Projeto    FlowDesk ', ' Projeto FlowDesk ', '  Descrição ', 'user-1');

    expect(id).toBe('project-1');
    expect(firestoreMocks.addDocMock).toHaveBeenCalledWith(
      'collection-ref',
      expect.objectContaining({
        workspaceId: 'user-1',
        name: 'Projeto FlowDesk',
        slug: 'projeto-flowdesk',
        description: 'Descrição',
        ownerId: 'user-1',
        members: ['user-1'],
        createdAt: 'server-ts',
        updatedAt: 'server-ts',
      })
    );
  });

  it('bloqueia criação de projeto com slug duplicado', async () => {
    firestoreMocks.getDocsMock
      .mockResolvedValueOnce({ empty: true, docs: [] })
      .mockResolvedValueOnce({ empty: false, docs: [{ id: 'existing' }] });

    await expect(createProject('Projeto', 'projeto', 'Desc', 'user-1')).rejects.toThrow('Este slug já está em uso');
    expect(firestoreMocks.addDocMock).not.toHaveBeenCalled();
  });

  it('bloqueia criação de projeto quando limite do plano é atingido', async () => {
    firestoreMocks.getDocsMock.mockResolvedValueOnce({
      empty: false,
      docs: [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }],
    });

    await expect(createProject('Projeto', 'projeto', 'Desc', 'user-1')).rejects.toThrow(
      'Limite do plano Free atingido para criação de projetos'
    );
  });

  it('cria ticket com ordem incremental e tags sanitizadas', async () => {
    firestoreMocks.getDocMock.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ ownerId: 'owner-1' }),
    });
    firestoreMocks.getDocsMock
      .mockResolvedValueOnce({ empty: false, docs: new Array(10).fill({}) })
      .mockResolvedValueOnce({
        empty: false,
        docs: [{ data: () => ({ order: 4 }) }],
      });
    firestoreMocks.addDocMock.mockResolvedValueOnce({ id: 'ticket-1' });

    const id = await createTicket(
      'project-1',
      '  Corrigir    bug crítico ',
      '  detalhar causa ',
      'todo',
      'high',
      'bug',
      [' backend ', 'backend', '', 'frontend']
    );

    expect(id).toBe('ticket-1');
    expect(firestoreMocks.addDocMock).toHaveBeenCalledWith(
      'collection-ref',
      expect.objectContaining({
        projectId: 'project-1',
        title: 'Corrigir bug crítico',
        description: 'detalhar causa',
        status: 'todo',
        priority: 'high',
        type: 'bug',
        tags: ['backend', 'frontend'],
        order: 5,
      })
    );
  });

  it('bloqueia criação de ticket quando limite do plano é atingido', async () => {
    firestoreMocks.getDocMock.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ ownerId: 'owner-1' }),
    });
    firestoreMocks.getDocsMock.mockResolvedValueOnce({ empty: false, docs: new Array(50).fill({}) });

    await expect(
      createTicket('project-1', 'Ticket', 'Desc', 'todo', 'medium', 'tarefa', [])
    ).rejects.toThrow('Limite do plano Free atingido para criação de tickets neste projeto');
  });

  it('bloqueia adição de membro quando limite do plano é atingido', async () => {
    firestoreMocks.getDocMock
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ ownerId: 'owner-1', members: ['owner-1'] }),
      })
      .mockResolvedValueOnce({
        exists: () => false,
        data: () => ({}),
      });

    await expect(addProjectMember('project-1', 'member-2')).rejects.toThrow(
      'Limite do plano Free atingido para membros neste projeto'
    );
  });

  it('edita ticket validando dados inválidos antes de persistir', async () => {
    const invalidUpdates = JSON.parse('{"status":"status-invalido"}');

    await expect(
      updateTicket('ticket-1', invalidUpdates)
    ).rejects.toThrow('Status inválido');

    expect(firestoreMocks.updateDocMock).not.toHaveBeenCalled();
  });

  it('move ticket atualizando status e ordem', async () => {
    await moveTicket('ticket-1', 'done', 8);

    expect(firestoreMocks.updateDocMock).toHaveBeenCalledWith(
      'doc-ref',
      expect.objectContaining({
        status: 'done',
        order: 8,
        updatedAt: 'server-ts',
      })
    );
  });

  it('reordena múltiplos tickets de forma atômica', async () => {
    const batchUpdate = vi.fn();
    const batchCommit = vi.fn().mockResolvedValue(undefined);
    firestoreMocks.writeBatchMock.mockReturnValue({
      update: batchUpdate,
      commit: batchCommit,
    });

    await reorderTickets([
      { id: 't1', order: 1, status: 'todo' },
      { id: 't2', order: 2 },
    ]);

    expect(batchUpdate).toHaveBeenCalledTimes(2);
    expect(batchCommit).toHaveBeenCalledTimes(1);
  });
});