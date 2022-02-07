import { task } from 'hardhat/config';
import { eContractid } from '../../helpers/types';
import { waitForTx } from '../../helpers/misc-utils';
import {
  ZERO_ADDRESS,
  STAKED_TOKEN_NAME,
  STAKED_TOKEN_SYMBOL,
  STAKED_TOKEN_DECIMALS,
} from '../../helpers/constants';
import {
  getStakedLayImpl,
  getStakedLayProxy,
} from '../../helpers/contracts-accessors';

const { StakedLay } = eContractid;

task(`initialize-${StakedLay}`, `Initialize the ${StakedLay} proxy contract`)
  .addParam('admin', `The address to be added as an Admin role in ${StakedLay} Transparent Proxy.`)
  .setAction(async ({ admin: layAdmin }, localBRE) => {
    await localBRE.run('set-dre');

    if (!layAdmin) {
      throw new Error(
        `Missing --admin parameter to add the Admin Role to ${StakedLay} Transparent Proxy`
      );
    }

    if (!localBRE.network.config.chainId) {
      throw new Error('INVALID_CHAIN_ID');
    }

    console.log(`\n- ${StakedLay} initialization`);

    const stakedLayImpl = await getStakedLayImpl();
    const stakedLayProxy = await getStakedLayProxy();

    console.log('\tInitializing StakedLay');

    const encodedInitializeStakedLay = stakedLayImpl.interface.encodeFunctionData('initialize', [
      ZERO_ADDRESS,
      STAKED_TOKEN_NAME,
      STAKED_TOKEN_SYMBOL,
      STAKED_TOKEN_DECIMALS,
    ]);

    await waitForTx(
      await stakedLayProxy.functions['initialize(address,address,bytes)'](
        stakedLayImpl.address,
        layAdmin,
        encodedInitializeStakedLay
      )
    );

    console.log('\tFinished Lay Token and Transparent Proxy initialization');
  });
