import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider } from './context/AuthContext';
import AppRouter from './routes/AppRouter';
import ErrorBoundary from './components/common/ErrorBoundary';

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30000, retry: false, refetchOnWindowFocus: false }, mutations: { retry: false } } });
export default function App() { return <ErrorBoundary><QueryClientProvider client={queryClient}><AuthProvider><BrowserRouter><a className="skip-link" href="#main-content">Skip to content</a><AppRouter /><Toaster richColors closeButton position="bottom-right" /></BrowserRouter></AuthProvider></QueryClientProvider></ErrorBoundary>; }
