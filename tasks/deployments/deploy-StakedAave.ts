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
  deployStakedAave,
  deployInitializableAdminUpgradeabilityProxy,
} from '../../helpers/contracts-accessors';
import { checkVerification } from '../../helpers/etherscan-verification';

const { StakedLay, StakedAaveImpl } = eContractid;

task(`deploy-StakedLay`, `Deploys the ${StakedLay} contract`)
  .addFlag('verify', 'Verify StakedAave contract via Etherscan API.')
  .addOptionalParam(
    'vaultAddress',
    'Use AaveIncentivesVault address by param instead of configuration.'
  )
  .addOptionalParam('aaveAddress', 'Use AaveToken address by param instead of configuration.')
  .setAction(async ({ verify, vaultAddress, aaveAddress }, localBRE) => {
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
    const stakedAaveImpl = await deployStakedAave(
      [
        aaveAddress || getAaveTokenPerNetwork(network),
        aaveAddress || getAaveTokenPerNetwork(network),
        getCooldownSecondsPerNetwork(network),
        getUnstakeWindowPerNetwork(network),
        vaultAddress || getAaveIncentivesVaultPerNetwork(network),
        getAaveAdminPerNetwork(network),
        getDistributionDurationPerNetwork(network),
      ],
      false // disable verify due not supported by current buidler etherscan plugin
    );
    await stakedAaveImpl.deployTransaction.wait();
    await registerContractInJsonDb(StakedAaveImpl, stakedAaveImpl);

    console.log(`\tDeploying ${StakedLay} Transparent Proxy ...`);
    const stakedAaveProxy = await deployInitializableAdminUpgradeabilityProxy(verify);
    await registerContractInJsonDb(StakedLay, stakedAaveProxy);

    console.log(`\tFinished ${StakedLay} proxy and implementation deployment`);
  });
