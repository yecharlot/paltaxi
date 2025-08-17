/**
 * Tipos e interfaces principales para Pal Taxi.
 * Define roles, usuarios, carreras, quejas, abonos y configuración.
 */

export type Role = 'admin' | 'gestor' | 'chofer' | 'cliente'

/** Estado del usuario en la plataforma. */
export type UserStatus = 'pending' | 'active' | 'expelled'

/** Coordenadas geográficas básicas. */
export interface GeoPoint {
  /** Latitud decimal */
  lat: number
  /** Longitud decimal */
  lng: number
}

/** Datos base de un usuario. */
export interface BaseUser {
  id: string
  username: string
  password: string
  role: Role
  fullName: string
  phone: string
  ci: string
  status: UserStatus
  createdAt: number
}

/** Cliente con documentos. */
export interface ClientUser extends BaseUser {
  role: 'cliente'
  idCardFrontUrl?: string
  idCardBackUrl?: string
}

/** Datos del vehículo de un chofer. */
export interface VehicleInfo {
  /** ¿Climatizado? */
  ac: boolean
  /** Capacidad de asientos (incluyendo conductor) */
  capacity: number
  /** Foto del vehículo */
  vehiclePhotoUrl?: string
  /** Licencia de conducción */
  driverLicenseUrl?: string
  /** Foto de circulación del vehículo */
  circulationCardUrl?: string
}

/** Chofer con reputación y disponibilidad. */
export interface DriverUser extends BaseUser {
  role: 'chofer'
  idCardFrontUrl?: string
  idCardBackUrl?: string
  vehicle: VehicleInfo
  /** Disponible para tomar carreras */
  available: boolean
  /** Ubicación actual (cuando disponible) */
  location?: GeoPoint
  /** Reputación (0-100) */
  reputation: number
  /** Suma de ingresos desde el último corte */
  earningsSinceLastSettlement: number
  /** Timestamp del último corte/abono */
  lastSettlementAt: number
  /** Número de quejas recibidas */
  complaintsCount: number
}

/** Gestor. */
export interface ManagerUser extends BaseUser {
  role: 'gestor'
}

/** Administrador. */
export interface AdminUser extends BaseUser {
  role: 'admin'
}

/** Estados de una carrera. */
export type RideStatus = 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled'

/** Solicitud/carrera. */
export interface Ride {
  id: string
  clientId: string
  driverId?: string
  /** Chofer preferido seleccionado por el cliente (opcional) */
  preferredDriverId?: string
  status: RideStatus
  pickupAddress: string
  pickupPoint: GeoPoint
  destinationAddress: string
  destinationPoint: GeoPoint
  /** Distancia en km (Haversine) */
  distanceKm: number
  /** Precio total según tarifa */
  price: number
  /** ETA aproximado en minutos */
  etaMin: number
  /** Cambios de ruta/paradas intermedias indicadas por el cliente */
  hasRouteChanges: boolean
  createdAt: number
  acceptedAt?: number
  completedAt?: number
}

/** Queja de un cliente hacia un chofer. */
export interface Complaint {
  id: string
  rideId: string
  clientId: string
  driverId: string
  message: string
  createdAt: number
}

/** Configuración de pago parametrizable por el Gestor. */
export interface PaymentSettings {
  /** Nombre del beneficiario/titular */
  beneficiaryName: string
  /** Número de tarjeta/cuenta */
  cardNumber: string
  /** Teléfono para confirmar el pago */
  phone: string
  /** Banco o proveedor (opcional) */
  bankName?: string
  /** Instrucciones adicionales (opcional) */
  instructions?: string
}

/** Configuración del sistema editable por el Gestor. */
export interface AppSettings {
  /** Tarifa por kilómetro */
  tariffPerKm: number
  /** Umbral de reputación mínimo antes de expulsión automática */
  reputationThreshold: number
  /** Porcentaje de comisión de la agencia (fijo 10% por requisito) */
  commissionPercent: number
  /** Días del período de corte/abono (fijo 15 por requisito) */
  settlementPeriodDays: number
  /** Datos de pago para abonos */
  payment: PaymentSettings
}

/** Estados de una solicitud de abono. */
export type SettlementStatus = 'pending' | 'approved' | 'rejected'

/** Solicitud de abono realizada por un chofer. */
export interface Settlement {
  id: string
  driverId: string
  amount: number
  status: SettlementStatus
  /** Evidencia de transferencia (data URL) */
  evidenceUrl?: string
  createdAt: number
  reviewedAt?: number
  reviewerId?: string
  rejectionReason?: string
}

/** Usuario unificado para conveniencia. */
export type AnyUser = AdminUser | ManagerUser | DriverUser | ClientUser
