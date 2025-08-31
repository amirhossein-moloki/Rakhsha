import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import LoginPage from '@/pages/auth/Login';
import RegisterPage from '@/pages/auth/Register';
import SecretLoginPage from '@/pages/auth/SecretLogin';
import HomePage from '@/pages/HomePage';
import SettingsPage from '@/pages/SettingsPage';
import ProtectedRoute from './ProtectedRoute';

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/secret-login',
    element: <SecretLoginPage />,
  },
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      {
        path: '/',
        element: <HomePage />,
      },
      {
        path: '/settings',
        element: <SettingsPage />,
      },
    ],
  },
]);

export default function Router() {
  return <RouterProvider router={router} />;
}
