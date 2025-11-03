import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          {/* Header */}
          <div className="mb-16">
            <h1 className="text-6xl font-bold text-gray-900 mb-4">
              Flow<span className="text-blue-600">Desk</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Gerencie seus projetos de forma simples e eficiente
            </p>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <div className="text-4xl mb-4">📋</div>
              <h3 className="text-xl font-semibold mb-2">Kanban Intuitivo</h3>
              <p className="text-gray-600">
                Arraste e solte seus tickets entre colunas facilmente
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <div className="text-4xl mb-4">🔗</div>
              <h3 className="text-xl font-semibold mb-2">URL Dedicada</h3>
              <p className="text-gray-600">
                Cada projeto tem sua própria URL para acesso rápido
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="text-xl font-semibold mb-2">Em Tempo Real</h3>
              <p className="text-gray-600">
                Powered by Firebase para atualizações instantâneas
              </p>
            </div>
          </div>

          {/* CTA */}
          <div className="space-y-4">
            <Link
              href="/projetos"
              className="inline-block bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
            >
              Gerenciar Projetos
            </Link>
            
            <p className="text-sm text-gray-500">
              Ou acesse diretamente: flowdesk.com/<span className="font-mono text-blue-600">seu-projeto</span>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
