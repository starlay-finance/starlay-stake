import { tEthereumAddress } from '../../../helpers/types';
import { MintableErc20 } from '../../../types/MintableErc20';
import { StakedLay } from '../../../types/StakedLay';

export const logLayTokenBalanceOf = async (
  account: tEthereumAddress,
  token: MintableErc20
) => {
  console.log(
    `[token.balanceOf(${account})]: ${(await token.balanceOf(account)).toString()}`
  );
};

export const logStakedTokenBalanceOf = async (
  staker: tEthereumAddress,
  stakedLayV2: StakedLay
) => {
  console.log(
    `[stakedLayV2.balanceOf(${staker})]: ${(await stakedLayV2.balanceOf(staker)).toString()}`
  );
};

export const logGetStakeTotalRewardsBalance = async (
  staker: tEthereumAddress,
  stakedLayV2: StakedLay
) => {
  console.log(
    `[stakedLayV2.getTotalRewardsBalance(${staker})]: ${(
      await stakedLayV2.getTotalRewardsBalance(staker)
    ).toString()}`
  );
};

export const logRewardPerStakedAave = async (stakedLayV2: StakedLay) => {
  console.log(
    `[stakedLayV2.getRewardPerStakedAave()]: ${(
      await stakedLayV2.getRewardPerStakedAave()
    ).toString()}`
  );
};
