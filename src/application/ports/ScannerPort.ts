export interface ScannerPort {
  unavailableReason(): string | null
  startScan(
    elementId: string,
    onCodeDetected: (code: string) => void,
    onError: (message: string) => void,
  ): Promise<void>
  torchAvailable?(): Promise<boolean>
  setTorch?(enabled: boolean): Promise<void>
  stopScan(): Promise<void>
}
