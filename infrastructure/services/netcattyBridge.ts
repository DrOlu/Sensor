export class BridgeUnavailableError extends Error {
  constructor(message = "Sensor bridge unavailable") {
    super(message);
    this.name = "BridgeUnavailableError";
  }
}

export const netcattyBridge = {
  get(): SensorBridge | undefined {
    return window.netcatty;
  },

  require(): SensorBridge {
    const bridge = window.netcatty;
    if (!bridge) throw new BridgeUnavailableError();
    return bridge;
  },
};

