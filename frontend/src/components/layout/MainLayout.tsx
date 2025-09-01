import React, { useState } from 'react';

interface MainLayoutProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

export default function MainLayout({ sidebar, children }: MainLayoutProps) {
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden">
      {/* Sidebar for mobile (overlay) */}
      <div
        className={`fixed top-0 left-0 z-30 h-full w-3/4 max-w-sm bg-black border-r border-royal-red transform transition-transform duration-300 ease-in-out md:hidden ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebar}
        <button
          onClick={() => setSidebarOpen(false)}
          className="absolute top-4 right-4 text-gray-300 hover:text-white"
          aria-label="Close sidebar"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>

      {/* Backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black opacity-50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar for desktop */}
      <div className="hidden w-1/4 bg-black border-r border-royal-red md:block">
        {sidebar}
      </div>

      {/* Main Content */}
      <div className="flex flex-col flex-1">
        {/* Header for mobile */}
        <div className="flex items-center p-4 bg-black border-b border-royal-red md:hidden">
          <button onClick={() => setSidebarOpen(true)} aria-label="Open sidebar" className="text-gray-300">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
          </button>
          <h1 className="ml-4 text-xl font-bold">Rakhshan</h1>
        </div>
        <div className="flex-1 overflow-y-auto">
            {children}
        </div>
      </div>
    </div>
  );
}
