import { timeLatest } from '../../helpers/misc-utils';

const { expect } = require('chai');

import { makeSuite } from '../helpers/make-suite';
import { deployIncentivesController } from '../../helpers/contracts-accessors';
import { RANDOM_ADDRESSES, ZERO_ADDRESS } from '../../helpers/constants';

makeSuite('IncentivesController constructor tests', () => {
  it('should assign correct params', async () => {
    const peiEmissionManager = RANDOM_ADDRESSES[1];
    const rewardToken = RANDOM_ADDRESSES[3];
    const rewardsVault = RANDOM_ADDRESSES[4];
    const psm = RANDOM_ADDRESSES[5];
    const extraPsmReward = '100';
    const distributionDuration = '100';

    const incentivesController = await deployIncentivesController([
      rewardToken,
      rewardsVault,
      psm,
      extraPsmReward,
      peiEmissionManager,
      distributionDuration,
    ]);
    await expect(await incentivesController.REWARD_TOKEN()).to.be.equal(rewardToken);
    await expect(await incentivesController.REWARDS_VAULT()).to.be.equal(rewardsVault);
    await expect(await incentivesController.PSM()).to.be.equal(psm);
    await expect((await incentivesController.EXTRA_PSM_REWARD()).toString()).to.be.equal(
      extraPsmReward
    );
    await expect((await incentivesController.EMISSION_MANAGER()).toString()).to.be.equal(
      peiEmissionManager
    );
    await expect((await incentivesController.DISTRIBUTION_END()).toString()).to.be.equal(
      (await timeLatest()).plus(distributionDuration).toString()
    );
  });
  it('constructor reverts if initializes with zero_address', async () => {
    const peiEmissionManager = RANDOM_ADDRESSES[2];
    const rewardToken = RANDOM_ADDRESSES[3];
    const rewardsVault = RANDOM_ADDRESSES[4];
    const psm = RANDOM_ADDRESSES[5];
    const extraPsmReward = '100';
    const distributionDuration = '100';
    await expect(
      deployIncentivesController([
        ZERO_ADDRESS,
        rewardsVault,
        psm,
        extraPsmReward,
        peiEmissionManager,
        distributionDuration,
      ])
    ).to.be.revertedWith('Cannot set the rewardToken to the zero address');
    await expect(
      deployIncentivesController([
        rewardToken,
        ZERO_ADDRESS,
        psm,
        extraPsmReward,
        peiEmissionManager,
        distributionDuration,
      ])
    ).to.be.revertedWith('Cannot set the rewardsVault to the zero address');
    await expect(
      deployIncentivesController([
        rewardToken,
        rewardsVault,
        ZERO_ADDRESS,
        extraPsmReward,
        peiEmissionManager,
        distributionDuration,
      ])
    ).to.be.revertedWith('Cannot set the psm to the zero address');
    await expect(
      deployIncentivesController([
        rewardToken,
        rewardsVault,
        psm,
        extraPsmReward,
        ZERO_ADDRESS,
        distributionDuration,
      ])
    ).to.be.revertedWith('Cannot set the emissionManager to the zero address');
  });
});
