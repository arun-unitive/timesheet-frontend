import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { UnsavedChangesProvider } from './context/UnsavedChangesContext';

import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/layout.css';

/**
 * Global cache policy - tuned so the app never re-fetches data it already has.
 *  - staleTime: a response stays "fresh" for a minute, so remounting a page or
 *    navigating back reads from cache instead of hitting the API again.
 *  - refetchOnWindowFocus: off, so switching browser tabs costs nothing.
 *  - retry: one retry only, to avoid hammering a failing endpoint.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <UnsavedChangesProvider>
              <App />
            </UnsavedChangesProvider>
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
