import React, { memo } from 'react';
import { Music } from 'lucide-react';
import { Card, CardContent } from '@/components/primitives';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = memo(function AuthLayout({
  title,
  subtitle,
  children,
}) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-full mb-4">
            <Music className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">{title}</h1>
          <p className="text-muted-foreground">{subtitle}</p>
        </div>

        {/* Content Container */}
        <Card>
          <CardContent className="p-8">{children}</CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-muted-foreground/60">
            Copyright © 2025 Band Assist. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
});

AuthLayout.displayName = 'AuthLayout';
