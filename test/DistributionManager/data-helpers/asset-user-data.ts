import { BigNumber } from 'ethers';
import { DistributionManager } from '../../../types/DistributionManager';
import { StakedAave } from '../../../types/StakedAave';
import { IncentivesController } from '../../../types/IncentivesController';
import { StakedAaveV2 } from '../../../types/StakedAaveV2';

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
    | StakedAave
    | StakedAaveV2,
  user: string,
  asset: string
): Promise<BigNumber> {
  return await distributionManager.getUserAssetData(user, asset);
}
