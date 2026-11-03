
import {
  Navigate,
  useLocation
} from 'react-router-dom';

import { useAuth } from '../context/AuthContext';

import AccessDeniedPage from '../pages/shared/AccessDeniedPage';

export default function ProtectedRoute({
  allowedRoles,
  children
}) {
  const {
    user,
    isAuthenticated,
    isLoading
  } = useAuth();

  const location = useLocation();

  // Wait until session restoration finishes.
  if (isLoading) {
    return (
      <main className="standalone-state" role="status">
        <h2>Checking authentication...</h2>
        <p>Please wait while your session is verified.</p>
      </main>
    );
  }

  // Redirect if no authenticated user.
  if (!isAuthenticated || !user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location.pathname
        }}
      />
    );
  }

  // Verify role permissions.
  if (
    allowedRoles &&
    !allowedRoles.includes(user.role)
  ) {
    return <AccessDeniedPage />;
  }

  return children;
}
