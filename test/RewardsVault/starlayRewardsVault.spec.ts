import { parseEther } from 'ethers/lib/utils';
import { makeSuite, TestEnv } from '../helpers/make-suite';

const { expect } = require('chai');

makeSuite('Starlay rewards vault', (testEnv: TestEnv) => {
  it('Deployer can set incentives controller', async () => {
    const { starlayRewardsVault, deployer: owner, users } = testEnv;
    const mockAddress = users[2].address;
    await starlayRewardsVault.connect(owner.signer).setIncentiveController(mockAddress);
    expect(await starlayRewardsVault.incentiveController()).equals(mockAddress);
  });
  it('ownership transfer enabled', async () => {
    const { starlayRewardsVault, deployer: owner, users } = testEnv;
    const newOwner = users[2];
    const mockAddress = users[3].address;
    await starlayRewardsVault.connect(owner.signer).transferOwnership(newOwner.address);
    expect(await starlayRewardsVault.owner()).equals(newOwner.address);
    await expect(starlayRewardsVault.connect(owner.signer).setIncentiveController(newOwner.address))
      .to.be.reverted;
    await starlayRewardsVault.connect(newOwner.signer).setIncentiveController(mockAddress);
    expect(await starlayRewardsVault.incentiveController()).equals(mockAddress);
  });
  it('token transfer to incentiveController enabled', async () => {
    const { starlayRewardsVault, users, layToken } = testEnv;
    const currentOwner = users[2];
    const incentiveControllerMock = users[3].address;
    const amountBefore = await layToken.balanceOf(incentiveControllerMock);
    const amountToAdd = parseEther('1000');
    const want = amountBefore.add(amountToAdd);
    await starlayRewardsVault
      .connect(currentOwner.signer)
      .setIncentiveController(incentiveControllerMock);
    await starlayRewardsVault.connect(currentOwner.signer).transfer(layToken.address, amountToAdd);
    expect((await layToken.balanceOf(incentiveControllerMock)).toHexString()).equals(
      want.toHexString()
    );
  });
});
