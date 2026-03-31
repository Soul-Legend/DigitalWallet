/**
 * Mock for @credo-ts/core
 * Used in tests to simulate Credo functionality without native modules
 */

export const Agent = jest.fn();
export const KeyType = {
  Ed25519: 'ed25519',
  X25519: 'x25519',
};
export const DidKey = jest.fn();
export const DidPeer = jest.fn();
