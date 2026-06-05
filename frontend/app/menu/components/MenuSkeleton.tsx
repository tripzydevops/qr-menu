import React from 'react';

export default function MenuSkeleton() {
  return (
    <div className="w-full min-h-screen bg-[#1C1C28] text-white p-4">
      {/* Parallax cover banner skeleton */}
      <div className="w-full h-48 rounded-2xl bg-[#2A2A3D] animate-pulse mb-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#3A3A52] to-transparent -translate-x-full animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
      </div>

      {/* Title / Logo Skeleton */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-20 h-20 rounded-full bg-[#2A2A3D] animate-pulse mb-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#3A3A52] to-transparent -translate-x-full animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
        </div>
        <div className="w-48 h-6 bg-[#2A2A3D] rounded animate-pulse mb-2" />
        <div className="w-32 h-4 bg-[#2A2A3D] rounded animate-pulse" />
      </div>

      {/* Category Nav tabs skeleton */}
      <div className="flex space-x-3 overflow-x-auto pb-4 mb-6 no-scrollbar">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex-shrink-0 w-24 h-10 bg-[#2A2A3D] rounded-full animate-pulse" />
        ))}
      </div>

      {/* Dietary filters skeleton */}
      <div className="flex space-x-2 mb-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="w-20 h-8 bg-[#2A2A3D] rounded-full animate-pulse" />
        ))}
      </div>

      {/* Items list skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex bg-[#16213E]/50 border border-gray-800/30 rounded-2xl p-3 h-32 animate-pulse">
            <div className="flex-grow pr-3 flex flex-col justify-between">
              <div>
                <div className="w-2/3 h-5 bg-[#2A2A3D] rounded mb-2" />
                <div className="w-full h-3 bg-[#2A2A3D] rounded mb-1" />
                <div className="w-4/5 h-3 bg-[#2A2A3D] rounded" />
              </div>
              <div className="w-16 h-5 bg-[#2A2A3D] rounded" />
            </div>
            <div className="w-24 h-full bg-[#2A2A3D] rounded-xl flex-shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
