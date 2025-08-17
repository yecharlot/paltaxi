/**
 * Página de autenticación y registro (cliente/chofer).
 */

import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Switch } from '../components/ui/switch'
import { Textarea } from '../components/ui/textarea'
import { useAppStore } from '../store/appStore'
import type { GeoPoint } from '../types'

/** Utilidad para leer query param 'tab'. */
function useQueryTab() {
  const loc = useLocation()
  const params = useMemo(() => new URLSearchParams(loc.search), [loc.search])
  return params.get('tab') ?? 'login'
}

/** Página de login y registro. */
export default function LoginPage() {
  const queryTab = useQueryTab()
  const [tab, setTab] = useState(queryTab)
  useEffect(() => setTab(queryTab), [queryTab])

  return (
    <div className="min-h-dvh flex flex-col">
      <Header />
      <main className="flex-1 mx-auto max-w-6xl w-full px-4 py-10">
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid grid-cols-3 w-full md:w-[600px]">
            <TabsTrigger value="login">Iniciar sesión</TabsTrigger>
            <TabsTrigger value="registro">Registro</TabsTrigger>
            <TabsTrigger value="info">Ayuda</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <AuthCard />
          </TabsContent>

          <TabsContent value="registro">
            <RegisterCard />
          </TabsContent>

          <TabsContent value="info">
            <InfoCard />
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  )
}

/** Tarjeta de autenticación. */
function AuthCard() {
  const { login } = useAppStore()
  const nav = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<string>('cliente')
  const [error, setError] = useState<string | undefined>(undefined)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const res = login(username.trim(), password, role as any)
    if (!res.ok) setError(res.message || 'Error de inicio de sesión')
    else nav('/dashboard')
  }

  return (
    <Card className="max-w-xl mt-6">
      <CardHeader>
        <CardTitle>Bienvenido</CardTitle>
        <CardDescription>Use sus credenciales o pruebe: admin/admin · gestor/gestor</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="username">Usuario</Label>
              <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div className="sm:col-span-2">
              <Label>Rol</Label>
              <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                {['cliente','chofer','gestor','admin'].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`text-sm rounded-md border px-3 py-2 ${role===r ? 'border-primary text-primary bg-primary/5' : 'border-muted'}`}
                    aria-pressed={role===r}
                  >
                    {r.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            {error ? <p className="text-sm text-red-500 sm:col-span-2">{error}</p> : null}
          </div>
          <div className="flex gap-2">
            <Button type="submit" className="gap-2">Entrar</Button>
            <Button type="button" variant="outline" className="bg-transparent" onClick={() => { setUsername('admin'); setPassword('admin'); setRole('admin') }}>Autofill admin</Button>
            <Button type="button" variant="outline" className="bg-transparent" onClick={() => { setUsername('gestor'); setPassword('gestor'); setRole('gestor') }}>Autofill gestor</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

/** Registro de cliente y chofer. */
function RegisterCard() {
  const nav = useNavigate()
  const { registerClient, registerDriver } = useAppStore()
  const [tab, setTab] = useState<'cliente' | 'chofer'>('cliente')

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Registro</CardTitle>
        <CardDescription>Complete sus datos. El gestor debe validar su cuenta para activarla.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex gap-2">
          <Button onClick={() => setTab('cliente')} variant={tab === 'cliente' ? 'default' : 'outline'} className={tab === 'cliente' ? '' : 'bg-transparent'}>
            Cliente
          </Button>
          <Button onClick={() => setTab('chofer')} variant={tab === 'chofer' ? 'default' : 'outline'} className={tab === 'chofer' ? '' : 'bg-transparent'}>
            Chofer
          </Button>
        </div>
        {tab === 'cliente' ? (
          <ClientForm
            onSubmit={(payload) => {
              const res = registerClient(payload)
              if (res.ok) nav('/login')
              else alert(res.message)
            }}
          />
        ) : (
          <DriverForm
            onSubmit={(payload) => {
              const res = registerDriver(payload)
              if (res.ok) nav('/login')
              else alert(res.message)
            }}
          />
        )}
      </CardContent>
    </Card>
  )
}

/** Formulario de cliente. */
function ClientForm(props: {
  onSubmit: (data: Omit<ReturnType<typeof buildClientState>, 'role' | 'status' | 'createdAt' | 'id'>) => void
}) {
  const [state, setState] = useState(buildClientState())

  function update<K extends keyof typeof state>(k: K, v: (typeof state)[K]) {
    setState((s) => ({ ...s, [k]: v }))
  }

  function handleFile(file: File | null, key: 'idCardFrontUrl' | 'idCardBackUrl') {
    if (!file) return
    const url = URL.createObjectURL(file)
    update(key, url)
  }

  return (
    <form
      className="grid md:grid-cols-2 gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        props.onSubmit(state)
      }}
    >
      <TextInput label="Usuario" value={state.username} onChange={(v) => update('username', v)} required />
      <TextInput label="Contraseña" type="password" value={state.password} onChange={(v) => update('password', v)} required />
      <TextInput label="Nombre y apellidos" value={state.fullName} onChange={(v) => update('fullName', v)} required />
      <TextInput label="CI" value={state.ci} onChange={(v) => update('ci', v)} required />
      <TextInput label="Teléfono" value={state.phone} onChange={(v) => update('phone', v)} required />
      <div>
        <Label>Foto CI (frente)</Label>
        <Input type="file" accept="image/*" onChange={(e) => handleFile(e.target.files?.[0] || null, 'idCardFrontUrl')} />
      </div>
      <div>
        <Label>Foto CI (reverso)</Label>
        <Input type="file" accept="image/*" onChange={(e) => handleFile(e.target.files?.[0] || null, 'idCardBackUrl')} />
      </div>
      <div className="md:col-span-2 flex gap-2">
        <Button type="submit">Registrarme</Button>
      </div>
    </form>
  )
}

