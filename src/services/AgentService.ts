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
import LogService from './LogService';

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
  private agent: CredoAgent | null = null;
  private initPromise: Promise<CredoAgent> | null = null;

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
      const config: InitConfig = {
        label: 'CarteiraIdentidadeAcademica',
        walletConfig: {
          id: 'academic-wallet',
          key: 'academic-wallet-key-0000000000000',
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
            anoncreds,
            registries: [],
          }),
        },
      }) as unknown as CredoAgent;

      await agent.initialize();

      this.agent = agent;

      LogService.captureEvent(
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

      LogService.captureEvent(
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

export default new AgentService();
