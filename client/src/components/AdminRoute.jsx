import { Navigate, Outlet } from 'react-router-dom'
import useAdminStore from '../store/useAdminStore'

/** Redirects to /admin/login if admin is not authenticated */
export default function AdminRoute() {
  const token = useAdminStore((s) => s.token)
  return token ? <Outlet /> : <Navigate to="/admin/login" replace />
}
