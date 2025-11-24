import React from 'react';
import { Music } from 'lucide-react';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ title, subtitle, children }) => {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <Music className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-zinc-100 mb-2">{title}</h1>
          <p className="text-zinc-400">{subtitle}</p>
        </div>

        {/* Content Container */}
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-8">{children}</div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-zinc-600">
            Copyright © 2025 Band Assist. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};
