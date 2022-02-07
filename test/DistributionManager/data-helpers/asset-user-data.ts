import { BigNumber } from 'ethers';
import { DistributionManager } from '../../../types/DistributionManager';
import { StakedLay } from '../../../types/StakedLay';
import { IncentivesController } from '../../../types/IncentivesController';
import { StakedLayV2 } from '../../../types/StakedLayV2';

export type UserStakeInput = {
  underlyingAsset: string;
  stakedByUser: string;
  totalStaked: string;
};

export type UserPositionUpdate = UserStakeInput & {
  user: string;
};
export async function getUserIndex(
  distributionManager:
    | DistributionManager
    | IncentivesController
    | StakedLay
    | StakedLayV2,
  user: string,
  asset: string
): Promise<BigNumber> {
  return await distributionManager.getUserAssetData(user, asset);
}
