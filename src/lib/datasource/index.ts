import type { DataSource } from './DataSource'
import { SimulatedDataSource } from './SimulatedDataSource'

/**
 * Factory for the app's data source. Today it returns the simulated feed.
 * When the real patch hardware exists, return a `RealtimeDataSource` here
 * (WebSocket / BLE) implementing the same {@link DataSource} interface — the
 * UI does not change.
 */
export function createDataSource(): DataSource {
  return new SimulatedDataSource()
}

export type { DataSource, DemoApi } from './DataSource'
