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

export const logStakedTokenBalanceOf = async (staker: tEthereumAddress, stakedToken: StakedLay) => {
  console.log(
    `[stakedToken.balanceOf(${staker})]: ${(await stakedToken.balanceOf(staker)).toString()}`
  );
};

export const logGetStakeTotalRewardsBalance = async (
  staker: tEthereumAddress,
  stakedLay: StakedLay
) => {
  console.log(
    `[stakedLay.getTotalRewardsBalance(${staker})]: ${(
      await stakedLay.getTotalRewardsBalance(staker)
    ).toString()}`
  );
};

export const logRewardPerStakedAave = async (stakedLay: StakedLay) => {
  console.log(
    `[stakedLay.getRewardPerStakedAave()]: ${(
      await stakedLay.getRewardPerStakedAave()
    ).toString()}`
  );
};
