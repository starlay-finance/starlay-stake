import { Signer } from 'ethers';
import {
  PSM_STAKER_PREMIUM,
  COOLDOWN_SECONDS,
  UNSTAKE_WINDOW,
  STAKED_TOKEN_NAME,
  STAKED_TOKEN_SYMBOL,
  STAKED_TOKEN_DECIMALS,
  MAX_UINT_AMOUNT,
} from '../../helpers/constants';
import {
  deployInitializableAdminUpgradeabilityProxy,
  deployIncentivesController,
  deployStakedLay,
  deployMockTransferHook,
  deployStakedLayV2,
} from '../../helpers/contracts-accessors';
import { insertContractAddressInDb } from '../../helpers/contracts-helpers';
import { waitForTx } from '../../helpers/misc-utils';
import { eContractid } from '../../helpers/types';
import { MintableErc20 } from '../../types/MintableErc20';

export const testDeployStakedAaveV1 = async (
  aaveToken: MintableErc20,
  deployer: Signer,
  vaultOfRewards: Signer,
  restWallets: Signer[]
) => {
  const proxyAdmin = await restWallets[0].getAddress();
  const emissionManager = await deployer.getAddress();

  const stakedToken = aaveToken.address;
  const rewardsToken = aaveToken.address;

  const vaultOfRewardsAddress = await vaultOfRewards.getAddress();

  const aaveIncentivesControllerProxy = await deployInitializableAdminUpgradeabilityProxy();
  const stakedAaveProxy = await deployInitializableAdminUpgradeabilityProxy();

  const aaveIncentivesControllerImplementation = await deployIncentivesController([
    aaveToken.address,
    vaultOfRewardsAddress,
    stakedAaveProxy.address,
    PSM_STAKER_PREMIUM,
    emissionManager,
    (1000 * 60 * 60).toString(),
  ]);

  const stakedLayImpl = await deployStakedLay([
    stakedToken,
    rewardsToken,
    COOLDOWN_SECONDS,
    UNSTAKE_WINDOW,
    vaultOfRewardsAddress,
    emissionManager,
    (1000 * 60 * 60).toString(),
  ]);

  const mockTransferHook = await deployMockTransferHook();

  const stakedAaveEncodedInitialize = stakedLayImpl.interface.encodeFunctionData('initialize', [
    mockTransferHook.address,
    STAKED_TOKEN_NAME,
    STAKED_TOKEN_SYMBOL,
    STAKED_TOKEN_DECIMALS,
  ]);
  await stakedAaveProxy['initialize(address,address,bytes)'](
    stakedLayImpl.address,
    proxyAdmin,
    stakedAaveEncodedInitialize
  );
  await waitForTx(
    await aaveToken.connect(vaultOfRewards).approve(stakedAaveProxy.address, MAX_UINT_AMOUNT)
  );
  await insertContractAddressInDb(eContractid.StakedLay, stakedAaveProxy.address);

  const peiEncodedInitialize = aaveIncentivesControllerImplementation.interface.encodeFunctionData(
    'initialize'
  );
  await aaveIncentivesControllerProxy['initialize(address,address,bytes)'](
    aaveIncentivesControllerImplementation.address,
    proxyAdmin,
    peiEncodedInitialize
  );
  await waitForTx(
    await aaveToken
      .connect(vaultOfRewards)
      .approve(aaveIncentivesControllerProxy.address, MAX_UINT_AMOUNT)
  );
  await insertContractAddressInDb(
    eContractid.IncentivesController,
    aaveIncentivesControllerProxy.address
  );

  return {
    aaveIncentivesControllerProxy,
    stakedAaveProxy,
  };
};

export const testDeployStakedRayV2 = async (
  aaveToken: MintableErc20,
  deployer: Signer,
  vaultOfRewards: Signer,
  restWallets: Signer[]
) => {
  const stakedToken = aaveToken.address;
  const rewardsToken = aaveToken.address;
  const emissionManager = await deployer.getAddress();
  const vaultOfRewardsAddress = await vaultOfRewards.getAddress();

  const { stakedAaveProxy } = await testDeployStakedAaveV1(
    aaveToken,
    deployer,
    vaultOfRewards,
    restWallets
  );

  const stakedLayImpl = await deployStakedLayV2([
    stakedToken,
    rewardsToken,
    COOLDOWN_SECONDS,
    UNSTAKE_WINDOW,
    vaultOfRewardsAddress,
    emissionManager,
    (1000 * 60 * 60).toString(),
  ]);

  const stakedAaveEncodedInitialize = stakedLayImpl.interface.encodeFunctionData('initialize');

  await stakedAaveProxy
    .connect(restWallets[0])
    .upgradeToAndCall(stakedLayImpl.address, stakedAaveEncodedInitialize);

  await insertContractAddressInDb(eContractid.StakedLayV2, stakedAaveProxy.address);

  return {
    stakedAaveProxy,
  };
};
