import LogServiceInstance from './LogService';
import type {ILogService} from '../types';

// Declare require for dynamic imports (provided by Metro bundler at runtime)
declare const require: (id: string) => any;

/**
 * EudiTransportService - Optional transport layer using EUDI wallet-kit
 *
 * Wraps @openwallet-foundation/eudi-wallet-kit-react-native to provide
 * BLE proximity and OpenID4VP remote presentation as transport alternatives
 * to the default clipboard-based exchange.
 *
 * This is an opt-in service: the app defaults to clipboard exchange and
 * can be configured to use EUDI transport for production deployments.
 *
 * Transport modes:
 * - 'clipboard': Default. Manual copy/paste (no EUDI dependency needed)
 * - 'proximity': BLE engagement with QR code (ISO 18013-5)
 * - 'remote': OpenID4VP URL-based presentation (ISO 18013-7)
 */

// Re-export types that consumers need
export type TransportMode = 'clipboard' | 'proximity' | 'remote' | 'qrcode';

export interface TransportEvent {
  type: TransportEventType;
  data?: any;
}

export enum TransportEventType {
  Connecting = 'Connecting',
  Connected = 'Connected',
  Disconnected = 'Disconnected',
  Error = 'Error',
  QrReady = 'QrReady',
  RequestReceived = 'RequestReceived',
  ResponseSent = 'ResponseSent',
  Redirect = 'Redirect',
}

export type TransportEventListener = (event: TransportEvent) => void;

// Lazy import of EUDI wallet-kit to avoid crashes when not installed
let EudiWallet: any = null;
let TransferEventType: any = null;

async function loadEudiModule(): Promise<boolean> {
  if (EudiWallet !== null) {
    return true;
  }
  try {
    // Dynamic require for optional dependency
    const mod = require('@openwallet-foundation/eudi-wallet-kit-react-native');
    EudiWallet = mod.EudiWallet;
    TransferEventType = mod.TransferEventType;
    return true;
  } catch {
    return false;
  }
}

class EudiTransportService {
  private currentMode: TransportMode = 'clipboard';
  private listeners: Map<string, TransportEventListener> = new Map();
  private eudiListenerId: string | null = null;
  private isEudiAvailable: boolean | null = null;
  private initialized = false;
  private readonly logger: ILogService;

  constructor(logger: ILogService = LogServiceInstance) {
    this.logger = logger;
  }

  /**
   * Gets the current transport mode
   */
  getMode(): TransportMode {
    return this.currentMode;
  }

  /**
   * Checks whether the EUDI wallet-kit native module is available
   */
  async isAvailable(): Promise<boolean> {
    if (this.isEudiAvailable !== null) {
      return this.isEudiAvailable;
    }
    this.isEudiAvailable = await loadEudiModule();
    return this.isEudiAvailable;
  }

