'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import { FaCreditCard, FaCheck, FaStar, FaRocket } from 'react-icons/fa6';

export default function PlanosPage() {
  return (
    <ProtectedRoute>
      <PlanosContent />
    </ProtectedRoute>
  );
}

function PlanosContent() {
  return (
    <AppLayout title="Planos">
      <main className="container mx-auto px-4 py-8">
        {/* Placeholder - Em desenvolvimento */}
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4 text-blue-600 flex justify-center">
              <FaCreditCard />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Planos em breve!</h2>
            <p className="text-gray-600">
              Estamos preparando opções incríveis para você. Em breve você poderá escolher o plano ideal.
            </p>
          </div>
          
          {/* Preview dos planos */}
          <div className="grid md:grid-cols-3 gap-6 mt-8">
            {/* Plano Gratuito */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 opacity-60">
              <div className="text-center mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-1">Gratuito</h3>
                <p className="text-3xl font-bold text-gray-900">R$ 0<span className="text-base font-normal text-gray-500">/mês</span></p>
              </div>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-2 text-sm text-gray-600">
                  <FaCheck className="w-4 h-4 text-green-500" />
                  <span>3 projetos</span>
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-600">
                  <FaCheck className="w-4 h-4 text-green-500" />
                  <span>50 tickets por projeto</span>
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-600">
                  <FaCheck className="w-4 h-4 text-green-500" />
                  <span>1 membro por projeto</span>
                </li>
              </ul>
              <button disabled className="w-full py-2 px-4 bg-gray-200 text-gray-500 rounded-lg cursor-not-allowed">
                Em breve
              </button>
            </div>
            
            {/* Plano Pro */}
            <div className="bg-white rounded-xl shadow-lg border-2 border-blue-500 p-6 relative opacity-60">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                  <FaStar className="w-3 h-3" /> Popular
                </span>
              </div>
              <div className="text-center mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-1">Pro</h3>
                <p className="text-3xl font-bold text-blue-600">R$ 29<span className="text-base font-normal text-gray-500">/mês</span></p>
              </div>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-2 text-sm text-gray-600">
                  <FaCheck className="w-4 h-4 text-green-500" />
                  <span>Projetos ilimitados</span>
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-600">
                  <FaCheck className="w-4 h-4 text-green-500" />
                  <span>Tickets ilimitados</span>
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-600">
                  <FaCheck className="w-4 h-4 text-green-500" />
                  <span>5 membros por projeto</span>
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-600">
                  <FaCheck className="w-4 h-4 text-green-500" />
                  <span>Suporte prioritário</span>
                </li>
              </ul>
              <button disabled className="w-full py-2 px-4 bg-gray-200 text-gray-500 rounded-lg cursor-not-allowed">
                Em breve
              </button>
            </div>
            
            {/* Plano Business */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 opacity-60">
              <div className="text-center mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center justify-center gap-2">
                  <FaRocket className="w-4 h-4 text-purple-500" /> Business
                </h3>
                <p className="text-3xl font-bold text-gray-900">R$ 79<span className="text-base font-normal text-gray-500">/mês</span></p>
              </div>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-2 text-sm text-gray-600">
                  <FaCheck className="w-4 h-4 text-green-500" />
                  <span>Tudo do Pro</span>
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-600">
                  <FaCheck className="w-4 h-4 text-green-500" />
                  <span>Membros ilimitados</span>
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-600">
                  <FaCheck className="w-4 h-4 text-green-500" />
                  <span>Relatórios avançados</span>
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-600">
                  <FaCheck className="w-4 h-4 text-green-500" />
                  <span>API de integração</span>
                </li>
              </ul>
              <button disabled className="w-full py-2 px-4 bg-gray-200 text-gray-500 rounded-lg cursor-not-allowed">
                Em breve
              </button>
            </div>
          </div>
        </div>
      </main>
    </AppLayout>
  );
}
