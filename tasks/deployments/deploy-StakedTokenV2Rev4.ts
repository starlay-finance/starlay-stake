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
import {
  deployStakedTokenV2Revision3,
  deployStakedTokenV2Revision4,
} from '../../helpers/contracts-accessors';
import { checkVerification } from '../../helpers/etherscan-verification';
import { notFalsyOrZeroAddress } from '../../helpers/misc-utils';
const { StakedTokenV2Rev4 } = eContractid;

task(`deploy-${StakedTokenV2Rev4}`, `Deploys the ${StakedTokenV2Rev4} contract`)
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
    console.log(`[${StakedTokenV2Rev4}] Starting deployment & initialization:`);
    console.log(`  - Network name: ${network}`);

    // Deployment
    console.log(`[${StakedTokenV2Rev4}] Starting deployment:`);
    const token = tokenAddress || getTokenPerNetwork(network);
    const vault = vaultAddress || getIncentivesVaultPerNetwork(network);
    const em = emissionManager || getAdminPerNetwork(network);
    if (!notFalsyOrZeroAddress(token)) {
      throw new Error('mising token address');
    }
    if (!notFalsyOrZeroAddress(vault)) {
      throw new Error('mising vault address');
    }
    if (!notFalsyOrZeroAddress(emissionManager)) {
      throw new Error('mising emission manager');
    }
    const stakedTokenImpl = await deployStakedTokenV2Revision4(
      [
        token,
        token,
        getCooldownSecondsPerNetwork(network),
        getUnstakeWindowPerNetwork(network),
        vault,
        em,
        getDistributionDurationPerNetwork(network),
        STAKED_TOKEN_NAME,
        STAKED_TOKEN_SYMBOL,
        `${STAKED_TOKEN_DECIMALS}`,
        ZERO_ADDRESS,
      ],
      verify // disable verify due not supported by current builder etherscan plugin
    );
    await stakedTokenImpl.deployTransaction.wait();
    await registerContractInJsonDb(StakedTokenV2Rev4, stakedTokenImpl);
    console.log(`  - Deployed implementation of ${StakedTokenV2Rev4}`);
    console.log(`  - Finished ${StakedTokenV2Rev4} deployment`);
    console.log(`    - Impl: ${stakedTokenImpl.address}`);
    return { implementation: stakedTokenImpl.address };
  });