  /**
   * Initializes the EUDI transport layer
   *
   * Must be called before using proximity or remote modes.
   * Clipboard mode does not require initialization.
   *
   * @param config - EUDI wallet configuration
   */
  async initialize(config?: {
    trustedReaderCertificates?: string[];
    userAuthenticationRequired?: boolean;
    openId4VpScheme?: string;
  }): Promise<void> {
    if (this.initialized) {
      return;
    }

    const available = await this.isAvailable();
    if (!available) {
      this.logger.captureEvent(
        'presentation_creation',
        'titular',
        {
          parameters: {
            action: 'eudi_transport_not_available',
            message: 'EUDI wallet-kit not installed, clipboard mode only',
          },
        },
        true,
      );
      return;
    }

    try {
      const walletConfig: any = {
        userAuthenticationRequired: config?.userAuthenticationRequired ?? false,
      };

      if (config?.openId4VpScheme) {
        walletConfig.openId4VpConfig = {
          scheme: config.openId4VpScheme,
          encryptionAlgorithms: ['ECDH_ES'],
          encryptionMethods: ['A128CBC_HS256', 'A256GCM'],
          clientIdSchemes: [{type: 'X509SanDns'}],
        };
      }

      if (config?.trustedReaderCertificates) {
        walletConfig.trustedReaderCertificates = config.trustedReaderCertificates;
      }

      await EudiWallet.initialize(walletConfig);
      this.initialized = true;

      this.logger.captureEvent(
        'presentation_creation',
        'titular',
        {
          parameters: {
            action: 'eudi_transport_initialized',
            mode: this.currentMode,
          },
        },
        true,
      );
    } catch (error) {
      this.logger.captureEvent(
        'presentation_creation',
        'titular',
        {
          parameters: {
            action: 'eudi_transport_init_failed',
          },
        },
        false,
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }

  /**
   * Sets the transport mode
   * @param mode - 'clipboard', 'proximity', or 'remote'
   */
  async setMode(mode: TransportMode): Promise<void> {
    if (mode !== 'clipboard' && mode !== 'qrcode') {
      const available = await this.isAvailable();
      if (!available) {
        throw new Error(
          'EUDI wallet-kit não disponível. Instale @openwallet-foundation/eudi-wallet-kit-react-native',
        );
      }
      if (!this.initialized) {
        throw new Error('EUDI transport não inicializado. Chame initialize() primeiro.');
      }
    }

    this.currentMode = mode;

    this.logger.captureEvent(
      'presentation_creation',
      'titular',
      {
        parameters: {
          action: 'transport_mode_changed',
          mode,
        },
      },
      true,
    );
  }

  /**
   * Starts a proximity presentation session (BLE)
   * Generates a QR code for the verifier to scan.
   *
   * Listen for TransportEventType.QrReady to get the QR content.
   * Listen for TransportEventType.RequestReceived for the verifier's request.
   */
  async startProximityPresentation(): Promise<void> {
    if (this.currentMode !== 'proximity') {
      throw new Error('Transport mode must be "proximity" to start proximity presentation');
    }

    this.setupEudiEventBridge();
    EudiWallet.startProximityPresentation();

    this.logger.captureEvent(
      'presentation_creation',
      'titular',
      {
        parameters: {
          action: 'proximity_presentation_started',
        },
      },
      true,
    );
  }

  /**
   * Starts a remote presentation session (OpenID4VP)
   *
   * @param url - The OpenID4VP request URL
   */
  async startRemotePresentation(url: string): Promise<void> {
    if (this.currentMode !== 'remote') {
      throw new Error('Transport mode must be "remote" to start remote presentation');
    }

    this.setupEudiEventBridge();
    EudiWallet.startRemotePresentation(url);

    this.logger.captureEvent(
      'presentation_creation',
      'titular',
      {
        parameters: {
          action: 'remote_presentation_started',
        },
      },
      true,
    );
  }

  /**
   * Sends a presentation response through the active EUDI transport
   *
   * @param disclosedDocuments - Documents with selected attributes to disclose
   */
  async sendResponse(disclosedDocuments: Array<{
    documentId: string;
    docType: string;
    selectedDocItems: Array<{namespace: string; elementIdentifier: string}>;
    docRequest: any;
  }>): Promise<void> {
    if (this.currentMode === 'clipboard') {
      throw new Error('Cannot send response via EUDI transport in clipboard mode');
    }

    await EudiWallet.sendResponse(disclosedDocuments);

    this.logger.captureEvent(
      'presentation_creation',
      'titular',
      {
        parameters: {
          action: 'eudi_response_sent',
          documents_count: disclosedDocuments.length,
        },
      },
      true,
    );
  }

  /**
   * Stops the active presentation session
   */
  stopPresentation(): void {
    if (this.currentMode === 'clipboard') {
      return;
    }

    try {
      EudiWallet.stopPresentation();
    } catch {
      // Ignore errors when stopping
    }

    this.cleanupEudiEventBridge();

    this.logger.captureEvent(
      'presentation_creation',
      'titular',
      {
        parameters: {
          action: 'presentation_stopped',
          mode: this.currentMode,
        },
      },
      true,
    );
  }

  /**
   * Registers a transport event listener
   * @returns Listener ID for removal
   */
  addEventListener(listener: TransportEventListener): string {
    const id = `listener_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    this.listeners.set(id, listener);
    return id;
  }

  /**
   * Removes a transport event listener
   */
  removeEventListener(listenerId: string): void {
    this.listeners.delete(listenerId);
  }

  /**
   * Bridges EUDI wallet-kit events to our transport events
   */
  private setupEudiEventBridge(): void {
    if (this.eudiListenerId) {
      return;
    }

    this.eudiListenerId = EudiWallet.addTransferEventListener((event: any) => {
      const transportEvent = this.mapEudiEvent(event);
      if (transportEvent) {
        this.emitEvent(transportEvent);
      }
    });
  }

  /**
   * Cleans up EUDI event bridge
   */
  private cleanupEudiEventBridge(): void {
    if (this.eudiListenerId) {
      try {
        EudiWallet.removeTransferEventListener(this.eudiListenerId);
      } catch {
        // Ignore cleanup errors
      }
      this.eudiListenerId = null;
    }
  }

  /**
   * Maps EUDI TransferEvent to our TransportEvent
   */
  private mapEudiEvent(eudiEvent: any): TransportEvent | null {
    if (!TransferEventType) {
      return null;
    }

    switch (eudiEvent.type) {
      case TransferEventType.Connecting:
        return {type: TransportEventType.Connecting};
      case TransferEventType.Connected:
        return {type: TransportEventType.Connected};
      case TransferEventType.Disconnected:
        return {type: TransportEventType.Disconnected};
      case TransferEventType.Error:
        return {
          type: TransportEventType.Error,
          data: {errorMessage: eudiEvent.errorMessage},
        };
      case TransferEventType.QrEngagementReady:
        return {
          type: TransportEventType.QrReady,
          data: {qrCodeContent: eudiEvent.qrCodeContent},
        };
      case TransferEventType.RequestReceived:
        return {
          type: TransportEventType.RequestReceived,
          data: {requestedDocuments: eudiEvent.requestedDocuments},
        };
      case TransferEventType.ResponseSent:
        return {type: TransportEventType.ResponseSent};
      case TransferEventType.Redirect:
        return {
          type: TransportEventType.Redirect,
          data: {redirectUri: eudiEvent.redirectUri},
        };
      default:
        return null;
    }
  }

  /**
   * Emits an event to all registered listeners
   */
  private emitEvent(event: TransportEvent): void {
    for (const listener of this.listeners.values()) {
      try {
        listener(event);
      } catch {
        // Don't let one listener crash others
      }
    }
  }
}

// Export singleton instance
export { EudiTransportService };

const eudiTransportServiceInstance = new EudiTransportService();
export default eudiTransportServiceInstance;
