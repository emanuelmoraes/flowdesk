'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import { FaHouse, FaClock, FaTicket } from 'react-icons/fa6';

export default function ParaVocePage() {
  return (
    <ProtectedRoute>
      <ParaVoceContent />
    </ProtectedRoute>
  );
}

function ParaVoceContent() {
  return (
    <AppLayout title="Para você">
      <main className="container mx-auto px-4 py-8">
        {/* Placeholder - Em desenvolvimento */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <div className="text-6xl mb-4 text-blue-600 flex justify-center">
              <FaHouse />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Em breve!</h2>
            <p className="text-gray-600 mb-6">
              Esta página está em desenvolvimento. Aqui você verá seus projetos recentes e últimos tickets.
            </p>
            
            {/* Preview do que virá */}
            <div className="grid md:grid-cols-2 gap-6 mt-8 text-left">
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <div className="flex items-center gap-3 mb-4">
                  <FaClock className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-900">Projetos Recentes</h3>
                </div>
                <p className="text-sm text-gray-600">
                  Acesso rápido aos últimos projetos que você trabalhou.
                </p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <div className="flex items-center gap-3 mb-4">
                  <FaTicket className="w-5 h-5 text-green-600" />
                  <h3 className="font-semibold text-gray-900">Últimos Tickets</h3>
                </div>
                <p className="text-sm text-gray-600">
                  Visualize os tickets mais recentes de todos os seus projetos.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </AppLayout>
  );
}
