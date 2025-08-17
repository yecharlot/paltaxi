/**
 * Header principal con branding y navegación mínima.
 */

import { Link, useLocation } from 'react-router'
import { Car, LogIn, LogOut } from 'lucide-react'
import { Button } from '../components/ui/button'
import { useAppStore } from '../store/appStore'

/** Componente de cabecera para navegación y sesión. */
export default function Header() {
  const { currentUser, logout } = useAppStore()
  const loc = useLocation()
  const isOnLogin = loc.pathname.includes('login')

  return (
    <header className="w-full border-b bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/40 sticky top-0 z-40">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Car className="size-5" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-bold text-lg">Pal Taxi</span>
            <span className="text-xs text-muted-foreground">Agencia de taxis</span>
          </div>
        </Link>
        <nav className="flex items-center gap-2">
          {!currentUser && !isOnLogin ? (
            <Link to="/login">
              <Button size="sm" variant="default" className="gap-2">
                <LogIn className="size-4" />
                Entrar
              </Button>
            </Link>
          ) : null}
          {currentUser ? (
            <>
              <span className="text-sm text-muted-foreground hidden sm:block">
                {currentUser.fullName} · {currentUser.role.toUpperCase()}
              </span>
              <Link to="/dashboard">
                <Button size="sm" variant="outline" className="bg-transparent">
                  Panel
                </Button>
              </Link>
              <Button
                size="sm"
                variant="ghost"
                className="gap-2"
                onClick={() => logout()}
                title="Cerrar sesión"
              >
                <LogOut className="size-4" />
                Salir
              </Button>
            </>
          ) : null}
        </nav>
      </div>
    </header>
  )
}
