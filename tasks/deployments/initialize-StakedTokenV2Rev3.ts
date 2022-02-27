import { task } from 'hardhat/config';
import { eContractid } from '../../helpers/types';
import { waitForTx } from '../../helpers/misc-utils';
import { getStakedLayProxy, getStakedTokenV2Rev3 } from '../../helpers/contracts-accessors';

const { StakedTokenV2Rev3 } = eContractid;

task(
  `initialize-${StakedTokenV2Rev3}`,
  `Initialize the ${StakedTokenV2Rev3} proxy contract`
).setAction(async ({}, localBRE) => {
  await localBRE.run('set-dre');

  if (!localBRE.network.config.chainId) {
    throw new Error('INVALID_CHAIN_ID');
  }

  console.log(`\n- ${StakedTokenV2Rev3} initialization`);

  const stakedLayImpl = await getStakedTokenV2Rev3();
  const stakedLayProxy = await getStakedLayProxy();

  console.log('\tInitializing StakedLay');

  const encodedInitializeStakedLay = stakedLayImpl.interface.encodeFunctionData('initialize');

  await waitForTx(
    await stakedLayProxy.upgradeToAndCall(stakedLayImpl.address, encodedInitializeStakedLay)
  );

  console.log('\tFinished StakedTokenV2Rev3 and Transparent Proxy initialization');
});
