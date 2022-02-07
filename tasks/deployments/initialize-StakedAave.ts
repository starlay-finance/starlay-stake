import { task } from 'hardhat/config';
import { eContractid } from '../../helpers/types';
import { waitForTx } from '../../helpers/misc-utils';
import {
  ZERO_ADDRESS,
  STAKED_AAVE_NAME,
  STAKED_AAVE_SYMBOL,
  STAKED_AAVE_DECIMALS,
} from '../../helpers/constants';
import {
  getStakedAave,
  getStakedAaveImpl,
  getStakedAaveProxy,
} from '../../helpers/contracts-accessors';

const { StakedLay } = eContractid;

task(`initialize-StakedLay`, `Initialize the ${StakedLay} proxy contract`)
  .addParam('admin', `The address to be added as an Admin role in ${StakedLay} Transparent Proxy.`)
  .setAction(async ({ admin: aaveAdmin }, localBRE) => {
    await localBRE.run('set-dre');

    if (!aaveAdmin) {
      throw new Error(
        `Missing --admin parameter to add the Admin Role to ${StakedLay} Transparent Proxy`
      );
    }

    if (!localBRE.network.config.chainId) {
      throw new Error('INVALID_CHAIN_ID');
    }

    console.log(`\n- ${StakedLay} initialization`);

    const stakedAaveImpl = await getStakedAaveImpl();
    const stakedAaveProxy = await getStakedAaveProxy();

    console.log('\tInitializing StakedAave');

    const encodedInitializeStakedAave = stakedAaveImpl.interface.encodeFunctionData('initialize', [
      ZERO_ADDRESS,
      STAKED_AAVE_NAME,
      STAKED_AAVE_SYMBOL,
      STAKED_AAVE_DECIMALS,
    ]);

    await waitForTx(
      await stakedAaveProxy.functions['initialize(address,address,bytes)'](
        stakedAaveImpl.address,
        aaveAdmin,
        encodedInitializeStakedAave
      )
    );

    console.log('\tFinished Starley Token and Transparent Proxy initialization');
  });
