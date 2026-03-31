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
