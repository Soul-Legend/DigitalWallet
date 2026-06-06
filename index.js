import 'fast-text-encoding';
import 'react-native-get-random-values';
import webcrypto from 'isomorphic-webcrypto';
if (!global.crypto) {
  global.crypto = webcrypto;
} else if (!global.crypto.subtle) {
  global.crypto.subtle = webcrypto.subtle;
}

// @noble/ed25519 v3+ async methods (signAsync, verifyAsync, getPublicKeyAsync)
// default to crypto.subtle.digest('SHA-512'), which is unavailable in React
// Native (Hermes). Override sha512Async here — at the entry point — so it runs
// before any service module can trigger the error.
import * as ed from '@noble/ed25519';
import {sha512} from '@noble/hashes/sha512';
ed.hashes.sha512Async = async (...m) => sha512(ed.etc.concatBytes(...m));

import {AppRegistry} from 'react-native';
import App from './src/App';
import {name as appName} from './app.json';

AppRegistry.registerComponent(appName, () => App);

