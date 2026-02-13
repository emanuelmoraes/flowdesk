# Processo de Comunicação de Indisponibilidade — FlowDesk

## Objetivo
Garantir comunicação rápida, consistente e transparente durante indisponibilidades e degradações relevantes.

## Quando acionar
Acionar comunicação externa quando ocorrer pelo menos uma das condições:
- SEV-1 (indisponibilidade crítica)
- SEV-2 com impacto em fluxo principal por mais de 15 minutos
- Risco concreto de perda de dados
- Falha em login, criação de projeto/ticket ou billing para parcela relevante de clientes

## Canais oficiais
- In-app: aviso na Central de Ajuda / área de suporte
- Email: comunicação para clientes impactados
- Página de status (quando disponível)

## Responsabilidades
- Incident Commander: aprova conteúdo e momento das comunicações
- Responsável por Comunicação: publica e atualiza os comunicados
- Executor Técnico: informa status técnico e ETA estimado

Em operação enxuta, os papéis podem ser acumulados.

## Cadência recomendada

### Primeira comunicação
- Até 15 minutos após confirmação do incidente
- Conteúdo mínimo:
  - o que está acontecendo
  - quem pode ser impactado
  - status atual de investigação
  - próximo horário de atualização

### Atualizações recorrentes
- SEV-1: a cada 30 minutos
- SEV-2: a cada 60 minutos
- SEV-3: quando houver mudança relevante

### Comunicação de resolução
- Enviar quando a estabilidade for confirmada
- Incluir janela do incidente, impacto e ações preventivas iniciais

## Templates

### Template — Primeiro aviso
Assunto: [FlowDesk] Investigando indisponibilidade parcial

Mensagem:
"Identificamos uma instabilidade que pode afetar [fluxo impactado]. Nossa equipe já está atuando com prioridade.
Próxima atualização prevista: [horário]."

### Template — Atualização
Assunto: [FlowDesk] Atualização sobre instabilidade em andamento

Mensagem:
"Seguimos trabalhando na estabilização de [fluxo impactado]. Status atual: [mitigação em andamento / correção aplicada em validação].
Próxima atualização prevista: [horário]."

### Template — Resolução
Assunto: [FlowDesk] Estabilidade restabelecida

Mensagem:
"A instabilidade em [fluxo impactado] foi normalizada às [horário].
Impacto observado: [resumo].
Continuaremos monitorando e publicaremos ações preventivas adicionais no pós-incidente."

## Checklist operacional
- [ ] Classificar severidade (SEV-1/SEV-2/SEV-3)
- [ ] Definir porta-voz do incidente
- [ ] Publicar primeiro aviso dentro do prazo
- [ ] Executar cadência de atualizações
- [ ] Publicar encerramento com horário de normalização
- [ ] Registrar comunicação no histórico do incidente

## Revisão
- Revisar este processo trimestralmente
- Validar templates em simulado de incidente
