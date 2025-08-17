/**
 * Panel principal por rol: Cliente, Chofer, Gestor, Admin.
 * Incluye acciones clave y vistas resumidas, pagos con QR/evidencia, mapa y CRUD de usuarios.
 */

import Header from '../components/Header'
import Footer from '../components/Footer'
import { RoleGuard } from '../components/RoleGuard'
import { useAppStore } from '../store/appStore'
import type { AnyUser, ClientUser, DriverUser, Ride, Settlement } from '../types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Badge } from '../components/ui/badge'
import { Textarea } from '../components/ui/textarea'
import { Separator } from '../components/ui/separator'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog'
import { formatCurrency } from '../utils/money'
import { estimateEtaMin, haversineKm } from '../utils/geo'
import { useEffect, useMemo, useState } from 'react'
import { Car, CheckCircle2, CircleDollarSign, FileWarning, MapPin, Plus, Trash2, Users, Wrench } from 'lucide-react'
import Map, { MapPoint, MapRoute } from '../components/Map'

/** Panel router por rol. */
export default function DashboardPage() {
  return (
    <RoleGuard>
      <div className="min-h-dvh flex flex-col">
        <Header />
        <main className="flex-1 mx-auto max-w-6xl w-full px-4 py-8">
          <PanelForRole />
        </main>
        <Footer />
      </div>
    </RoleGuard>
  )
}

/** Renderiza el panel según el rol del usuario actual. */
function PanelForRole() {
  const { currentUser } = useAppStore()
  if (!currentUser) return null
  if (currentUser.role === 'cliente') return <ClientPanel user={currentUser as ClientUser} />
  if (currentUser.role === 'chofer') return <DriverPanel user={currentUser as unknown as DriverUser} />
  if (currentUser.role === 'gestor') return <ManagerPanel />
  if (currentUser.role === 'admin') return <AdminPanel />
  return null
}

