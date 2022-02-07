import { task } from 'hardhat/config';

import { eAstarNetwork, eContractid, eEthereumNetwork, tEthereumAddress } from '../../helpers/types';
import { registerContractInJsonDb } from '../../helpers/contracts-helpers';
import {
  getAaveTokenPerNetwork,
  getCooldownSecondsPerNetwork,
  getUnstakeWindowPerNetwork,
  getAaveAdminPerNetwork,
  getDistributionDurationPerNetwork,
  getAaveIncentivesVaultPerNetwork,
} from '../../helpers/constants';
import {
  deployStakedLay,
  deployInitializableAdminUpgradeabilityProxy,
} from '../../helpers/contracts-accessors';
import { checkVerification } from '../../helpers/etherscan-verification';

const { StakedLay, StakedLayImpl } = eContractid;

task(`deploy-${StakedLay}`, `Deploys the ${StakedLay} contract`)
  .addFlag('verify', 'Verify StakedToken contract via Etherscan API.')
  .addOptionalParam(
    'vaultAddress',
    'Use IncentivesVault address by param instead of configuration.'
  )
  .addOptionalParam('tokenAddress', 'Use LayToken address by param instead of configuration.')
  .setAction(async ({ verify, vaultAddress, tokenAddress }, localBRE) => {
    await localBRE.run('set-dre');

    // If Etherscan verification is enabled, check needed enviroments to prevent loss of gas in failed deployments.
    if (verify) {
      checkVerification();
    }

    if (!localBRE.network.config.chainId) {
      throw new Error('INVALID_CHAIN_ID');
    }

    const network = localBRE.network.name as eEthereumNetwork | eAstarNetwork;

    console.log(`\n- ${StakedLay} deployment`);

    console.log(`\tDeploying ${StakedLay} implementation ...`);
    const stakedLayImpl = await deployStakedLay(
      [
        tokenAddress || getAaveTokenPerNetwork(network),
        tokenAddress || getAaveTokenPerNetwork(network),
        getCooldownSecondsPerNetwork(network),
        getUnstakeWindowPerNetwork(network),
        vaultAddress || getAaveIncentivesVaultPerNetwork(network),
        getAaveAdminPerNetwork(network),
        getDistributionDurationPerNetwork(network),
      ],
      false // disable verify due not supported by current buidler etherscan plugin
    );
    await stakedLayImpl.deployTransaction.wait();
    await registerContractInJsonDb(StakedLayImpl, stakedLayImpl);

    console.log(`\tDeploying ${StakedLay} Transparent Proxy ...`);
    const stakedTokenProxy = await deployInitializableAdminUpgradeabilityProxy(verify);
    await registerContractInJsonDb(StakedLay, stakedTokenProxy);

    console.log(`\tFinished ${StakedLay} proxy and implementation deployment`);
  });
