/**
 * HomeScreen navigation contract — static smoke test
 *
 * We don't render the screen (no react-native-testing-library is configured,
 * and mocking the entire RN bridge for a navigation contract is overkill).
 * Instead we statically read the HomeScreen source and assert that every
 * `route:` literal it advertises is a valid key of `RootStackParamList`.
 *
 * This is a structural regression net: if someone renames a navigator route
 * or mistypes a destination in HomeScreen, this test fails immediately with a
 * clear message — without booting React.
 */

import {readFileSync} from 'fs';
import {join} from 'path';
import {RootStackParamList} from '../../App';

const HOME_SCREEN_PATH = join(__dirname, '..', 'HomeScreen.tsx');
const APP_PATH = join(__dirname, '..', '..', 'App.tsx');

// Compile-time guarantee that this list stays in sync with the type:
// any rename/removal of a route key will produce a TS error here.
const KNOWN_ROUTES: ReadonlyArray<keyof RootStackParamList> = [
  'Initialization',
  'Home',
  'Emissor',
  'Titular',
  'Verificador',
  'Logs',
  'Glossario',
];

describe('HomeScreen — navigation contract', () => {
  let source: string;
  let appSource: string;

  beforeAll(() => {
    source = readFileSync(HOME_SCREEN_PATH, 'utf8');
    appSource = readFileSync(APP_PATH, 'utf8');
  });

  it('declares only routes that exist in RootStackParamList', () => {
    // Match every `route: 'X' as const` literal in the module list.
    const routeLiteralRegex = /route:\s*'([A-Za-z]+)'\s+as\s+const/g;
    const referenced = new Set<string>();
    for (const match of source.matchAll(routeLiteralRegex)) {
      referenced.add(match[1]);
    }

    expect(referenced.size).toBeGreaterThan(0);
    for (const route of referenced) {
      expect(KNOWN_ROUTES).toContain(route as keyof RootStackParamList);
    }
  });

  it('routes referenced by HomeScreen are all registered in App.tsx Stack.Navigator', () => {
    const routeLiteralRegex = /route:\s*'([A-Za-z]+)'\s+as\s+const/g;
    const referenced = Array.from(source.matchAll(routeLiteralRegex)).map(
      m => m[1],
    );

    for (const route of referenced) {
      // Each route must appear as a `<Stack.Screen name="X" ...>` declaration.
      const screenDecl = new RegExp(`<Stack\\.Screen\\s+name="${route}"`);
      expect(appSource).toMatch(screenDecl);
    }
  });

  it('navigation prop is invoked via navigation.navigate (no untyped Linking calls)', () => {
    expect(source).toMatch(/navigation\.navigate\(/);
    // Forbid raw deep-linking from the home tile handler:
    expect(source).not.toMatch(/Linking\.openURL/);
  });
});
