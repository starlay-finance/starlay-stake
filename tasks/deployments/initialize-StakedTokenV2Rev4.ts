import { task } from 'hardhat/config';
import { eContractid } from '../../helpers/types';
import { notFalsyOrZeroAddress, waitForTx } from '../../helpers/misc-utils';
import { getStakedLayProxy, getStakedTokenV2Rev3 } from '../../helpers/contracts-accessors';

const { StakedTokenV2Rev4 } = eContractid;

task(
  `initialize-${StakedTokenV2Rev4}`,
  `Initialize the ${StakedTokenV2Rev4} proxy contract`
).setAction(async ({}, localBRE) => {
  await localBRE.run('set-dre');

  if (!localBRE.network.config.chainId) {
    throw new Error('INVALID_CHAIN_ID');
  }

  console.log(`\n- ${StakedTokenV2Rev4} initialization`);

  const stakedLayImpl = await getStakedTokenV2Rev3();
  const stakedLayProxy = await getStakedLayProxy();

  if (!notFalsyOrZeroAddress(stakedLayImpl.address)) {
    throw new Error('missing stakedLayImpl');
  }
  if (!notFalsyOrZeroAddress(stakedLayProxy.address)) {
    throw new Error('missing stakedLayProxy');
  }

  console.log('\tInitializing StakedTokenV2Rev3');

  console.log(`\tStakedTokenV2Rev3 Implementation address: ${stakedLayImpl.address}`);

  const encodedInitializeStakedLay = stakedLayImpl.interface.encodeFunctionData('initialize');
  console.log('upgrade');
  await waitForTx(
    await stakedLayProxy.upgradeToAndCall(stakedLayImpl.address, encodedInitializeStakedLay)
  );

  console.log('\tFinished StakedTokenV2Rev3 and Transparent Proxy initialization');
});
