import type { ReactNode } from 'react'
import type { AppServices } from '../../application/services/AppServices'
import { ServicesContext } from './services-context'

export function AppServicesProvider({
  services,
  children,
}: {
  services: AppServices
  children: ReactNode
}) {
  return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>
}
