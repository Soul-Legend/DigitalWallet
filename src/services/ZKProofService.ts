import {
  generateCircomProof,
  verifyCircomProof,
  CircomProofResult,
  ProofLib,
} from 'mopro-ffi';
import RNFS from 'react-native-fs';
import {sha256} from '@noble/hashes/sha256';
import LogServiceInstance from './LogService';
import {CryptoError} from './ErrorHandler';
import type {ILogService} from '../types';
import {utf8ToBytes} from './encoding';

/**
 * ZKProofService - Handles Zero-Knowledge Proof operations using mopro-ffi or snarkjs
 */

// Circuit zkey file names (must be placed in the app's assets or downloaded)
const CIRCUIT_ZKEYS: Record<string, string> = {
  age_range: 'age_range_final.zkey',
  status_check: 'status_check_final.zkey',
  nullifier: 'nullifier_final.zkey',
};

// Circuit wasm file names (must be placed in the app's assets or downloaded)
const CIRCUIT_WASMS: Record<string, string> = {
  age_range: 'age_range.wasm',
  status_check: 'status_check.wasm',
  nullifier: 'nullifier.wasm',
};

export type ZKPEnginePreference = 'mopro' | 'snarkjs';

class ZKProofService {
  private zkeyBasePath: string;
  private zkeyCache: Map<string, string> = new Map();
  private wasmCache: Map<string, string> = new Map();
  private readonly logger: ILogService;
  private preferredEngine: ZKPEnginePreference = 'mopro';

  constructor(logger: ILogService = LogServiceInstance) {
    this.logger = logger;
    // Use the app's document directory for zkey and wasm files
    this.zkeyBasePath = `${RNFS.DocumentDirectoryPath}/zkeys`;
  }

  /**
   * Sets the preferred ZKP engine.
   */
  setEnginePreference(engine: ZKPEnginePreference) {
    this.preferredEngine = engine;
  }

  /**
   * Gets the preferred ZKP engine.
   */
  getEnginePreference(): ZKPEnginePreference {
    return this.preferredEngine;
  }

  /**
   * Copies bundled .zkey and .wasm assets from the APK into DocumentDirectoryPath/zkeys/
   */
  async provisionBundledZkeys(): Promise<{
    provisioned: string[];
    missing: string[];
  }> {
    const provisioned: string[] = [];
    const missing: string[] = [];

    const dirExists = await RNFS.exists(this.zkeyBasePath);
    if (!dirExists) {
      await RNFS.mkdir(this.zkeyBasePath);
    }

    const copyAssets = (
      RNFS as unknown as {
        copyFileAssets?: (src: string, dest: string) => Promise<void>;
      }
    ).copyFileAssets;

    for (const [circuitName, fileName] of Object.entries(CIRCUIT_ZKEYS)) {
      const wasmFileName = CIRCUIT_WASMS[circuitName];
      const targetZkeyPath = `${this.zkeyBasePath}/${fileName}`;
      const targetWasmPath = `${this.zkeyBasePath}/${wasmFileName}`;
      
      let hasZkey = await RNFS.exists(targetZkeyPath);
      let hasWasm = await RNFS.exists(targetWasmPath);

      if (!__DEV__ && hasZkey && hasWasm) {
        provisioned.push(circuitName);
        continue;
      }

      try {
        if (typeof copyAssets === 'function') {
          if (!hasZkey) await copyAssets(`zkeys/${fileName}`, targetZkeyPath);
          if (!hasWasm) await copyAssets(`zkeys/${wasmFileName}`, targetWasmPath);
          provisioned.push(circuitName);
          continue;
        }
        // iOS fallback
        const bundledIosZkey = `${RNFS.MainBundlePath ?? ''}/zkeys/${fileName}`;
        const bundledIosWasm = `${RNFS.MainBundlePath ?? ''}/zkeys/${wasmFileName}`;
        if (bundledIosZkey && (await RNFS.exists(bundledIosZkey))) {
          if (!hasZkey) await RNFS.copyFile(bundledIosZkey, targetZkeyPath);
          if (!hasWasm) await RNFS.copyFile(bundledIosWasm, targetWasmPath);
          provisioned.push(circuitName);
          continue;
        }
        missing.push(circuitName);
      } catch {
        missing.push(circuitName);
      }
    }

    return {provisioned, missing};
  }

  /**
   * Ensures the zkeys directory exists and returns the path for a circuit's zkey
   */
  private async getZkeyPath(circuitName: string): Promise<string> {
    const cached = this.zkeyCache.get(circuitName);
    if (cached) {
      return cached;
    }

    const zkeyFileName = CIRCUIT_ZKEYS[circuitName];
    if (!zkeyFileName) {
      throw new CryptoError(`Circuit desconhecido: ${circuitName}`, 'zkp', {circuitName});
    }

    const dirExists = await RNFS.exists(this.zkeyBasePath);
    if (!dirExists) {
      await RNFS.mkdir(this.zkeyBasePath);
    }

    const zkeyPath = `${this.zkeyBasePath}/${zkeyFileName}`;
    const fileExists = await RNFS.exists(zkeyPath);
    if (!fileExists) {
      throw new CryptoError(`Arquivo zkey não encontrado: ${zkeyFileName}`, 'zkp', {zkeyPath});
    }

    this.zkeyCache.set(circuitName, zkeyPath);
    return zkeyPath;
  }

