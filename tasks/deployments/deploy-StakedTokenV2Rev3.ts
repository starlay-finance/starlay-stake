import { task } from 'hardhat/config';

import { eAstarNetwork, eContractid, eEthereumNetwork, tEthereumAddress } from '../../helpers/types';
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
  deployStakedLay,
  deployInitializableAdminUpgradeabilityProxy,
  deployStakedTokenV2Revision3,
} from '../../helpers/contracts-accessors';
import { checkVerification } from '../../helpers/etherscan-verification';
import { waitForTx } from '../../helpers/misc-utils';

const { StakedTokenV2Rev3, Proxy_StakedTokenV2Rev3 } = eContractid

task(`deploy-${StakedTokenV2Rev3}`, `Deploys the ${StakedTokenV2Rev3} contract`)
  .addFlag('verify', 'Verify StakedToken contract via Etherscan API.')
  .addOptionalParam(
    'vaultAddress',
    'Use IncentivesVault address by param instead of configuration.'
  )
  .addOptionalParam('tokenAddress', 'Use LayToken address by param instead of configuration.')
  .addOptionalParam('proxyAdmin', 'Admin address for proxy contracts')
  .setAction(async ({ verify, vaultAddress, tokenAddress, proxyAdmin }, localBRE) => {
    await localBRE.run('set-dre');

    // If Etherscan verification is enabled, check needed enviroments to prevent loss of gas in failed deployments.
    if (verify) {
      checkVerification();
    }

    if (!localBRE.network.config.chainId) {
      throw new Error('INVALID_CHAIN_ID');
    }

    const [signer] = await localBRE.ethers.getSigners();
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
        getAdminPerNetwork(network),
        getDistributionDurationPerNetwork(network),
        STAKED_TOKEN_NAME,
        STAKED_TOKEN_SYMBOL,
        `${STAKED_TOKEN_DECIMALS}`,
        ZERO_ADDRESS,
      ],
      false // disable verify due not supported by current buidler etherscan plugin
    );
    await stakedTokenImpl.deployTransaction.wait();
    await registerContractInJsonDb(StakedTokenV2Rev3, stakedTokenImpl);
    console.log(`  - Deployed implementation of ${StakedTokenV2Rev3}`);

    const stakedTokenProxy = await deployInitializableAdminUpgradeabilityProxy(verify);
    await registerContractInJsonDb(Proxy_StakedTokenV2Rev3, stakedTokenProxy);
    console.log(`  - Deployed implementation of ${Proxy_StakedTokenV2Rev3}`);

    console.log(`  - Finished ${StakedTokenV2Rev3} deployment`);

    // Initialization
    console.log(`[${StakedTokenV2Rev3}] Starting initialization:`);
    // @ts-ignore
    const encodedParams = stakedTokenImpl.interface.encodeFunctionData('initialize', [])
    await waitForTx(
      await stakedTokenProxy.functions['initialize(address,address,bytes)'](
        stakedTokenImpl.address,
        proxyAdmin || await signer.getAddress(),
        encodedParams
      )
    );
    console.log(`  - Initialized ${Proxy_StakedTokenV2Rev3}`);

    console.log(`  - Finished ${StakedTokenV2Rev3} deployment and initialization`);
    console.log(`    - Proxy: ${stakedTokenProxy.address}`);
    console.log(`    - Impl: ${stakedTokenImpl.address}`);

    return {
      proxy: stakedTokenProxy.address,
      implementation: stakedTokenImpl.address
    };
  });
