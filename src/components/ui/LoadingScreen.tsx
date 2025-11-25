import React from 'react';

interface LoadingScreenProps {
  /** The message to display below the spinner */
  message: string;
}

/**
 * Full-screen loading indicator with a spinner and message.
 * Used for app-level loading states like authentication checks and data loading.
 */
export const LoadingScreen: React.FC<LoadingScreenProps> = ({ message }) => (
  <div className="flex items-center justify-center min-h-screen bg-zinc-950 text-zinc-100">
    <div className="text-center" role="status" aria-live="polite">
      <div
        className="inline-block w-8 h-8 border-4 border-zinc-700 border-t-blue-500 rounded-full animate-spin mb-4"
        aria-hidden="true"
      />
      <p className="text-lg">{message}</p>
    </div>
  </div>
);
