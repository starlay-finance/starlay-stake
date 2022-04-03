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

export const testDeployStakedRayV1 = async (
  token: MintableErc20,
  deployer: Signer,
  vaultOfRewards: Signer,
  restWallets: Signer[]
) => {
  const proxyAdmin = await restWallets[0].getAddress();
  const emissionManager = await deployer.getAddress();

  const stakedToken = token.address;
  const rewardsToken = token.address;

  const vaultOfRewardsAddress = await vaultOfRewards.getAddress();

  const incentivesControllerProxy = await deployInitializableAdminUpgradeabilityProxy();
  const stakedLayProxy = await deployInitializableAdminUpgradeabilityProxy();

  const incentivesControllerImplementation = await deployIncentivesController([
    token.address,
    vaultOfRewardsAddress,
    stakedLayProxy.address,
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

  const stakedLayEncodedInitialize = stakedLayImpl.interface.encodeFunctionData('initialize', [
    mockTransferHook.address,
    STAKED_TOKEN_NAME,
    STAKED_TOKEN_SYMBOL,
    STAKED_TOKEN_DECIMALS,
  ]);
  await stakedLayProxy['initialize(address,address,bytes)'](
    stakedLayImpl.address,
    proxyAdmin,
    stakedLayEncodedInitialize
  );
  await waitForTx(
    await token.connect(vaultOfRewards).approve(stakedLayProxy.address, MAX_UINT_AMOUNT)
  );
  await insertContractAddressInDb(eContractid.StakedLay, stakedLayProxy.address);

  const peiEncodedInitialize = incentivesControllerImplementation.interface.encodeFunctionData(
    'initialize'
  );
  await incentivesControllerProxy['initialize(address,address,bytes)'](
    incentivesControllerImplementation.address,
    proxyAdmin,
    peiEncodedInitialize
  );
  await waitForTx(
    await token.connect(vaultOfRewards).approve(incentivesControllerProxy.address, MAX_UINT_AMOUNT)
  );
  await insertContractAddressInDb(
    eContractid.IncentivesController,
    incentivesControllerProxy.address
  );

  return {
    incentivesControllerProxy,
    stakedLayProxy,
  };
};

export const testDeployStakedRayV2 = async (
  token: MintableErc20,
  deployer: Signer,
  vaultOfRewards: Signer,
  restWallets: Signer[]
) => {
  const stakedToken = token.address;
  const rewardsToken = token.address;
  const emissionManager = await deployer.getAddress();
  const vaultOfRewardsAddress = await vaultOfRewards.getAddress();

  const { stakedLayProxy } = await testDeployStakedRayV1(
    token,
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

  const stakedLayEncodedInitialize = stakedLayImpl.interface.encodeFunctionData('initialize');

  await stakedLayProxy
    .connect(restWallets[0])
    .upgradeToAndCall(stakedLayImpl.address, stakedLayEncodedInitialize);

  await insertContractAddressInDb(eContractid.StakedLayV2, stakedLayProxy.address);

  return {
    stakedLayProxy,
  };
};
