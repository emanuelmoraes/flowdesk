'use client';

import { useEffect, useMemo, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import { FaCreditCard, FaCheck, FaStar, FaRocket } from 'react-icons/fa6';
import { PLAN_LIST, formatPlanPriceBRL } from '@/lib/plans';
import { useAuth } from '@/hooks/useAuth';
import { useNotification } from '@/hooks/useNotification';
import { SubscriptionPlanId } from '@/types';
import { getUserFacingErrorMessage } from '@/lib/errorHandling';

type BillingInvoice = {
  id: string;
  number: string | null;
  status: string | null;
  amountPaid: number;
  amountDue: number;
  currency: string;
  created: number;
  hostedInvoiceUrl: string | null;
  invoicePdf: string | null;
};

type BillingSubscription = {
  id: string;
  status: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: number | null;
  plan: SubscriptionPlanId | null;
};

type BillingHistoryApiResponse = {
  subscription: BillingSubscription | null;
  invoices: BillingInvoice[];
  error?: string;
};

type BillingUrlApiResponse = {
  url?: string;
  error?: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const isSubscriptionPlanId = (value: unknown): value is SubscriptionPlanId => {
  return value === 'free' || value === 'pro' || value === 'team';
};

const parseBillingUrlResponse = (value: unknown): BillingUrlApiResponse => {
  if (!isRecord(value)) {
    return {};
  }

  return {
    url: typeof value.url === 'string' ? value.url : undefined,
    error: typeof value.error === 'string' ? value.error : undefined,
  };
};

const parseBillingHistoryResponse = (value: unknown): BillingHistoryApiResponse => {
  if (!isRecord(value)) {
    return { subscription: null, invoices: [] };
  }

  const subscription = isRecord(value.subscription)
    ? {
        id: typeof value.subscription.id === 'string' ? value.subscription.id : '',
        status: typeof value.subscription.status === 'string' ? value.subscription.status : '',
        cancelAtPeriodEnd: Boolean(value.subscription.cancelAtPeriodEnd),
        currentPeriodEnd:
          typeof value.subscription.currentPeriodEnd === 'number'
            ? value.subscription.currentPeriodEnd
            : null,
        plan: isSubscriptionPlanId(value.subscription.plan) ? value.subscription.plan : null,
      }
    : null;

  const invoices = Array.isArray(value.invoices)
    ? value.invoices.filter((invoice): invoice is BillingInvoice => {
        if (!isRecord(invoice)) {
          return false;
        }

        return (
          typeof invoice.id === 'string' &&
          (typeof invoice.number === 'string' || invoice.number === null) &&
          (typeof invoice.status === 'string' || invoice.status === null) &&
          typeof invoice.amountPaid === 'number' &&
          typeof invoice.amountDue === 'number' &&
          typeof invoice.currency === 'string' &&
          typeof invoice.created === 'number' &&
          (typeof invoice.hostedInvoiceUrl === 'string' || invoice.hostedInvoiceUrl === null) &&
          (typeof invoice.invoicePdf === 'string' || invoice.invoicePdf === null)
        );
      })
    : [];

  return {
    subscription,
    invoices,
    error: typeof value.error === 'string' ? value.error : undefined,
  };
};

const formatSlaHours = (hours: number): string => {
  if (hours < 24) {
    return `${hours}h`;
  }

  if (hours % 24 === 0) {
    return `${hours / 24} dia${hours / 24 > 1 ? 's' : ''}`;
  }

  return `${hours}h`;
};

export default function PlanosPage() {
  return (
    <ProtectedRoute>
      <PlanosContent />
    </ProtectedRoute>
  );
}

function PlanosContent() {
  const { user, userProfile } = useAuth();
  const { showError } = useNotification();
  const [processingPlan, setProcessingPlan] = useState<SubscriptionPlanId | null>(null);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [subscription, setSubscription] = useState<BillingSubscription | null>(null);

  const currentPlan = isSubscriptionPlanId(userProfile?.plan) ? userProfile.plan : 'free';

  const subscriptionStatusLabel = useMemo(() => {
    const status = subscription?.status || userProfile?.subscriptionStatus;
    if (!status) {
      return 'Sem assinatura ativa';
    }

    const labels: Record<string, string> = {
      active: 'Ativa',
      trialing: 'Período de teste',
      past_due: 'Pagamento pendente',
      canceled: 'Cancelada',
      incomplete: 'Incompleta',
      unpaid: 'Não paga',
    };

    return labels[status] || status;
  }, [subscription?.status, userProfile?.subscriptionStatus]);

  const loadBillingHistory = async () => {
    setLoadingHistory(true);

    try {
      const token = await getAuthToken();
      if (!token) {
        return;
      }

      const response = await fetch('/api/billing/history', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const responseBody: unknown = await response.json();
      const data = parseBillingHistoryResponse(responseBody);

      if (!response.ok) {
        throw new Error(data.error || 'Não foi possível carregar histórico de cobrança');
      }

      setSubscription(data.subscription);
      setInvoices(data.invoices || []);
      setHistoryLoaded(true);
    } catch (error) {
      showError(getUserFacingErrorMessage(error, 'Erro ao carregar histórico de cobrança.'));
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (user && !historyLoaded) {
      loadBillingHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, historyLoaded]);

  const getAuthToken = async (): Promise<string | null> => {
    if (!user) {
      showError('Você precisa estar autenticado para gerenciar assinatura.');
      return null;
    }

    return user.getIdToken();
  };

  const handleCheckout = async (planId: SubscriptionPlanId) => {
    if (planId === 'free') {
      return;
    }

    setProcessingPlan(planId);

    try {
      const token = await getAuthToken();
      if (!token) {
        return;
      }

      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ planId }),
      });

      const responseBody: unknown = await response.json();
      const data = parseBillingUrlResponse(responseBody);
      if (!response.ok || !data.url) {
        throw new Error(data.error || 'Não foi possível iniciar o checkout');
      }

      window.location.href = data.url;
    } catch (error) {
      showError(getUserFacingErrorMessage(error, 'Erro ao iniciar pagamento.'));
    } finally {
      setProcessingPlan(null);
    }
  };

  const handleOpenPortal = async () => {
    setOpeningPortal(true);

    try {
      const token = await getAuthToken();
      if (!token) {
        return;
      }

      const response = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const responseBody: unknown = await response.json();
      const data = parseBillingUrlResponse(responseBody);
      if (!response.ok || !data.url) {
        throw new Error(data.error || 'Não foi possível abrir o portal de assinatura');
      }

      window.location.href = data.url;
    } catch (error) {
      showError(getUserFacingErrorMessage(error, 'Erro ao abrir o portal de assinatura.'));
    } finally {
      setOpeningPortal(false);
    }
  };

  const getPlanIcon = (planId: string) => {
    if (planId === 'pro') {
      return <FaStar className="w-3 h-3" />;
    }

    if (planId === 'team') {
      return <FaRocket className="w-4 h-4 text-purple-500" />;
    }

    return null;
  };

  return (
    <AppLayout title="Planos">
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4 text-blue-600 flex justify-center">
              <FaCreditCard />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Escolha o plano ideal</h2>
            <p className="text-gray-600">
              Seu plano atual é <span className="font-semibold">{currentPlan.toUpperCase()}</span>.
            </p>
            {currentPlan !== 'free' && (
              <button
                onClick={handleOpenPortal}
                disabled={openingPortal}
                className="mt-4 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
              >
                {openingPortal ? 'Abrindo portal...' : 'Gerenciar assinatura'}
              </button>
            )}
          </div>

          <section className="mb-8 bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Gestão da assinatura</h3>
                <p className="text-sm text-gray-600">
                  Status atual: <span className="font-medium text-gray-800">{subscriptionStatusLabel}</span>
                </p>
                {subscription?.currentPeriodEnd && (
                  <p className="text-sm text-gray-600 mt-1">
                    Ciclo atual até:{' '}
                    <span className="font-medium text-gray-800">
                      {new Date(subscription.currentPeriodEnd * 1000).toLocaleDateString('pt-BR')}
                    </span>
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={loadBillingHistory}
                  disabled={loadingHistory}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
                >
                  {loadingHistory ? 'Atualizando...' : 'Atualizar histórico'}
                </button>
                {currentPlan !== 'free' && (
                  <button
                    onClick={handleOpenPortal}
                    disabled={openingPortal}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
                  >
                    {openingPortal ? 'Abrindo portal...' : 'Gerenciar assinatura'}
                  </button>
                )}
              </div>
            </div>
          </section>
          
          {/* Preview dos planos */}
          <div className="grid md:grid-cols-3 gap-6 mt-8">
            {PLAN_LIST.map((plan) => (
              <div
                key={plan.id}
                className={`bg-white rounded-xl p-6 ${
                  plan.highlighted
                    ? 'shadow-lg border-2 border-blue-500 relative'
                    : 'shadow-sm border border-gray-200'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                      {getPlanIcon(plan.id)} Popular
                    </span>
                  </div>
                )}
                <div className="text-center mb-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center justify-center gap-2">
                    {!plan.highlighted && getPlanIcon(plan.id)} {plan.name}
                  </h3>
                  <p className={`text-3xl font-bold ${plan.highlighted ? 'text-blue-600' : 'text-gray-900'}`}>
                    {formatPlanPriceBRL(plan.monthlyPriceInCents)}
                    <span className="text-base font-normal text-gray-500">/mês</span>
                  </p>
                </div>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-gray-600">
                      <FaCheck className="w-4 h-4 text-green-500" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="mb-6 border border-gray-200 rounded-lg p-3 bg-gray-50">
                  <p className="text-xs font-semibold text-gray-700 mb-2">SLA do plano</p>
                  <ul className="space-y-1 text-xs text-gray-600">
                    <li>Disponibilidade alvo: {plan.sla.uptimeTargetPercent}%</li>
                    <li>Resposta de suporte: até {formatSlaHours(plan.sla.supportResponseHours)}</li>
                    <li>Incidente crítico: até {formatSlaHours(plan.sla.criticalIncidentResponseHours)}</li>
                  </ul>
                </div>

                {plan.id === currentPlan ? (
                  <button disabled className="w-full py-2 px-4 bg-gray-200 text-gray-500 rounded-lg cursor-not-allowed">
                    Plano atual
                  </button>
                ) : plan.id === 'free' ? (
                  <button disabled className="w-full py-2 px-4 bg-gray-200 text-gray-500 rounded-lg cursor-not-allowed">
                    Disponível via portal
                  </button>
                ) : (
                  <button
                    onClick={() => handleCheckout(plan.id)}
                    disabled={processingPlan === plan.id}
                    className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processingPlan === plan.id ? 'Redirecionando...' : 'Assinar agora'}
                  </button>
                )}
              </div>
            ))}
          </div>

          <section className="mt-10 bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Histórico de cobrança</h3>
            </div>

            {invoices.length === 0 ? (
              <div className="px-5 py-8 text-sm text-gray-600 space-y-2">
                <p>
                  {currentPlan === 'free'
                    ? 'Você ainda não tem cobranças porque está no plano Free.'
                    : 'Ainda não encontramos cobranças para esta assinatura.'}
                </p>
                <p className="text-gray-500">
                  {currentPlan === 'free'
                    ? 'Faça upgrade para Pro ou Team para liberar recursos avançados e iniciar seu histórico de cobrança.'
                    : 'Após a primeira cobrança, suas faturas aparecerão aqui automaticamente.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="text-left px-5 py-3 font-medium">Data</th>
                      <th className="text-left px-5 py-3 font-medium">Fatura</th>
                      <th className="text-left px-5 py-3 font-medium">Status</th>
                      <th className="text-left px-5 py-3 font-medium">Valor pago</th>
                      <th className="text-left px-5 py-3 font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((invoice) => (
                      <tr key={invoice.id} className="border-t border-gray-100">
                        <td className="px-5 py-3 text-gray-700">
                          {new Date(invoice.created * 1000).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-5 py-3 text-gray-700">{invoice.number || invoice.id}</td>
                        <td className="px-5 py-3 text-gray-700">{invoice.status || '—'}</td>
                        <td className="px-5 py-3 text-gray-700">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: (invoice.currency || 'brl').toUpperCase(),
                          }).format((invoice.amountPaid || invoice.amountDue || 0) / 100)}
                        </td>
                        <td className="px-5 py-3 text-gray-700">
                          <div className="flex items-center gap-2">
                            {invoice.hostedInvoiceUrl && (
                              <a
                                href={invoice.hostedInvoiceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                Ver fatura
                              </a>
                            )}
                            {invoice.invoicePdf && (
                              <a
                                href={invoice.invoicePdf}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                PDF
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>
    </AppLayout>
  );
}
