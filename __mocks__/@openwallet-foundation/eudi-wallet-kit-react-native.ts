/**
 * Mock for @openwallet-foundation/eudi-wallet-kit-react-native
 */

export enum TransferEventType {
  Connecting = 'TransferConnecting',
  Connected = 'TransferConnected',
  Disconnected = 'TransferDisconnected',
  Error = 'TransferError',
  QrEngagementReady = 'TransferQrEngagementReady',
  RequestReceived = 'TransferRequestReceived',
  ResponseSent = 'TransferResponseSent',
  Redirect = 'TransferRedirect',
}

export enum EncryptionAlgorithm {
  ECDH_ES = 'ECDH_ES',
  ECDH_ES_A128KW = 'ECDH_ES_A128KW',
  ECDH_ES_A256KW = 'ECDH_ES_A256KW',
}

export enum EncryptionMethod {
  A128CBC_HS256 = 'A128CBC_HS256',
  A256GCM = 'A256GCM',
}

export enum ClientIdSchemeType {
  Preregistered = 'Preregistered',
  X509SanDns = 'X509SanDns',
  X509SanUri = 'X509SanUri',
}

export enum BLETransferMode {
  BLE_SERVER_PERIPHERAL_MODE = 1,
  BLE_CLIENT_CENTRAL_MODE = 2,
}

const listeners = new Map<string, (event: any) => void>();
let listenerCount = 0;

export const EudiWallet = {
  isInitialized: false,

  initialize: jest.fn(async (_config: any) => {
    EudiWallet.isInitialized = true;
  }),

  getDocuments: jest.fn(async () => []),

  getDocumentById: jest.fn(async (_id: string) => ({
    id: 'mock-doc-1',
    docType: 'eu.europa.ec.eudiw.pid.1',
    name: 'Mock PID',
    namespaces: {},
    namespacedData: {},
  })),

  deleteDocumentById: jest.fn(async (_id: string) => {}),

  issueDocumentByDocType: jest.fn(async (_docType: string) => ({
    totalCount: 1,
    issuedCount: 1,
    issuedDocumentIds: ['mock-doc-1'],
  })),

  issueDocumentByOfferUri: jest.fn(async (_offerUri: string) => ({
    totalCount: 1,
    issuedCount: 1,
    issuedDocumentIds: ['mock-doc-1'],
  })),

  resolveDocumentOffer: jest.fn(async (_offerUri: string) => ({
    issuerName: 'Mock Issuer',
    offeredDocuments: [{name: 'Mock PID', docType: 'eu.europa.ec.eudiw.pid.1'}],
  })),

  resumeOpenId4VciWithAuthorization: jest.fn((_uri: string) => {}),

  startRemotePresentation: jest.fn((_url: string) => {}),

  startProximityPresentation: jest.fn(() => {}),

  sendResponse: jest.fn(async (_disclosedDocuments: any[]) => {}),

  stopPresentation: jest.fn((_sendTermination?: boolean, _useTransportSpecific?: boolean) => {}),

  loadSampleData: jest.fn(async (_sampleDataFile?: string) => {}),

  addTransferEventListener: jest.fn((listener: (event: any) => void) => {
    const id = `mock-listener-${++listenerCount}`;
    listeners.set(id, listener);
    return id;
  }),

  removeTransferEventListener: jest.fn((listenerId: string) => {
    listeners.delete(listenerId);
  }),
};
