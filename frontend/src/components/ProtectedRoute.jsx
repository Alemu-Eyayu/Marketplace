import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';

/**
 * Wraps a route to require authentication and optionally a specific role.
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {string[]} [props.roles] - allowed roles
 */
export default function ProtectedRoute({ children, roles }) {
  const user = useSelector((s) => s.auth.user);

  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/403" replace />;

  return children;
}