/** Formulario de chofer. */
function DriverForm(props: {
  onSubmit: (data: any) => void
}) {
  const [state, setState] = useState(buildDriverState())

  function update<K extends keyof typeof state>(k: K, v: (typeof state)[K]) {
    setState((s) => ({ ...s, [k]: v }))
  }

  function handleFile(file: File | null, key: keyof typeof state) {
    if (!file) return
    const url = URL.createObjectURL(file)
    update(key as any, url as any)
  }

  return (
    <form
      className="grid md:grid-cols-2 gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        props.onSubmit(state as any)
      }}
    >
      <TextInput label="Usuario" value={state.username} onChange={(v) => update('username', v)} required />
      <TextInput label="Contraseña" type="password" value={state.password} onChange={(v) => update('password', v)} required />
      <TextInput label="Nombre y apellidos" value={state.fullName} onChange={(v) => update('fullName', v)} required />
      <TextInput label="CI" value={state.ci} onChange={(v) => update('ci', v)} required />
      <TextInput label="Teléfono" value={state.phone} onChange={(v) => update('phone', v)} required />
      <div>
        <Label>CI (frente)</Label>
        <Input type="file" accept="image/*" onChange={(e) => handleFile(e.target.files?.[0] || null, 'idCardFrontUrl')} />
      </div>
      <div>
        <Label>CI (reverso)</Label>
        <Input type="file" accept="image/*" onChange={(e) => handleFile(e.target.files?.[0] || null, 'idCardBackUrl')} />
      </div>
      <div>
        <Label>Licencia conducción</Label>
        <Input type="file" accept="image/*" onChange={(e) => handleFile(e.target.files?.[0] || null, 'driverLicenseUrl')} />
      </div>
      <div>
        <Label>Circulación del vehículo</Label>
        <Input type="file" accept="image/*" onChange={(e) => handleFile(e.target.files?.[0] || null, 'circulationCardUrl')} />
      </div>
      <div>
        <Label>Foto del vehículo</Label>
        <Input type="file" accept="image/*" onChange={(e) => handleFile(e.target.files?.[0] || null, 'vehiclePhotoUrl')} />
      </div>
      <div className="flex items-center gap-3">
        <Switch checked={state.vehicle.ac} onCheckedChange={(v) => update('vehicle', { ...state.vehicle, ac: v })} />
        <Label>Vehículo climatizado</Label>
      </div>
      <TextInput
        label="Capacidad"
        type="number"
        min={1}
        value={String(state.vehicle.capacity)}
        onChange={(v) => update('vehicle', { ...state.vehicle, capacity: parseInt(v || '1', 10) })}
        required
      />
      <div className="md:col-span-2 flex gap-2">
        <Button type="submit">Registrarme</Button>
      </div>
    </form>
  )
}

/** Input con etiqueta. */
function TextInput(props: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; min?: number }) {
  const { label, value, onChange, type, required, min } = props
  return (
    <div>
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} type={type} required={required} min={min} />
    </div>
  )
}

/** Estado inicial de cliente para formulario. */
function buildClientState() {
  return {
    username: '',
    password: '',
    fullName: '',
    phone: '',
    ci: '',
    idCardFrontUrl: undefined as string | undefined,
    idCardBackUrl: undefined as string | undefined,
  }
}

/** Estado inicial de chofer para formulario. */
function buildDriverState() {
  return {
    username: '',
    password: '',
    fullName: '',
    phone: '',
    ci: '',
    idCardFrontUrl: undefined as string | undefined,
    idCardBackUrl: undefined as string | undefined,
    vehicle: {
      ac: true,
      capacity: 4,
      vehiclePhotoUrl: undefined as string | undefined,
      driverLicenseUrl: undefined as string | undefined,
      circulationCardUrl: undefined as string | undefined,
    },
  }
}

/** Información de ayuda. */
function InfoCard() {
  return (
    <Card className="max-w-3xl mt-6">
      <CardHeader>
        <CardTitle>¿Cómo funciona Pal Taxi?</CardTitle>
        <CardDescription>Resumen rápido de roles y flujo.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <ul className="list-disc pl-5 space-y-2">
          <li>Cliente: solicita carrera, ve precio/ETA, elige chofer, puede reportar quejas.</li>
          <li>Chofer: sube documentos, indica disponibilidad, acepta/rechaza y completa carreras.</li>
          <li>Gestor: valida cuentas y define tarifa por km y umbral de reputación.</li>
          <li>Admin: audita actividades (usuarios, carreras y quejas).</li>
          <li>Comisión: 10% por carrera; abono obligatorio cada 15 días o expulsión automática.</li>
        </ul>
      </CardContent>
    </Card>
  )
}
