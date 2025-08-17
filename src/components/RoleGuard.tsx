/**
 * RoleGuard protege rutas que requieren autenticación y/o roles específicos.
 */

import { PropsWithChildren } from 'react'
import { Navigate } from 'react-router'
import { useAppStore } from '../store/appStore'
import type { Role } from '../types'

interface RoleGuardProps {
  /** Roles permitidos; si omiso, solo requiere estar autenticado */
  allowed?: Role[]
}

/** Componente de guardia de rutas por rol. */
export function RoleGuard({ allowed, children }: PropsWithChildren<RoleGuardProps>) {
  const { currentUser } = useAppStore()
  if (!currentUser) return <Navigate to="/login" replace />
  if (allowed && !allowed.includes(currentUser.role)) return <Navigate to="/" replace />
  return <>{children}</>
}
