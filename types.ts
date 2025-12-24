
export enum ServiceType {
  REVISION = 'REVISION',
  REPLACEMENT = 'REPLACEMENT'
}

export interface MaintenanceRecord {
  id: string;
  carId: string;
  partName: string;
  type: ServiceType;
  date: string;
  mileage: number;
  notes?: string;
  cost?: number;
}

export interface Car {
  id: string;
  make: string;
  model: string;
  year: number;
  plate?: string;
  currentMileage: number;
  color: string;
}

export interface User {
  id: string;
  name: string;
  username: string;
  password: string;
}

export type AppView = 'login' | 'home' | 'car-details' | 'add-car' | 'add-maintenance' | 'edit-maintenance' | 'settings' | 'dashboard' | 'import-data' | 'change-password';
