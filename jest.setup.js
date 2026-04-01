// Polyfill WebCrypto for @noble/ed25519
const { webcrypto } = require('crypto');
if (!global.crypto) {
  global.crypto = webcrypto;
}

// Mock react-native modules
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper', () => ({}), {
  virtual: true,
});

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: 'GestureHandlerRootView',
}), {
  virtual: true,
});

// Mock AgentService globally for all tests
// The Credo agent requires native modules that are not available in test env
jest.mock('./src/services/AgentService', () => {
  let callCount = 0;
  const mockAgent = {
    initialize: jest.fn().mockResolvedValue(undefined),
    shutdown: jest.fn().mockResolvedValue(undefined),
    dids: {
      create: jest.fn().mockImplementation(() => {
        callCount++;
        const did = `did:key:z6Mk${callCount}${Date.now()}${Math.random().toString(36).slice(2, 12)}`;
        return Promise.resolve({
          didState: {
            state: 'finished',
            did,
            didDocument: {
              verificationMethod: [{
                id: `${did}#key-1`,
                type: 'Ed25519VerificationKey2018',
                publicKey: Buffer.from('mock-public-key'),
              }],
            },
          },
        });
      }),
      resolve: jest.fn().mockResolvedValue({
        didDocument: {
          verificationMethod: [{
            id: 'did:key:z6MkTest#key-1',
            type: 'Ed25519VerificationKey2018',
            publicKey: Buffer.from('mock-public-key'),
          }],
        },
      }),
    },
    wallet: {
      sign: jest.fn().mockResolvedValue({
        signature: Buffer.from('mock-ed25519-signature-value-padded-to-64-bytes-for-realism00000'),
      }),
    },
    modules: {
      anoncreds: {},
    },
  };
  return {
    __esModule: true,
    default: {
      getAgent: jest.fn().mockResolvedValue(mockAgent),
      isInitialized: jest.fn().mockReturnValue(true),
      shutdown: jest.fn().mockResolvedValue(undefined),
    },
  };
});

// Mock ZKProofService globally for all tests
// The mopro-ffi package requires native modules (Rust bindings via UniFFI)
jest.mock('./src/services/ZKProofService', () => {
  const mockCircomProof = {
    a: {x: '0x1234', y: '0x5678', z: '0x1'},
    b: {x: ['0xaa', '0xbb'], y: ['0xcc', '0xdd'], z: ['0x1', '0x0']},
    c: {x: '0xdead', y: '0xbeef', z: '0x1'},
    protocol: 'groth16',
    curve: 'bn128',
  };

  return {
    __esModule: true,
    default: {
      generateAgeRangeProof: jest.fn().mockResolvedValue({
        proof: mockCircomProof,
        inputs: ['1', '18'],
      }),
      generateStatusCheckProof: jest.fn().mockResolvedValue({
        proof: mockCircomProof,
        inputs: ['1'],
      }),
      generateNullifierProof: jest.fn().mockResolvedValue({
        proof: mockCircomProof,
        inputs: ['0xnullifier123'],
      }),
      verifyProof: jest.fn().mockResolvedValue(true),
      isCircuitAvailable: jest.fn().mockResolvedValue(true),
      getCircuitStatus: jest.fn().mockResolvedValue([
        {name: 'age_range', fileName: 'age_range_final.zkey', available: true},
        {name: 'status_check', fileName: 'status_check_final.zkey', available: true},
        {name: 'nullifier', fileName: 'nullifier_final.zkey', available: true},
      ]),
      extractNullifier: jest.fn().mockReturnValue('0xnullifier123'),
    },
  };
});

// Custom serializer to truncate long strings in test output
expect.addSnapshotSerializer({
  test: (val) => typeof val === 'string' && val.length > 100,
  print: (val) => {
    const truncated = val.length > 100 ? `${val.substring(0, 50)}...${val.substring(val.length - 50)}` : val;
    return `"${truncated}"`;
  },
});

// Override console methods to reduce noise in test output
const originalError = console.error;
const originalWarn = console.warn;

console.error = (...args) => {
  // Filter out known noisy errors
  const message = args[0]?.toString() || '';
  if (
    message.includes('Warning: ReactDOM.render') ||
    message.includes('Not implemented: HTMLFormElement.prototype.submit') ||
    message.includes('base64') ||
    message.includes('1lX2NvbXBsZXRv')
  ) {
    return;
  }
  originalError.apply(console, args);
};

console.warn = (...args) => {
  // Filter out known noisy warnings
  const message = args[0]?.toString() || '';
  if (
    message.includes('componentWillReceiveProps') ||
    message.includes('componentWillMount')
  ) {
    return;
  }
  originalWarn.apply(console, args);
};

// Note: Custom matchers removed to avoid jest.setup.js issues
// Long strings are already handled by the snapshot serializer above