  /**
   * Ensures the zkeys directory exists and returns the path for a circuit's wasm
   */
  private async getWasmPath(circuitName: string): Promise<string> {
    const cached = this.wasmCache.get(circuitName);
    if (cached) {
      return cached;
    }

    const wasmFileName = CIRCUIT_WASMS[circuitName];
    if (!wasmFileName) {
      throw new CryptoError(`Circuit desconhecido: ${circuitName}`, 'zkp', {circuitName});
    }

    const dirExists = await RNFS.exists(this.zkeyBasePath);
    if (!dirExists) {
      await RNFS.mkdir(this.zkeyBasePath);
    }

    const wasmPath = `${this.zkeyBasePath}/${wasmFileName}`;
    const fileExists = await RNFS.exists(wasmPath);
    if (!fileExists) {
      throw new CryptoError(`Arquivo wasm não encontrado: ${wasmFileName}`, 'zkp', {wasmPath});
    }

    this.wasmCache.set(circuitName, wasmPath);
    return wasmPath;
  }

  /**
   * Internal generator with engine selection and fallback logic
   */
  private async generateProofWithEngine(
    circuitName: string,
    inputs: Record<string, string[]>
  ): Promise<CircomProofResult> {
    const zkeyPath = await this.getZkeyPath(circuitName);

    try {
      const proofResult = await generateCircomProof(
        zkeyPath,
        JSON.stringify(inputs),
        ProofLib.Arkworks,
      );
      this.logger.captureEvent('zkp_generation', 'titular', {parameters: {engine: 'mopro', success: true}}, true);
      return proofResult;
    } catch (error: any) {
      console.error("DEBUG MOPRO ERROR MESSAGE: String:", String(error));
      console.error("DEBUG MOPRO ERROR MESSAGE: JSON:", JSON.stringify(error));
      console.error("DEBUG MOPRO ERROR MESSAGE: Keys:", Object.keys(error));
      console.error("DEBUG MOPRO ERROR MESSAGE: Object:", error);
      this.logger.captureEvent('zkp_generation', 'titular', {parameters: {engine: 'mopro', success: false}}, false);
      throw error;
    }
  }

  async generateAgeRangeProof(birthdate: string, threshold: number): Promise<CircomProofResult> {
    const birthDate = new Date(birthdate);
    const now = new Date();
    const circuitInputs = {
      birthYear: [birthDate.getFullYear().toString()],
      birthMonth: [(birthDate.getMonth() + 1).toString()],
      birthDay: [birthDate.getDate().toString()],
      currentYear: [now.getFullYear().toString()],
      currentMonth: [(now.getMonth() + 1).toString()],
      currentDay: [now.getDate().toString()],
      threshold: [threshold.toString()],
    };
    return this.generateProofWithEngine('age_range', circuitInputs);
  }

  async generateStatusCheckProof(statusValue: string, expectedValue: string): Promise<CircomProofResult> {
    const statusNumeric = this.stringToNumericHash(statusValue);
    const expectedNumeric = this.stringToNumericHash(expectedValue);
    const circuitInputs = {
      status: [statusNumeric.toString()],
      expected: [expectedNumeric.toString()],
    };
    return this.generateProofWithEngine('status_check', circuitInputs);
  }

  async generateNullifierProof(holderSecret: string, electionId: string): Promise<CircomProofResult> {
    const secretNumeric = this.stringToNumericHash(holderSecret);
    const electionNumeric = this.stringToNumericHash(electionId);
    const circuitInputs = {
      secret: [secretNumeric.toString()],
      electionId: [electionNumeric.toString()],
    };
    return this.generateProofWithEngine('nullifier', circuitInputs);
  }

  async verifyProof(circuitName: string, proofResult: CircomProofResult): Promise<boolean> {
    try {
      const zkeyPath = await this.getZkeyPath(circuitName);
      return await verifyCircomProof(zkeyPath, proofResult, ProofLib.Arkworks);
    } catch (error) {
      throw new CryptoError('Falha ao verificar prova ZKP', 'zkp', {error});
    }
  }

  async isCircuitAvailable(circuitName: string): Promise<boolean> {
    try {
      const zkeyFileName = CIRCUIT_ZKEYS[circuitName];
      if (!zkeyFileName) return false;
      const zkeyPath = `${this.zkeyBasePath}/${zkeyFileName}`;
      return await RNFS.exists(zkeyPath);
    } catch {
      return false;
    }
  }

  async getCircuitStatus(): Promise<Array<{name: string; fileName: string; available: boolean}>> {
    const statuses = [];
    for (const [name, fileName] of Object.entries(CIRCUIT_ZKEYS)) {
      const available = await this.isCircuitAvailable(name);
      statuses.push({name, fileName, available});
    }
    return statuses;
  }

  private stringToNumericHash(input: string): string {
    const digest = sha256(utf8ToBytes(input));
    let n = 0n;
    for (let i = 0; i < 31; i++) {
      n = (n << 8n) | BigInt(digest[i]);
    }
    return n.toString();
  }

  extractNullifier(proofResult: CircomProofResult): string | undefined {
    if (proofResult.inputs && proofResult.inputs.length > 0) {
      return proofResult.inputs[0];
    }
    return undefined;
  }
}

export { ZKProofService };

const zkProofServiceInstance = new ZKProofService();
export default zkProofServiceInstance;
