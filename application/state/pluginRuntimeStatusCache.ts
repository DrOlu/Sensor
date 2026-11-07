type PluginRuntimeBridge = Pick<SensorBridge, "getPluginRuntimeStatus">;

interface StatusCacheEntry {
  value?: SensorPluginRuntimeStatus;
  pending?: Promise<SensorPluginRuntimeStatus>;
}

let statusByBridge = new WeakMap<object, StatusCacheEntry>();

export async function getSharedPluginRuntimeStatus(
  bridge: PluginRuntimeBridge,
): Promise<SensorPluginRuntimeStatus> {
  const key = bridge as object;
  let entry = statusByBridge.get(key);
  if (!entry) {
    entry = {};
    statusByBridge.set(key, entry);
  }
  if (entry.value) return entry.value;
  if (entry.pending) return entry.pending;

  const pending = bridge.getPluginRuntimeStatus!().then((status) => {
    entry!.value = status;
    return status;
  }).finally(() => {
    if (entry?.pending === pending) entry.pending = undefined;
  });
  entry.pending = pending;
  return pending;
}

export function invalidateSharedPluginRuntimeStatus(bridge: object): void {
  const entry = statusByBridge.get(bridge);
  if (entry) entry.value = undefined;
}

export function _resetSharedPluginRuntimeStatusForTests(): void {
  statusByBridge = new WeakMap();
}
