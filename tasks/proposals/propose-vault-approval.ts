import { task } from 'hardhat/config';
import { IStarlayGovernanceV2__factory } from '../../types';
import { Signer } from 'ethers';
import { getDefenderRelaySigner } from '../../helpers/defender-utils';
import { DRE } from '../../helpers/misc-utils';
import { logError } from '../../helpers/tenderly-utils';
import { MAX_UINT_AMOUNT } from '../../helpers/constants';

task('propose-vault-approval', 'Create some proposals and votes')
  .addParam('rewardsVaultController')
  .addParam('layProxy')
  .addParam('stakedLayProxy')
  .addParam('stkBptProxy')
  .addParam('governance')
  .addParam('shortExecutor')
  .addParam('ipfsHash')
  .addFlag('defender')
  .setAction(
    async (
      {
        rewardsVaultController,
        governance,
        shortExecutor,
        defender,
        stakedLayProxy,
        stkBptProxy,
        layProxy,
        ipfsHash,
      },
      localBRE: any
    ) => {
      await localBRE.run('set-dre');

      let proposer: Signer;
      [proposer] = await DRE.ethers.getSigners();

      if (defender) {
        const { signer } = await getDefenderRelaySigner();
        proposer = signer;
      }

      // Calldata for StakedLay approval
      const payloadForStakedLayApproval = DRE.ethers.utils.defaultAbiCoder.encode(
        ['address', 'address', 'uint256'],
        [layProxy, stakedLayProxy, MAX_UINT_AMOUNT]
      );
      // Calldata for StkBpt approval
      const payloadForStkBPTApproval = DRE.ethers.utils.defaultAbiCoder.encode(
        ['address', 'address', 'uint256'],
        [layProxy, stkBptProxy, MAX_UINT_AMOUNT]
      );

      const executeSignature = 'approve(address,address,uint256)';
      const gov = await IStarlayGovernanceV2__factory.connect(governance, proposer);

      try {
        const tx = await gov.create(
          shortExecutor,
          [rewardsVaultController, rewardsVaultController],
          ['0', '0'],
          [executeSignature, executeSignature],
          [payloadForStakedLayApproval, payloadForStkBPTApproval],
          [false, false],
          ipfsHash,
          { gasLimit: 1000000 }
        );
        await tx.wait();
        console.log('- Proposal submitted to Governance');
      } catch (error) {
        logError();
        throw error;
      }
    }
  );
