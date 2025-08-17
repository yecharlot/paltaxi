/**
 * Página de inicio con hero, resumen de roles y CTA.
 */

import { Link } from 'react-router'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Car, ShieldCheck, UserRound, Settings } from 'lucide-react'

/** Sección principal del Home. */
export default function HomePage() {
  return (
    <div className="min-h-dvh flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative">
          <div className="absolute inset-0 -z-10">
            <img
              src="https://pub-cdn.sider.ai/u/U0GVH7VZOWK/web-coder/68a126267b28bae498fe8664/resource/29655d1b-ecca-4b78-a55d-f54699935861.jpg"
              className="object-cover w-full h-full opacity-70"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/70 to-background"></div>
          </div>
          <div className="mx-auto max-w-6xl px-4 py-16 lg:py-24 grid md:grid-cols-2 gap-8 items-center">
            <div>
              <Badge variant="secondary" className="mb-4">Nuevo</Badge>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
                Pal Taxi
              </h1>
              <p className="mt-3 text-lg text-muted-foreground">
                Agencia de taxis moderna para clientes, choferes y gestores. Solicita, acepta y gestiona carreras con tarifas transparentes y reputación confiable.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/login">
                  <Button size="lg" className="gap-2">
                    <Car className="size-5" />
                    Entrar ahora
                  </Button>
                </Link>
                <Link to="/login?tab=registro">
                  <Button size="lg" variant="outline" className="bg-transparent">
                    Registrarse
                  </Button>
                </Link>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Usuarios de prueba: admin/admin · gestor/gestor
              </p>
            </div>
            <div className="rounded-xl overflow-hidden border shadow-sm bg-background">
              <img
                src="https://pub-cdn.sider.ai/u/U0GVH7VZOWK/web-coder/68a126267b28bae498fe8664/resource/69649167-7ce6-4aef-9fab-b839bee0335e.jpg"
                className="object-cover w-full h-[300px]"
              />
            </div>
          </div>
        </section>

        {/* Roles */}
        <section className="mx-auto max-w-6xl px-4 py-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <RoleCard
            icon={<UserRound className="size-5" />}
            title="Cliente"
            desc="Crea solicitudes, conoce precio y ETA, elige chofer y reporta quejas si es necesario."
          />
          <RoleCard
            icon={<Car className="size-5" />}
            title="Chofer"
            desc="Sube documentos, establece disponibilidad, acepta carreras y gestiona abonos quincenales."
          />
          <RoleCard
            icon={<Settings className="size-5" />}
            title="Gestor"
            desc="Valida usuarios, fija tarifas, define umbral de reputación y supervisa operaciones."
          />
          <RoleCard
            icon={<ShieldCheck className="size-5" />}
            title="Admin"
            desc="Audita la plataforma: usuarios, carreras y quejas. Control total."
          />
        </section>
      </main>
      <Footer />
    </div>
  )
}

/** Tarjeta descriptiva de rol. */
function RoleCard(props: { icon: React.ReactNode; title: string; desc: string }) {
  const { icon, title, desc } = props
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center gap-3">
        <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          {icon}
        </div>
        <div>
          <CardTitle className="text-lg">{title}</CardTitle>
          <CardDescription className="text-xs">{title === 'Chofer' ? 'Reputación y documentación' : 'Control y transparencia'}</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </CardContent>
    </Card>
  )
}
