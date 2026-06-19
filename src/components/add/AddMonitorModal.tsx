import { useMonitorActions, useUIState } from '../../state/hooks'
import { Modal } from '../ui/Modal'
import { AddMonitorForm } from './AddMonitorForm'

export function AddMonitorModal() {
  const { addModalOpen } = useUIState()
  const actions = useMonitorActions()

  return (
    <Modal open={addModalOpen} onClose={actions.closeAdd} title="Add monitor">
      <AddMonitorForm onSubmit={actions.addMonitor} onCancel={actions.closeAdd} />
    </Modal>
  )
}
