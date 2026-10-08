import { createContext, useContext } from 'react'
import type { AppServices } from '../../application/services/AppServices'

export const ServicesContext = createContext<AppServices | null>(null)
export function useAppServices(): AppServices {
  const services = useContext(ServicesContext)
  if (!services) throw new Error('useAppServices precisa de AppServicesProvider')
  return services
}
