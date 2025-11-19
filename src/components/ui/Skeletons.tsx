export function ProjectCardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden animate-pulse">
      <div className="p-6">
        {/* Nome do Projeto */}
        <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
        
        {/* URL */}
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
        
        {/* Progresso */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="h-4 bg-gray-200 rounded w-20"></div>
            <div className="h-4 bg-gray-200 rounded w-10"></div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5"></div>
          <div className="h-3 bg-gray-200 rounded w-32 mt-1"></div>
        </div>
        
        {/* Data */}
        <div className="h-3 bg-gray-200 rounded w-40 mb-4"></div>
        
        {/* Botões */}
        <div className="flex gap-2">
          <div className="flex-1 h-10 bg-gray-200 rounded-lg"></div>
          <div className="flex-1 h-10 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    </div>
  );
}

export function KanbanBoardSkeleton() {
  return (
    <div className="hidden lg:flex gap-4 h-[calc(100vh-200px)]">
      {[1, 2, 3, 4, 5].map((col) => (
        <div key={col} className="flex-1 rounded-lg border-2 border-gray-200 bg-gray-50 animate-pulse">
          <div className="p-4">
            {/* Header da coluna */}
            <div className="flex items-center justify-between mb-4">
              <div className="h-6 bg-gray-300 rounded w-24"></div>
              <div className="h-6 w-6 bg-gray-300 rounded-full"></div>
            </div>
            
            {/* Cards */}
            <div className="space-y-3">
              {[1, 2, 3].map((card) => (
                <div key={card} className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="h-4 bg-gray-200 rounded w-16 mb-2"></div>
                  <div className="h-5 bg-gray-300 rounded w-full mb-2"></div>
                  <div className="flex gap-1 mb-3">
                    <div className="h-5 bg-gray-200 rounded w-12"></div>
                    <div className="h-5 bg-gray-200 rounded w-16"></div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="h-5 bg-gray-200 rounded w-16"></div>
                    <div className="h-6 w-6 bg-gray-300 rounded-full"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {[1, 2, 3, 4, 5, 6, 7].map((col) => (
              <th key={col} className="px-6 py-3">
                <div className="h-4 bg-gray-300 rounded w-20 animate-pulse"></div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {Array.from({ length: rows }).map((_, idx) => (
            <tr key={idx} className="animate-pulse">
              <td className="px-6 py-4">
                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              </td>
              <td className="px-6 py-4">
                <div className="h-6 bg-gray-200 rounded w-20"></div>
              </td>
              <td className="px-6 py-4">
                <div className="h-6 bg-gray-200 rounded-full w-20"></div>
              </td>
              <td className="px-6 py-4">
                <div className="h-6 bg-gray-200 rounded-full w-16"></div>
              </td>
              <td className="px-6 py-4">
                <div className="h-5 bg-gray-200 rounded w-12"></div>
              </td>
              <td className="px-6 py-4">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
              </td>
              <td className="px-6 py-4">
                <div className="flex gap-2">
                  <div className="h-4 bg-gray-200 rounded w-12"></div>
                  <div className="h-4 bg-gray-200 rounded w-12"></div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