/** Panel Cliente. */
function ClientPanel({ user }: { user: ClientUser }) {
  const { rides, users, requestRide, complaints, settings } = useAppStore()
  const myRides = rides.filter((r) => r.clientId === user.id)
  const availableDrivers = users.filter((u) => u.role === 'chofer' && u.status === 'active' && (u as DriverUser).available) as DriverUser[]
  const [pickupAddress, setPickupAddress] = useState('Parque Central')
  const [destinationAddress, setDestinationAddress] = useState('Aeropuerto')
  const [pickupPoint, setPickupPoint] = useState({ lat: 23.140, lng: -82.356 })
  const [destinationPoint, setDestinationPoint] = useState({ lat: 23.009, lng: -82.404 })
  const [hasRouteChanges, setHasRouteChanges] = useState(false)
  const [preferredDriverId, setPreferredDriverId] = useState<string | undefined>(undefined)

  const dist = useMemo(() => haversineKm(pickupPoint, destinationPoint), [pickupPoint, destinationPoint])
  const eta = useMemo(() => estimateEtaMin(dist), [dist])

  const submit = () => {
    const res = requestRide({ pickupAddress, pickupPoint, destinationAddress, destinationPoint, hasRouteChanges, preferredDriverId })
    if (res.ok) {
      alert('Solicitud enviada. Choferes serán notificados.')
    } else {
      alert(res.message)
    }
  }

  // Puntos de mapa: recogida, destino, choferes disponibles
  const mapPoints: MapPoint[] = [
    { id: 'pickup', lat: pickupPoint.lat, lng: pickupPoint.lng, kind: 'pickup', label: 'Recogida' },
    { id: 'dest', lat: destinationPoint.lat, lng: destinationPoint.lng, kind: 'destination', label: 'Destino' },
    ...availableDrivers
      .filter((d) => d.location)
      .map((d) => ({ id: d.id, lat: (d.location as any).lat, lng: (d.location as any).lng, kind: 'driver' as const, label: d.fullName })),
  ]
  const routes: MapRoute[] = [{ id: 'r1', from: pickupPoint, to: destinationPoint }]

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-2xl font-bold">Cliente</h2>
        <Badge variant="secondary">Choferes disponibles: {availableDrivers.length}</Badge>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Solicitar carrera</CardTitle>
          <CardDescription>Defina recogida y destino. El precio se calcula automáticamente.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Lugar de recogida" value={pickupAddress} onChange={setPickupAddress} placeholder="Dirección o punto de referencia" />
            <Field label="Destino" value={destinationAddress} onChange={setDestinationAddress} placeholder="Dirección o punto de referencia" />
            <div>
              <Label>Coordenadas recogida (lat,lng)</Label>
              <Input
                value={`${pickupPoint.lat}, ${pickupPoint.lng}`}
                onChange={(e) => {
                  const [lat, lng] = e.target.value.split(',').map(s => parseFloat(s.trim()))
                  if (!isNaN(lat) && !isNaN(lng)) setPickupPoint({ lat, lng })
                }}
              />
            </div>
            <div>
              <Label>Coordenadas destino (lat,lng)</Label>
              <Input
                value={`${destinationPoint.lat}, ${destinationPoint.lng}`}
                onChange={(e) => {
                  const [lat, lng] = e.target.value.split(',').map(s => parseFloat(s.trim()))
                  if (!isNaN(lat) && !isNaN(lng)) setDestinationPoint({ lat, lng })
                }}
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <InfoTile icon={<MapPin className="size-4" />} label="Distancia" value={`${dist.toFixed(2)} km`} />
            <InfoTile icon={<Car className="size-4" />} label="ETA" value={`${eta} min`} />
            <InfoPrice />
          </div>

          <div className="flex items-center gap-2">
            <input id="routeChanges" type="checkbox" checked={hasRouteChanges} onChange={(e) => setHasRouteChanges(e.target.checked)} />
            <Label htmlFor="routeChanges">Habrá cambios de ruta o paradas intermedias</Label>
          </div>

          <div>
            <Label>Elegir chofer (opcional)</Label>
            <div className="mt-2 grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {availableDrivers.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin choferes disponibles ahora. Puede enviar la solicitud igualmente.</p>
              ) : availableDrivers.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setPreferredDriverId(preferredDriverId === d.id ? undefined : d.id)}
                  className={`text-left rounded-md border px-3 py-2 transition ${preferredDriverId === d.id ? 'border-primary text-primary bg-primary/5' : 'border-muted hover:bg-muted/40'}`}
                >
                  <div className="font-medium text-sm">{d.fullName}</div>
                  <div className="text-xs text-muted-foreground">
                    Rep {d.reputation} · {d.vehicle.ac ? 'A/C' : 'Sin A/C'} · Cap {d.vehicle.capacity}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={submit} className="gap-2">
              <Car className="size-4" />
              Solicitar
            </Button>
            <Button variant="outline" className="bg-transparent" onClick={() => {
              setPickupAddress('Hotel Nacional')
              setPickupPoint({ lat: 23.144, lng: -82.380 })
              setDestinationAddress('Habana Vieja')
              setDestinationPoint({ lat: 23.136, lng: -82.356 })
            }}>
              Sugerir ruta
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mapa</CardTitle>
          <CardDescription>Recogida, destino y choferes disponibles en tiempo real.</CardDescription>
        </CardHeader>
        <CardContent>
          <Map points={mapPoints} routes={routes} height={320} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mis carreras</CardTitle>
          <CardDescription>Revise estado y emita quejas si es necesario.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {myRides.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tiene carreras aún.</p>
          ) : (
            <div className="space-y-3">
              {myRides.map((r) => (
                <RideRow key={r.id} ride={r} canComplain />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

/** Panel Chofer. */
function DriverPanel({ user }: { user: DriverUser }) {
  const { rides, users, setDriverAvailability, acceptRide, rejectRide, completeRide, settings, settlements, requestSettlement } = useAppStore()
  const my = users.find(u => u.id === user.id) as DriverUser
  const pendingRides = rides.filter((r) => r.status === 'pending')
  const myRides = rides.filter((r) => r.driverId === user.id)
  const mySettlements = settlements.filter((s) => s.driverId === user.id)

  const [lat, setLat] = useState(my.location?.lat ?? 23.140)
  const [lng, setLng] = useState(my.location?.lng ?? -82.356)

  // Modal de abono
  const [openPay, setOpenPay] = useState(false)
  const [evidence, setEvidence] = useState<string | undefined>(undefined)

  /** Convierte archivo a Data URL para persistencia. */
  function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const amountDue = my.earningsSinceLastSettlement
  const qrPayload = encodeURIComponent(
    `PalTaxi|${settings.payment.beneficiaryName}|${settings.payment.cardNumber}|${settings.payment.phone}|${amountDue}|CUP`
  )
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${qrPayload}`

  // Buscar una carrera aceptada para mostrar ruta en mapa
  const accepted = myRides.filter((r) => r.status === 'accepted').sort((a,b) => (b.acceptedAt ?? 0) - (a.acceptedAt ?? 0))[0]
  const mapPoints: MapPoint[] = [
    ...(my.location ? [{ id: 'me', lat: my.location.lat, lng: my.location.lng, kind: 'driver' as const, label: 'Yo' }] : []),
    ...(accepted ? [
      { id: 'pickup', lat: accepted.pickupPoint.lat, lng: accepted.pickupPoint.lng, kind: 'pickup' as const, label: 'Recogida' },
      { id: 'dest', lat: accepted.destinationPoint.lat, lng: accepted.destinationPoint.lng, kind: 'destination' as const, label: 'Destino' },
    ] : []),
  ]
  const routes: MapRoute[] = accepted ? [{ id: 'r1', from: accepted.pickupPoint, to: accepted.destinationPoint }] : []

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-2xl font-bold">Chofer</h2>
        <div className="flex items-center gap-2">
          <Badge variant={my.status === 'active' ? 'default' : 'destructive'}>{my.status.toUpperCase()}</Badge>
          <Badge variant="secondary">Reputación: {my.reputation}</Badge>
          <Badge variant="secondary">Disponible: {my.available ? 'Sí' : 'No'}</Badge>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Disponibilidad</CardTitle>
          <CardDescription>Comparta su ubicación para calcular ETA al cliente.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <Label>Latitud</Label>
              <Input type="number" value={lat} onChange={(e) => setLat(parseFloat(e.target.value))} />
            </div>
            <div>
              <Label>Longitud</Label>
              <Input type="number" value={lng} onChange={(e) => setLng(parseFloat(e.target.value))} />
            </div>
            <div className="flex items-end">
              <Button onClick={() => setDriverAvailability(true, { lat, lng })} className="w-full">Estoy disponible</Button>
            </div>
          </div>
          <Button variant="outline" className="bg-transparent" onClick={() => setDriverAvailability(false)}>No disponible</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Solicitudes pendientes</CardTitle>
          <CardDescription>Acepte o rechace carreras.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {pendingRides.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay solicitudes ahora.</p>
          ) : (
            pendingRides.map((r) => (
              <div key={r.id} className="border rounded-lg p-3 flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm">
                  <div className="font-medium">{r.pickupAddress} → {r.destinationAddress}</div>
                  <div className="text-muted-foreground">
                    {r.distanceKm} km · {formatCurrency(r.price)} · ETA {r.etaMin} min {r.preferredDriverId ? '· Cliente prefirió un chofer' : ''}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => acceptRide(r.id, { lat, lng })} className="gap-2">
                    <CheckCircle2 className="size-4" />
                    Aceptar
                  </Button>
                  <Button variant="outline" className="bg-transparent" onClick={() => rejectRide(r.id)}>Rechazar</Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mis carreras</CardTitle>
          <CardDescription>Complete las carreras realizadas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {myRides.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no tiene carreras.</p>
          ) : (
            myRides.map((r) => (
              <div key={r.id} className="border rounded-lg p-3 flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm">
                  <div className="font-medium">{r.pickupAddress} → {r.destinationAddress}</div>
                  <div className="text-muted-foreground">
                    Estado: {r.status.toUpperCase()} · {formatCurrency(r.price)}
                  </div>
                </div>
                {r.status === 'accepted' ? (
                  <Button onClick={() => completeRide(r.id)} className="gap-2">
                    <CircleDollarSign className="size-4" />
                    Completar y cobrar
                  </Button>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Abono y comisiones</CardTitle>
          <CardDescription>10% por carrera. Debe abonar cada {settings.settlementPeriodDays} días.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Badge variant="secondary">Pendiente de abono: {formatCurrency(my.earningsSinceLastSettlement)}</Badge>
            <Dialog open={openPay} onOpenChange={setOpenPay}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <CircleDollarSign className="size-4" />
                  Abonar ahora
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Abono de comisiones</DialogTitle>
                  <DialogDescription>Use estos datos para realizar la transferencia. Luego suba la evidencia.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <InfoItem label="Beneficiario" value={settings.payment.beneficiaryName} />
                    <InfoItem label="Banco" value={settings.payment.bankName || '—'} />
                    <InfoItem label="Tarjeta/Cta" value={settings.payment.cardNumber} />
                    <InfoItem label="Teléfono" value={settings.payment.phone} />
                    <InfoItem label="Importe" value={formatCurrency(amountDue)} />
                  </div>
                  {settings.payment.instructions ? (
                    <p className="text-xs text-muted-foreground">{settings.payment.instructions}</p>
                  ) : null}
                  <div className="flex flex-col sm:flex-row gap-3 items-start">
                    <div>
                      <Label className="text-xs">Código QR</Label>
                      <div className="mt-1 border rounded-md p-2 bg-white">
                        <img src={qrUrl} alt="QR de pago" className="object-cover w-[240px] h-[240px]" />
                      </div>
                    </div>
                    <div className="flex-1 w-full">
                      <Label>Evidencia de pago (imagen)</Label>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const f = e.target.files?.[0]
                          if (f) {
                            const dataUrl = await fileToDataUrl(f)
                            setEvidence(dataUrl)
                          }
                        }}
                      />
                      {evidence ? (
                        <div className="mt-2 border rounded-md p-2">
                          <img src={evidence} className="object-cover max-h-40" />
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
                <DialogFooter className="gap-2">
                  <Button
                    onClick={() => {
                      if (!evidence) {
                        alert('Suba la evidencia de pago.')
                        return
                      }
                      const res = requestSettlement(evidence, amountDue)
                      if (res.ok) {
                        setOpenPay(false)
                        setEvidence(undefined)
                        alert('Solicitud de abono enviada. Pendiente de verificación del gestor.')
                      } else {
                        alert(res.message)
                      }
                    }}
                  >
                    Enviar para verificación
                  </Button>
                  <Button variant="outline" className="bg-transparent" onClick={() => setOpenPay(false)}>Cancelar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <p className="text-xs text-muted-foreground">
            Si no abona dentro del plazo, será expulsado automáticamente.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mis abonos</CardTitle>
          <CardDescription>Historial de solicitudes de abono y su estado.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {mySettlements.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no ha realizado abonos.</p>
          ) : (
            mySettlements.map((s) => (
              <div key={s.id} className="border rounded-md p-3 flex items-center justify-between gap-3 text-sm">
                <div>
                  <div className="font-medium">{formatCurrency(s.amount)} · {new Date(s.createdAt).toLocaleString()}</div>
                  <div className="text-muted-foreground">Estado: {s.status.toUpperCase()}</div>
                </div>
                {s.evidenceUrl ? <img src={s.evidenceUrl} className="object-cover h-12 w-12 rounded" /> : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mapa</CardTitle>
          <CardDescription>Su ubicación y, si aplica, la ruta de la carrera aceptada.</CardDescription>
        </CardHeader>
        <CardContent>
          <Map points={mapPoints} routes={routes} height={320} />
        </CardContent>
      </Card>
    </div>
  )
}

/** Panel Gestor. */
function ManagerPanel() {
  const {
    users,
    setUserStatus,
    settings,
    setSettings,
    rides,
    settlements,
    approveSettlement,
    rejectSettlement,
    createUser,
    updateUser,
    deleteUser,
  } = useAppStore()
  const pending = users.filter((u) => u.status === 'pending')
  const drivers = users.filter((u) => u.role === 'chofer') as DriverUser[]
  const activeRides = rides.filter((r) => r.status === 'pending' || r.status === 'accepted')

  // Modal de usuario (crear/editar)
  const [userModalOpen, setUserModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<AnyUser | null>(null)

  // Estado del formulario de usuario
  const [form, setForm] = useState({
    role: 'cliente' as 'cliente' | 'chofer',
    username: '',
    password: '',
    fullName: '',
    phone: '',
    ci: '',
    status: 'active' as 'active' | 'pending' | 'expelled',
    vehicle_ac: true,
    vehicle_capacity: 4,
  })

  useEffect(() => {
    if (editingUser) {
      setForm({
        role: editingUser.role as any,
        username: editingUser.username,
        password: editingUser.password,
        fullName: editingUser.fullName,
        phone: editingUser.phone,
        ci: editingUser.ci,
        status: editingUser.status,
        vehicle_ac: editingUser.role === 'chofer' ? (editingUser as DriverUser).vehicle.ac : true,
        vehicle_capacity: editingUser.role === 'chofer' ? (editingUser as DriverUser).vehicle.capacity : 4,
      })
    } else {
      setForm({
        role: 'cliente',
        username: '',
        password: '',
        fullName: '',
        phone: '',
        ci: '',
        status: 'active',
        vehicle_ac: true,
        vehicle_capacity: 4,
      })
    }
  }, [editingUser, userModalOpen])

  function submitUserForm() {
    if (!form.username || !form.password || !form.fullName) {
      alert('Complete los campos obligatorios.')
      return
    }
    if (!editingUser) {
      const payload: any = {
        role: form.role,
        username: form.username,
        password: form.password,
        fullName: form.fullName,
        phone: form.phone,
        ci: form.ci,
        status: form.status,
      }
      if (form.role === 'chofer') {
        payload.vehicle = { ac: form.vehicle_ac, capacity: form.vehicle_capacity }
      }
      const res = createUser(payload)
      if (res.ok) {
        setUserModalOpen(false)
      } else {
        alert(res.message)
      }
    } else {
      const partial: any = {
        username: form.username,
        password: form.password,
        fullName: form.fullName,
        phone: form.phone,
        ci: form.ci,
        status: form.status,
      }
      if (form.role === 'chofer') {
        partial.vehicle = { ac: form.vehicle_ac, capacity: form.vehicle_capacity, ...(editingUser as any).vehicle }
      }
      const res = updateUser(editingUser.id, partial)
      if (res.ok) {
        setUserModalOpen(false)
        setEditingUser(null)
      } else {
        alert(res.message)
      }
    }
  }

  const pendingSettlements = settlements.filter((s) => s.status === 'pending')
  const allSettlements = settlements

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-2xl font-bold">Gestor</h2>
        <Badge variant="secondary">Tarifa actual: {formatCurrency(settings.tariffPerKm)}/km</Badge>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Validación de usuarios</CardTitle>
          <CardDescription>Apruebe o rechace registros de clientes y choferes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay usuarios pendientes.</p>
          ) : (
            pending.map((u) => (
              <div key={u.id} className="border rounded-lg p-3 flex items-center justify-between gap-3">
                <div className="text-sm">
                  <div className="font-medium">{u.fullName}</div>
                  <div className="text-muted-foreground">{u.username} · {u.role.toUpperCase()} · CI {u.ci}</div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => setUserStatus(u.id, 'active')}>Aprobar</Button>
                  <Button variant="outline" className="bg-transparent" onClick={() => setUserStatus(u.id, 'expelled')}>Rechazar</Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tarifa y reputación</CardTitle>
          <CardDescription>Defina la tarifa por km y el umbral mínimo de reputación.</CardDescription>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-3 gap-3">
          <div>
            <Label>Tarifa (CUP/km)</Label>
            <Input
              type="number"
              value={settings.tariffPerKm}
              onChange={(e) => setSettings({ tariffPerKm: Math.max(0, Number(e.target.value)) })}
            />
          </div>
          <div>
            <Label>Umbral reputación</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={settings.reputationThreshold}
              onChange={(e) => setSettings({ reputationThreshold: Math.min(100, Math.max(0, Number(e.target.value))) })}
            />
          </div>
          <div>
            <Label>Comisión (%)</Label>
            <Input type="number" value={settings.commissionPercent} disabled />
          </div>
          <div>
            <Label>Periodo de corte (días)</Label>
            <Input type="number" value={settings.settlementPeriodDays} disabled />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Datos de pago</CardTitle>
          <CardDescription>Configurar información para abonos por transferencia.</CardDescription>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <Label>Beneficiario</Label>
            <Input value={settings.payment.beneficiaryName} onChange={(e) => setSettings({ payment: { ...settings.payment, beneficiaryName: e.target.value } })} />
          </div>
          <div>
            <Label>Tarjeta/Cuenta</Label>
            <Input value={settings.payment.cardNumber} onChange={(e) => setSettings({ payment: { ...settings.payment, cardNumber: e.target.value } })} />
          </div>
          <div>
            <Label>Teléfono</Label>
            <Input value={settings.payment.phone} onChange={(e) => setSettings({ payment: { ...settings.payment, phone: e.target.value } })} />
          </div>
          <div>
            <Label>Banco</Label>
            <Input value={settings.payment.bankName || ''} onChange={(e) => setSettings({ payment: { ...settings.payment, bankName: e.target.value } })} />
          </div>
          <div className="lg:col-span-2">
            <Label>Instrucciones</Label>
            <Textarea value={settings.payment.instructions || ''} onChange={(e) => setSettings({ payment: { ...settings.payment, instructions: e.target.value } })} />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <Label>Vista previa QR (muestra monto hipotético 100 CUP)</Label>
            <div className="mt-2">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                  `PalTaxi|${settings.payment.beneficiaryName}|${settings.payment.cardNumber}|${settings.payment.phone}|100|CUP`
                )}`}
                className="object-cover w-[200px] h-[200px]"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Choferes</CardTitle>
          <CardDescription>Estado, reputación y disponibilidad.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {drivers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay choferes registrados.</p>
          ) : (
            drivers.map((d) => (
              <div key={d.id} className="border rounded-lg p-3 flex items-center justify-between gap-3">
                <div className="text-sm">
                  <div className="font-medium">{d.fullName}</div>
                  <div className="text-muted-foreground">
                    {d.username} · {d.status.toUpperCase()} · Rep {d.reputation} · Pendiente {formatCurrency(d.earningsSinceLastSettlement)}
                  </div>
                </div>
                {d.status !== 'expelled' ? (
                  <Button variant="outline" className="bg-transparent" onClick={() => setUserStatus(d.id, 'expelled')}>Expulsar</Button>
                ) : (
                  <Badge variant="destructive">Expulsado</Badge>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Operaciones activas</CardTitle>
          <CardDescription>Carreras en curso o pendientes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {activeRides.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin operaciones activas.</p>
          ) : (
            activeRides.map((r) => (
              <div key={r.id} className="border rounded-lg p-3 text-sm">
                <div className="font-medium">{r.pickupAddress} → {r.destinationAddress}</div>
                <div className="text-muted-foreground">Dist {r.distanceKm} km · {formatCurrency(r.price)} · {r.status.toUpperCase()}</div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle>Gestión de cuentas</CardTitle>
            <CardDescription>Crear, editar y eliminar usuarios.</CardDescription>
          </div>
          <Dialog open={userModalOpen} onOpenChange={setUserModalOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="size-4" /> Crear usuario</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingUser ? 'Editar usuario' : 'Crear usuario'}</DialogTitle>
              </DialogHeader>
              <div className="grid sm:grid-cols-2 gap-3">
                {!editingUser ? (
                  <div className="sm:col-span-2">
                    <Label>Rol</Label>
                    <select
                      className="mt-1 w-full border rounded-md px-3 py-2 bg-background"
                      value={form.role}
                      onChange={(e) => setForm((s) => ({ ...s, role: e.target.value as any }))}
                    >
                      <option value="cliente">Cliente</option>
                      <option value="chofer">Chofer</option>
                    </select>
                  </div>
                ) : null}
                <div>
                  <Label>Usuario</Label>
                  <Input value={form.username} onChange={(e) => setForm((s) => ({ ...s, username: e.target.value }))} />
                </div>
                <div>
                  <Label>Contraseña</Label>
                  <Input value={form.password} onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))} />
                </div>
                <div>
                  <Label>Nombre y apellidos</Label>
                  <Input value={form.fullName} onChange={(e) => setForm((s) => ({ ...s, fullName: e.target.value }))} />
                </div>
                <div>
                  <Label>CI</Label>
                  <Input value={form.ci} onChange={(e) => setForm((s) => ({ ...s, ci: e.target.value }))} />
                </div>
                <div>
                  <Label>Teléfono</Label>
                  <Input value={form.phone} onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))} />
                </div>
                <div className="sm:col-span-2">
                  <Label>Estado</Label>
                  <select
                    className="mt-1 w-full border rounded-md px-3 py-2 bg-background"
                    value={form.status}
                    onChange={(e) => setForm((s) => ({ ...s, status: e.target.value as any }))}
                  >
                    <option value="active">Activo</option>
                    <option value="pending">Pendiente</option>
                    <option value="expelled">Expulsado</option>
                  </select>
                </div>
                {form.role === 'chofer' ? (
                  <>
                    <div className="flex items-center gap-2">
                      <input id="ac" type="checkbox" checked={form.vehicle_ac} onChange={(e) => setForm((s) => ({ ...s, vehicle_ac: e.target.checked }))} />
                      <Label htmlFor="ac">Vehículo climatizado</Label>
                    </div>
                    <div>
                      <Label>Capacidad</Label>
                      <Input type="number" min={1} value={form.vehicle_capacity} onChange={(e) => setForm((s) => ({ ...s, vehicle_capacity: parseInt(e.target.value || '1', 10) }))} />
                    </div>
                  </>
                ) : null}
              </div>
              <div className="mt-4 flex gap-2">
                <Button onClick={submitUserForm}>{editingUser ? 'Guardar cambios' : 'Crear'}</Button>
                <Button variant="outline" className="bg-transparent" onClick={() => { setUserModalOpen(false); setEditingUser(null) }}>Cancelar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="space-y-2">
          {users.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay usuarios.</p>
          ) : (
            users.map((u) => (
              <div key={u.id} className="border rounded-md p-3 flex items-center justify-between gap-3 text-sm">
                <div>
                  <div className="font-medium">{u.fullName}</div>
                  <div className="text-muted-foreground">{u.username} · {u.role.toUpperCase()} · {u.status.toUpperCase()} · Tel {u.phone}</div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="bg-transparent"
                    onClick={() => { setEditingUser(u); setUserModalOpen(true) }}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    className="bg-transparent"
                    onClick={() => {
                      if (confirm('¿Eliminar esta cuenta?')) {
                        const res = deleteUser(u.id)
                        if (!res.ok) alert(res.message)
                      }
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Abonos</CardTitle>
          <CardDescription>Revise, apruebe o rechace las solicitudes de abono.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {pendingSettlements.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay abonos pendientes.</p>
          ) : (
            pendingSettlements.map((s) => {
              const driver = users.find((u) => u.id === s.driverId) as DriverUser | undefined
              return (
                <div key={s.id} className="border rounded-md p-3 flex items-center justify-between gap-3 text-sm">
                  <div>
                    <div className="font-medium">{driver?.fullName ?? s.driverId}</div>
                    <div className="text-muted-foreground">{formatCurrency(s.amount)} · {new Date(s.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.evidenceUrl ? <img src={s.evidenceUrl} className="object-cover h-12 w-12 rounded" /> : null}
                    <Button onClick={() => approveSettlement(s.id)}>Aprobar</Button>
                    <Button
                      variant="outline"
                      className="bg-transparent"
                      onClick={() => {
                        const reason = window.prompt('Motivo del rechazo (opcional):') || undefined
                        const res = rejectSettlement(s.id, reason)
                        if (!res.ok) alert(res.message)
                      }}
                    >
                      Rechazar
                    </Button>
                  </div>
                </div>
              )
            })
          )}

          {allSettlements.length > 0 ? (
            <>
              <Separator />
              <div className="space-y-2">
                {allSettlements.map((s) => {
                  const driver = users.find((u) => u.id === s.driverId) as DriverUser | undefined
                  return (
                    <div key={`hist-${s.id}`} className="border rounded-md p-3 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="font-medium">{driver?.fullName ?? s.driverId}</div>
                        <div className="text-muted-foreground">{formatCurrency(s.amount)} · {new Date(s.createdAt).toLocaleString()} · {s.status.toUpperCase()}</div>
                      </div>
                      {s.evidenceUrl ? <img src={s.evidenceUrl} className="object-cover h-10 w-10 rounded" /> : null}
                    </div>
                  )
                })}
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}

/** Panel Admin. */
function AdminPanel() {
  const { users, rides, complaints } = useAppStore()
  const totalDrivers = users.filter((u) => u.role === 'chofer').length
  const totalClients = users.filter((u) => u.role === 'cliente').length
  const completed = rides.filter((r) => r.status === 'completed').length

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-2xl font-bold">Administrador</h2>
        <div className="flex gap-2">
          <Badge variant="secondary"><Users className="size-3 mr-1 inline" /> Clientes: {totalClients}</Badge>
          <Badge variant="secondary"><Car className="size-3 mr-1 inline" /> Choferes: {totalDrivers}</Badge>
          <Badge variant="secondary"><CheckCircle2 className="size-3 mr-1 inline" /> Completadas: {completed}</Badge>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Auditoría de carreras</CardTitle>
          <CardDescription>Listado completo de solicitudes y estados.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {rides.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin registros de carreras.</p>
          ) : (
            rides.map((r) => <RideRow key={r.id} ride={r} />)
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quejas</CardTitle>
          <CardDescription>Control de reportes de clientes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {complaints.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin quejas reportadas.</p>
          ) : (
            complaints.map((c) => (
              <div key={c.id} className="border rounded-lg p-3 text-sm">
                <div className="font-medium"><FileWarning className="size-4 inline mr-2" /> Queja · {new Date(c.createdAt).toLocaleString()}</div>
                <div className="text-muted-foreground">{c.message}</div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}

/** Ficha rápida de precio basado en la configuración actual (en vivo). */
function InfoPrice() {
  const { settings } = useAppStore()
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs text-muted-foreground">Tarifa</div>
      <div className="font-semibold">{formatCurrency(settings.tariffPerKm)}/km</div>
    </div>
  )
}

/** Azulejo informativo con icono. */
function InfoTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon} {label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  )
}

/** Item de información simple (label/value). */
function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  )
}

/** Campo de texto simple con etiqueta. */
function Field(props: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  const { label, value, onChange, placeholder } = props
  return (
    <div>
      <Label>{label}</Label>
      <Input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}

/** Fila de carrera reutilizable. */
function RideRow({ ride, canComplain }: { ride: Ride; canComplain?: boolean }) {
  const { users, fileComplaint } = useAppStore()
  const driver = users.find((u) => u.id === ride.driverId) as DriverUser | undefined
  const [open, setOpen] = useState(false)
  const [msg, setMsg] = useState('El chofer no cumplió con el servicio esperado.')

  return (
    <div className="border rounded-lg p-3 text-sm space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-medium">{ride.pickupAddress} → {ride.destinationAddress}</div>
          <div className="text-muted-foreground">
            {ride.distanceKm} km · ETA {ride.etaMin} min · {ride.status.toUpperCase()} · {driver ? `Chofer: ${driver.fullName} (Rep ${driver.reputation})` : 'Sin chofer'}
          </div>
        </div>
        <div className="flex gap-2">
          {canComplain && ride.status === 'completed' ? (
            <>
              <Button variant="outline" className="bg-transparent" onClick={() => setOpen((o) => !o)}>Quejarme</Button>
              {open ? (
                <div className="w-full sm:w-[360px] border rounded-md p-2">
                  <Textarea value={msg} onChange={(e) => setMsg(e.target.value)} className="mb-2" />
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        const res = fileComplaint(ride.id, msg.trim())
                        if (res.ok) {
                          setOpen(false)
                          alert('Queja enviada. Gracias por su reporte.')
                        }
                      }}
                    >
                      Enviar
                    </Button>
                    <Button variant="outline" className="bg-transparent" onClick={() => setOpen(false)}>Cancelar</Button>
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
