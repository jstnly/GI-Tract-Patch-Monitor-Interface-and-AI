import { DashboardLayout } from './components/layout/DashboardLayout'
import { MonitorProvider } from './state/MonitorProvider'

export function App() {
  return (
    <MonitorProvider>
      <DashboardLayout />
    </MonitorProvider>
  )
}
