# Runbook de Incidentes — FlowDesk

## Objetivo
Padronizar resposta a incidentes para reduzir tempo de detecção, resposta e recuperação, preservando comunicação clara com clientes.

## Escopo
Aplica-se a incidentes de produção com impacto em disponibilidade, latência, falhas de autenticação, billing e perda/degradação de funcionalidades críticas.

## Níveis de severidade

### SEV-1 (Crítico)
- Indisponibilidade generalizada ou risco de perda de dados.
- Exemplo: app fora do ar, falha total de login, falha sistêmica em cobrança.
- Meta de resposta: até 2h.

### SEV-2 (Alto)
- Funcionalidade principal degradada para parte relevante dos clientes.
- Exemplo: latência elevada persistente, falhas frequentes em criação de tickets/projetos.
- Meta de resposta: até 8h.

### SEV-3 (Médio)
- Impacto localizado com workaround disponível.
- Exemplo: erro em fluxo secundário sem bloqueio total.
- Meta de resposta: até 24h.

## Gatilhos automáticos (alertas pró-ativos)
Incidente potencial quando houver:
- Taxa de erro >= 10% (24h)
- Disponibilidade estimada < 99%
- Latência P95 >= 2000ms

Fonte atual: dashboard operacional e alertas críticos na tela de configurações.

## Processo operacional

### 1) Detectar
- Confirmar alerta automático ou reporte de cliente.
- Validar impacto e classificar severidade inicial.

### 2) Triage (até 15 min)
- Identificar escopo: quais rotas/fluxos, quais clientes, desde quando.
- Priorizar contenção imediata (feature flag, rollback, desativação parcial).

### 3) Contenção
- Aplicar mitigação que reduza impacto rápido.
- Registrar decisão e horário no log de incidente.

### 4) Correção
- Corrigir causa raiz com mudança mínima e segura.
- Revisar riscos de regressão antes do deploy.

### 5) Validação
- Confirmar recuperação de métricas (erro, latência, disponibilidade).
- Validar fluxos críticos: login, projetos, tickets e billing.

### 6) Encerramento e pós-mortem
- Fechar incidente somente com estabilidade confirmada.
- Registrar causa raiz, ação corretiva e ação preventiva.

## Papéis mínimos
- Incident Commander: coordena resposta e decisões.
- Executor Técnico: implementa mitigação/correção.
- Comunicação: consolida status para clientes/stakeholders.

Em operação enxuta, uma mesma pessoa pode acumular papéis.

## Checklist de evidências
- Horário de início e detecção
- Severidade e impacto
- Mitigação aplicada
- Correção definitiva
- Horário de normalização
- Causa raiz
- Ações preventivas

## Revisão
- Revisar este runbook trimestralmente.
- Rodar simulado de incidente pelo menos 1 vez por trimestre.

## Comunicação durante indisponibilidade
- Seguir o processo definido em `doc/INCIDENT_COMMUNICATION.md`.
- Publicar primeiro aviso em até 15 minutos após confirmação do incidente relevante.
- Atualizar conforme cadência por severidade (SEV-1: 30 min, SEV-2: 60 min).
- Encerrar com comunicado de normalização e referência ao pós-incidente.
