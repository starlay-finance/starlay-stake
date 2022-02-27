import { task } from 'hardhat/config';

import { eAstarNetwork, eContractid, eEthereumNetwork } from '../../helpers/types';
import { registerContractInJsonDb } from '../../helpers/contracts-helpers';
import {
  getTokenPerNetwork,
  getCooldownSecondsPerNetwork,
  getUnstakeWindowPerNetwork,
  getAdminPerNetwork,
  getDistributionDurationPerNetwork,
  getIncentivesVaultPerNetwork,
  ZERO_ADDRESS,
  STAKED_TOKEN_NAME,
  STAKED_TOKEN_SYMBOL,
  STAKED_TOKEN_DECIMALS,
} from '../../helpers/constants';
import { deployStakedTokenV2Revision3 } from '../../helpers/contracts-accessors';
import { checkVerification } from '../../helpers/etherscan-verification';
const { StakedTokenV2Rev3 } = eContractid;

task(`deploy-${StakedTokenV2Rev3}`, `Deploys the ${StakedTokenV2Rev3} contract`)
  .addFlag('verify', 'Verify StakedTokenV2Rev3 contract via Etherscan API.')
  .addOptionalParam(
    'vaultAddress',
    'Use IncentivesVault address by param instead of configuration.'
  )
  .addOptionalParam('tokenAddress', 'Use LayToken address by param instead of configuration.')
  .addOptionalParam(
    'emissionManager',
    'EmissionManager address. ref: PullRewardsIncentivesController'
  )
  .setAction(async ({ verify, vaultAddress, tokenAddress, emissionManager }, localBRE) => {
    await localBRE.run('set-dre');

    // If Etherscan verification is enabled, check needed enviroments to prevent loss of gas in failed deployments.
    if (verify) {
      checkVerification();
    }

    if (!localBRE.network.config.chainId) {
      throw new Error('INVALID_CHAIN_ID');
    }

    const network = localBRE.network.name as eEthereumNetwork | eAstarNetwork;
    console.log(`[${StakedTokenV2Rev3}] Starting deployment & initialization:`);
    console.log(`  - Network name: ${network}`);

    // Deployment
    console.log(`[${StakedTokenV2Rev3}] Starting deployment:`);
    const stakedTokenImpl = await deployStakedTokenV2Revision3(
      [
        tokenAddress || getTokenPerNetwork(network),
        tokenAddress || getTokenPerNetwork(network),
        getCooldownSecondsPerNetwork(network),
        getUnstakeWindowPerNetwork(network),
        vaultAddress || getIncentivesVaultPerNetwork(network),
        emissionManager || getAdminPerNetwork(network),
        getDistributionDurationPerNetwork(network),
        STAKED_TOKEN_NAME,
        STAKED_TOKEN_SYMBOL,
        `${STAKED_TOKEN_DECIMALS}`,
        ZERO_ADDRESS,
      ],
      verify // disable verify due not supported by current builder etherscan plugin
    );
    await stakedTokenImpl.deployTransaction.wait();
    await registerContractInJsonDb(StakedTokenV2Rev3, stakedTokenImpl);
    console.log(`  - Deployed implementation of ${StakedTokenV2Rev3}`);
    console.log(`  - Finished ${StakedTokenV2Rev3} deployment`);
    console.log(`    - Impl: ${stakedTokenImpl.address}`);
    return { implementation: stakedTokenImpl.address };
  });
