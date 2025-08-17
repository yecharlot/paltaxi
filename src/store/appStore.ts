/**
 * Store global para Pal Taxi con Zustand + persistencia.
 * Implementa autenticación, registro, gestión de usuarios, carreras, quejas, abonos y reglas.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  AdminUser,
  AnyUser,
  AppSettings,
  ClientUser,
  Complaint,
  DriverUser,
  ManagerUser,
  Ride,
  Role,
  UserStatus,
  GeoPoint,
  Settlement,
} from '../types'
import { haversineKm, estimateEtaMin } from '../utils/geo'

/** Generador simple de IDs. */
function uid(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`
}

/** Obtiene timestamp actual. */
function now(): number {
  return Date.now()
}

/** Calcula reputación del chofer basada en quejas (modelo simple). */
function calcReputation(base: number, complaintsCount: number): number {
  // Cada queja resta 8 puntos (mínimo 0, máximo 100)
  const rep = Math.max(0, Math.min(100, base - complaintsCount * 8))
  return rep
}

/** Estado del Store. */
interface AppState {
  users: AnyUser[]
  rides: Ride[]
  complaints: Complaint[]
  settlements: Settlement[]
  settings: AppSettings
  currentUser?: AnyUser

  // acciones de auth
  login: (username: string, password: string, role?: Role) => { ok: boolean; message?: string }
  logout: () => void

  // registro
  registerClient: (data: Omit<ClientUser, 'id' | 'role' | 'status' | 'createdAt'>) => { ok: boolean; id?: string; message?: string }
  registerDriver: (data: Omit<DriverUser, 'id' | 'role' | 'status' | 'createdAt' | 'reputation' | 'earningsSinceLastSettlement' | 'lastSettlementAt' | 'complaintsCount' | 'available'>) => { ok: boolean; id?: string; message?: string }

  // gestor/admin: settings y usuarios
  setSettings: (partial: Partial<AppSettings>) => void
  setUserStatus: (userId: string, status: UserStatus) => void

  createUser: (payload: Omit<AnyUser, 'id' | 'createdAt' | 'status'> & Partial<Pick<AnyUser, 'status'>>) => { ok: boolean; id?: string; message?: string }
  updateUser: (userId: string, partial: Partial<AnyUser>) => { ok: boolean; message?: string }
  deleteUser: (userId: string) => { ok: boolean; message?: string }

  // chofer
  setDriverAvailability: (available: boolean, location?: GeoPoint) => void

  // abonos: flujo de verificación
  requestSettlement: (evidenceUrl: string, amount?: number) => { ok: boolean; id?: string; message?: string }
  approveSettlement: (settlementId: string) => { ok: boolean; message?: string }
  rejectSettlement: (settlementId: string, reason?: string) => { ok: boolean; message?: string }
  settleDriver: (driverId: string) => void

  // cliente
  requestRide: (payload: {
    pickupAddress: string
    pickupPoint: GeoPoint
    destinationAddress: string
    destinationPoint: GeoPoint
    hasRouteChanges: boolean
    preferredDriverId?: string
  }) => { ok: boolean; id?: string; message?: string }

  // flujo de carreras
  acceptRide: (rideId: string, locationAtAccept?: GeoPoint) => void
  rejectRide: (rideId: string) => void
  completeRide: (rideId: string) => void

  // quejas
  fileComplaint: (rideId: string, message: string) => { ok: boolean; message?: string }

  // internas/automatizaciones
  runAutomations: () => void
}

/**
 * Crea usuarios por defecto: admin/admin y gestor/gestor
 */
function createDefaultUsers(): AnyUser[] {
  const admin: AdminUser = {
    id: 'u_admin',
    username: 'admin',
    password: 'admin',
    role: 'admin',
    fullName: 'Administrador Pal Taxi',
    phone: '00000000',
    ci: 'N/A',
    status: 'active',
    createdAt: now(),
  }
  const gestor: ManagerUser = {
    id: 'u_gestor',
    username: 'gestor',
    password: 'gestor',
    role: 'gestor',
    fullName: 'Gestor General',
    phone: '00000001',
    ci: 'N/A',
    status: 'active',
    createdAt: now(),
  }
  return [admin, gestor]
}

/**
 * Estado inicial de la aplicación.
 */
const initialSettings: AppSettings = {
  tariffPerKm: 60, // Ejemplo: 60 CUP/km
  reputationThreshold: 50,
  commissionPercent: 10,
  settlementPeriodDays: 15,
  payment: {
    beneficiaryName: 'Pal Taxi Agencia',
    cardNumber: '0000 0000 0000 0000',
    phone: '+53 50000000',
    bankName: 'Banco Ejemplo',
    instructions: 'Incluya su usuario como referencia en la transferencia.',
  },
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      users: createDefaultUsers(),
      rides: [],
      complaints: [],
      settlements: [],
      settings: initialSettings,
      currentUser: undefined,

      login: (username, password, role) => {
        const user = get().users.find(
          (u) => u.username === username && u.password === password && (!role || u.role === role)
        )
        if (!user) return { ok: false, message: 'Credenciales inválidas' }
        if (user.status !== 'active' && user.role !== 'admin' && user.role !== 'gestor') {
          return { ok: false, message: 'Cuenta pendiente o expulsada. Contacte al gestor.' }
        }
        set({ currentUser: user })
        return { ok: true }
      },

      logout: () => {
        set({ currentUser: undefined })
      },

      registerClient: (data) => {
        const exists = get().users.some((u) => u.username === data.username)
        if (exists) return { ok: false, message: 'El nombre de usuario ya existe.' }
        const client: ClientUser = {
          ...data,
          id: uid('cli'),
          role: 'cliente',
          status: 'pending',
          createdAt: now(),
        }
        set({ users: [...get().users, client] })
        return { ok: true, id: client.id }
      },

      registerDriver: (data) => {
        const exists = get().users.some((u) => u.username === data.username)
        if (exists) return { ok: false, message: 'El nombre de usuario ya existe.' }
        const driver: DriverUser = {
          ...data,
          id: uid('drv'),
          role: 'chofer',
          status: 'pending',
          createdAt: now(),
          reputation: 100,
          earningsSinceLastSettlement: 0,
          lastSettlementAt: now(),
          complaintsCount: 0,
          available: false,
        } as DriverUser
        set({ users: [...get().users, driver] })
        return { ok: true, id: driver.id }
      },

      setSettings: (partial) => {
        // Mezcla superficial; para payment se suele pasar el objeto completo desde el UI
        set({ settings: { ...get().settings, ...partial } })
        get().runAutomations()
      },

      setUserStatus: (userId, status) => {
        set({
          users: get().users.map((u) => (u.id === userId ? { ...u, status } : u)),
        })
      },

      createUser: (payload) => {
        const me = get().currentUser
        if (!me || (me.role !== 'gestor' && me.role !== 'admin')) return { ok: false, message: 'No autorizado.' }
        const exists = get().users.some((u) => u.username === payload.username)
        if (exists) return { ok: false, message: 'Usuario ya existe.' }
        const base: AnyUser = {
          ...(payload as AnyUser),
          id: uid('usr'),
          createdAt: now(),
          status: payload.status ?? 'active',
        }
        // Completar defaults por rol
        let user: AnyUser = base
        if (payload.role === 'chofer') {
          const d = base as unknown as DriverUser
          user = {
            ...d,
            role: 'chofer',
            reputation: (d as any).reputation ?? 100,
            earningsSinceLastSettlement: 0,
            lastSettlementAt: now(),
            complaintsCount: 0,
            available: false,
            vehicle: d.vehicle ?? { ac: true, capacity: 4 },
          } as DriverUser
        }
        set({ users: [...get().users, user] })
        return { ok: true, id: user.id }
      },

      updateUser: (userId, partial) => {
        const me = get().currentUser
        if (!me || (me.role !== 'gestor' && me.role !== 'admin')) return { ok: false, message: 'No autorizado.' }
        set({
          users: get().users.map((u) => (u.id === userId ? ({ ...u, ...partial } as AnyUser) : u)),
        })
        return { ok: true }
      },

      deleteUser: (userId) => {
        const me = get().currentUser
        if (!me || (me.role !== 'gestor' && me.role !== 'admin')) return { ok: false, message: 'No autorizado.' }
        if (userId === 'u_admin' || userId === 'u_gestor') return { ok: false, message: 'No se puede eliminar esta cuenta.' }
        if (me.id === userId) return { ok: false, message: 'No puede eliminar su propia cuenta.' }
        set({ users: get().users.filter((u) => u.id !== userId) })
        return { ok: true }
      },

      setDriverAvailability: (available, location) => {
        const user = get().currentUser
        if (!user || user.role !== 'chofer') return
        set({
          users: get().users.map((u) =>
            u.id === user.id
              ? ({
                  ...(u as DriverUser),
                  available,
                  location: location ?? (u as DriverUser).location,
                } as AnyUser)
              : u
          ),
        })
      },

      requestSettlement: (evidenceUrl, amount) => {
        const me = get().currentUser
        if (!me || me.role !== 'chofer') return { ok: false, message: 'Debe iniciar sesión como chofer.' }
        const driver = get().users.find((u) => u.id === me.id) as DriverUser | undefined
        if (!driver) return { ok: false, message: 'Chofer no encontrado.' }
        const due = typeof amount === 'number' ? amount : driver.earningsSinceLastSettlement
        if (due <= 0) return { ok: false, message: 'No tiene saldo pendiente para abonar.' }
        if (!evidenceUrl) return { ok: false, message: 'Debe subir evidencia del pago.' }
        const s: Settlement = {
          id: uid('stl'),
          driverId: driver.id,
          amount: +due.toFixed(2),
          status: 'pending',
          evidenceUrl,
          createdAt: now(),
        }
        set({ settlements: [s, ...get().settlements] })
        return { ok: true, id: s.id }
      },

      approveSettlement: (settlementId) => {
        const me = get().currentUser
        if (!me || (me.role !== 'gestor' && me.role !== 'admin')) return { ok: false, message: 'No autorizado.' }
        const s = get().settlements.find((x) => x.id === settlementId)
        if (!s) return { ok: false, message: 'Abono no encontrado.' }
        // Ejecutar corte
        get().settleDriver(s.driverId)
        // Marcar como aprobado
        set({
          settlements: get().settlements.map((x) =>
            x.id === settlementId ? { ...x, status: 'approved', reviewedAt: now(), reviewerId: me.id } : x
          ),
        })
        return { ok: true }
      },

      rejectSettlement: (settlementId, reason) => {
        const me = get().currentUser
        if (!me || (me.role !== 'gestor' && me.role !== 'admin')) return { ok: false, message: 'No autorizado.' }
        const s = get().settlements.find((x) => x.id === settlementId)
        if (!s) return { ok: false, message: 'Abono no encontrado.' }
        set({
          settlements: get().settlements.map((x) =>
            x.id === settlementId ? { ...x, status: 'rejected', reviewedAt: now(), reviewerId: me.id, rejectionReason: reason } : x
          ),
        })
        return { ok: true }
      },

      settleDriver: (driverId) => {
        const { users } = get()
        const updated = users.map((u) => {
          if (u.id !== driverId || u.role !== 'chofer') return u
          const d = u as DriverUser
          return {
            ...d,
            earningsSinceLastSettlement: 0,
            lastSettlementAt: now(),
          }
        })
        set({ users: updated })
        // Re-evaluar automatizaciones tras un corte
        get().runAutomations()
      },

      requestRide: ({
        pickupAddress,
        pickupPoint,
        destinationAddress,
        destinationPoint,
        hasRouteChanges,
        preferredDriverId,
      }) => {
        const me = get().currentUser
        if (!me || me.role !== 'cliente') return { ok: false, message: 'Debe iniciar sesión como cliente.' }
        const distKm = haversineKm(pickupPoint, destinationPoint)
        const { tariffPerKm } = get().settings
        const price = Math.max(0, distKm * tariffPerKm)
        const eta = estimateEtaMin(distKm)
        const ride: Ride = {
          id: uid('ride'),
          clientId: me.id,
          status: 'pending',
          preferredDriverId,
          pickupAddress,
          pickupPoint,
          destinationAddress,
          destinationPoint,
          distanceKm: parseFloat(distKm.toFixed(2)),
          price: parseFloat(price.toFixed(2)),
          etaMin: eta,
          hasRouteChanges,
          createdAt: now(),
        }
        set({ rides: [ride, ...get().rides] })
        return { ok: true, id: ride.id }
      },

      acceptRide: (rideId, locationAtAccept) => {
        const me = get().currentUser
        if (!me || me.role !== 'chofer') return
        // Acepta solo si el chofer está activo y disponible
        const myDriver = get().users.find((u) => u.id === me.id) as DriverUser | undefined
        if (!myDriver || myDriver.status !== 'active' || !myDriver.available) return
        set({
          rides: get().rides.map((r) =>
            r.id === rideId &&
            r.status === 'pending' &&
            (!r.preferredDriverId || r.preferredDriverId === me.id)
              ? { ...r, status: 'accepted', driverId: me.id, acceptedAt: now() }
              : r
          ),
          users: get().users.map((u) =>
            u.id === me.id
              ? ({ ...(u as DriverUser), location: locationAtAccept ?? (u as DriverUser).location, available: false } as AnyUser)
              : u
          ),
        })
      },

      rejectRide: (rideId) => {
        const me = get().currentUser
        if (!me || me.role !== 'chofer') return
        set({
          rides: get().rides.map((r) =>
            r.id === rideId && r.status === 'pending' ? { ...r, status: 'rejected' } : r
          ),
        })
      },

      completeRide: (rideId) => {
        const { rides, users, settings } = get()
        const ride = rides.find((r) => r.id === rideId)
        const me = get().currentUser
        if (!ride || !me || me.role !== 'chofer' || ride.driverId !== me.id) return
        const commission = (ride.price * settings.commissionPercent) / 100
        const earningNet = ride.price - commission
        set({
          rides: rides.map((r) => (r.id === rideId ? { ...r, status: 'completed', completedAt: now() } : r)),
          users: users.map((u) => {
            if (u.id !== me.id || u.role !== 'chofer') return u
            const d = u as DriverUser
            return { ...d, earningsSinceLastSettlement: +(d.earningsSinceLastSettlement + earningNet).toFixed(2) }
          }),
        })
        get().runAutomations()
      },

      fileComplaint: (rideId, message) => {
        const me = get().currentUser
        if (!me || me.role !== 'cliente') return { ok: false, message: 'Debe iniciar sesión como cliente.' }
        const ride = get().rides.find((r) => r.id === rideId)
        if (!ride || !ride.driverId) return { ok: false, message: 'Carrera inválida.' }
        const complaint: Complaint = {
          id: uid('cmp'),
          rideId,
          clientId: me.id,
          driverId: ride.driverId,
          message,
          createdAt: now(),
        }
        set({ complaints: [complaint, ...get().complaints] })

        // Actualizar reputación y quejas del chofer
        const { users, settings } = get()
        const updated = users.map((u) => {
          if (u.id !== ride.driverId || u.role !== 'chofer') return u
          const d = u as DriverUser
          const newComplaints = d.complaintsCount + 1
          const newRep = calcReputation(d.reputation, 1) // resta 8 puntos por queja
          const expelled = newRep < settings.reputationThreshold
          return {
            ...d,
            complaintsCount: newComplaints,
            reputation: newRep,
            status: expelled ? 'expelled' : d.status,
            available: expelled ? false : d.available,
          }
        })
        set({ users: updated })

        return { ok: true }
      },

      runAutomations: () => {
        const { users, settings } = get()
        const nowTs = now()
        const msPerDay = 24 * 60 * 60 * 1000
        const updated = users.map((u) => {
          if (u.role !== 'chofer') return u
          const d = u as DriverUser
          // Expulsión por falta de abono tras periodo si hay saldo pendiente
          const daysSinceSettlement = (nowTs - d.lastSettlementAt) / msPerDay
          if (d.earningsSinceLastSettlement > 0 && daysSinceSettlement >= settings.settlementPeriodDays) {
            return { ...d, status: 'expelled', available: false }
          }
          // Mantener consistencia de reputación mínima
          if (d.reputation < settings.reputationThreshold && d.status !== 'expelled') {
            return { ...d, status: 'expelled', available: false }
          }
          return d
        })
        set({ users: updated as AnyUser[] })
      },
    }),
    {
      name: 'paltaxi-store',
      partialize: (s) => ({
        users: s.users,
        rides: s.rides,
        complaints: s.complaints,
        settlements: s.settlements,
        settings: s.settings,
        currentUser: s.currentUser,
      }),
      // Versión para migraciones: asegura que settings.payment exista siempre.
      version: 1,
      migrate: (persistedState: unknown, _version: number) => {
        const s: Record<string, any> = (persistedState as any) ?? {}
        // Asegurar estructuras base
        s.users = Array.isArray(s.users) ? s.users : createDefaultUsers()
        s.rides = Array.isArray(s.rides) ? s.rides : []
        s.complaints = Array.isArray(s.complaints) ? s.complaints : []
        s.settlements = Array.isArray(s.settlements) ? s.settlements : []
        // Normalizar settings y payment
        if (!s.settings) {
          s.settings = initialSettings
        } else {
          const old = s.settings
          s.settings = {
            ...initialSettings,
            ...old,
            payment: {
              ...initialSettings.payment,
              ...(old.payment || {}),
            },
          }
        }
        return s
      },
    }
  )
)
