import { AddMonitorModal } from '../add/AddMonitorModal'
import { AlertBanner } from '../alerts/AlertBanner'
import { MonitorDetail } from '../detail/MonitorDetail'
import { DashboardGrid } from '../grid/DashboardGrid'
import { TopBar } from './TopBar'
import styles from './DashboardLayout.module.css'

export function DashboardLayout() {
  return (
    <div className={styles.app}>
      <TopBar />
      <main className={styles.main}>
        <AlertBanner />
        <DashboardGrid />
      </main>
      <MonitorDetail />
      <AddMonitorModal />
    </div>
  )
}
