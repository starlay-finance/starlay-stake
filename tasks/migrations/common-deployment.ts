import { task } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { eContractid, eEthereumNetwork } from '../../helpers/types';
import { checkVerification } from '../../helpers/etherscan-verification';
import { getAdminPerNetwork } from '../../helpers/constants';

task('common-deployment', 'Deployment in for Main, Kovan networks')
  .addFlag('verify', 'Verify StakedToken and InitializableAdminUpgradeabilityProxy contract.')
  .addOptionalParam(
    'vaultAddress',
    'Use IncentivesVault address by param instead of configuration.'
  )
  .addOptionalParam('tokenAddress', 'Use LayToken address by param instead of configuration.')
  .setAction(async ({ verify, vaultAddress, tokenAddress }, localBRE) => {
    const DRE: HardhatRuntimeEnvironment = await localBRE.run('set-dre');
    const network = DRE.network.name as eEthereumNetwork;
    const admin = getAdminPerNetwork(network);

    if (!admin) {
      throw Error(
        'The --admin parameter must be set. Set an Ethereum address as --admin parameter input.'
      );
    }

    // If Etherscan verification is enabled, check needed enviroments to prevent loss of gas in failed deployments.
    if (verify) {
      checkVerification();
    }

    await DRE.run(`deploy-${eContractid.StakedLay}`, { verify, vaultAddress, tokenAddress });

    await DRE.run(`initialize-${eContractid.StakedLay}`, {
      admin: admin,
    });

    await DRE.run(`deploy-${eContractid.StakedTokenV2Rev3}`);

    await DRE.run(`initialize-${eContractid.StakedTokenV2Rev3}`, {
      admin: admin,
    });
    await DRE.run(`initialize-${eContractid.StakedTokenV2Rev4}`, {
      admin: admin,
    });
    console.log(`\n✔️ Finished the deployment of the Lay Token ${network} Enviroment. ✔️`);
  });
