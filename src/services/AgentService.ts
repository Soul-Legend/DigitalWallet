import {
  Agent,
  ConsoleLogger,
  LogLevel,
  KeyDerivationMethod,
  InitConfig,
} from '@credo-ts/core';
import {agentDependencies} from '@credo-ts/react-native';
import {AskarModule} from '@credo-ts/askar';
import {ariesAskar} from '@hyperledger/aries-askar-react-native';
import {AnonCredsModule} from '@credo-ts/anoncreds';
import {anoncreds} from '@hyperledger/anoncreds-react-native';
import EncryptedStorage from 'react-native-encrypted-storage';
import LogServiceInstance from './LogService';
import type {ILogService} from '../types';

/**
 * AgentService - Manages the Credo agent lifecycle
 *
 * This service is responsible for:
 * - Configuring and initializing the Credo agent with Askar and AnonCreds modules
 * - Providing singleton access to the agent instance
 * - Managing agent shutdown
 *
 * The agent uses Aries Askar for encrypted wallet/storage and AnonCreds for
 * zero-knowledge credential operations. No DIDComm transport is registered
 * because this app uses a clipboard-based credential exchange flow.
 */

type CredoAgent = Agent<{
  askar: AskarModule;
  anoncreds: AnonCredsModule;
}>;

class AgentService {
  private static readonly WALLET_KEY_STORAGE = 'credo_wallet_master_key';
  private agent: CredoAgent | null = null;
  private initPromise: Promise<CredoAgent> | null = null;
  private readonly logger: ILogService;

  constructor(logger: ILogService = LogServiceInstance) {
    this.logger = logger;
  }

  /**
   * Retrieves or generates the Credo wallet master key.
   * On first launch, a 32-byte random key is generated and stored in
   * EncryptedStorage so subsequent launches reuse the same key.
   */
  private async getOrCreateWalletKey(): Promise<string> {
    const existing = await EncryptedStorage.getItem(AgentService.WALLET_KEY_STORAGE);
    if (existing) {
      return existing;
    }
    const ed = await import('@noble/ed25519');
    const bytes = ed.etc.randomBytes(32);
    const key = Array.from(bytes as Uint8Array, (b: number) => b.toString(16).padStart(2, '0')).join('');
    await EncryptedStorage.setItem(AgentService.WALLET_KEY_STORAGE, key);
    return key;
  }

  /**
   * Returns the initialized Credo agent.
   * Initializes on first call; subsequent calls return the same instance.
   */
  async getAgent(): Promise<CredoAgent> {
    if (this.agent) {
      return this.agent;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.initialize();
    return this.initPromise;
  }

  private async initialize(): Promise<CredoAgent> {
    try {
      const walletKey = await this.getOrCreateWalletKey();
      const config: InitConfig = {
        label: 'CarteiraIdentidadeAcademica',
        walletConfig: {
          id: 'academic-wallet',
          key: walletKey,
          keyDerivationMethod: KeyDerivationMethod.Argon2IMod,
        },
        logger: new ConsoleLogger(LogLevel.warn),
        autoUpdateStorageOnStartup: true,
      };

      const agent = new Agent({
        config,
        dependencies: agentDependencies,
        modules: {
          askar: new AskarModule({ariesAskar}),
          anoncreds: new AnonCredsModule({
            anoncreds: anoncreds as any,
            registries: [] as any,
          }),
        },
      }) as unknown as CredoAgent;

      await agent.initialize();

      this.agent = agent;

      this.logger.captureEvent(
        'key_generation',
        'titular',
        {
          parameters: {
            action: 'agent_initialized',
            label: config.label,
          },
        },
        true,
      );

      return agent;
    } catch (error) {
      this.initPromise = null;

      this.logger.captureEvent(
        'error',
        'titular',
        {
          parameters: {
            action: 'agent_initialization_failed',
          },
        },
        false,
        error instanceof Error ? error : new Error(String(error)),
      );

      throw error;
    }
  }

  /**
   * Shuts down the Credo agent and releases resources.
   */
  async shutdown(): Promise<void> {
    if (this.agent) {
      await this.agent.shutdown();
      this.agent = null;
      this.initPromise = null;
    }
  }

  /**
   * Returns whether the agent is currently initialized.
   */
  isInitialized(): boolean {
    return this.agent !== null;
  }
}

export { AgentService };

const agentServiceInstance = new AgentService();
export default agentServiceInstance;
