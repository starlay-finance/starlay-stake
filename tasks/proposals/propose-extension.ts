import { task } from 'hardhat/config';
import {
  IStarlayGovernanceV2__factory,
  StakedTokenBptRev2__factory,
  StakedTokenV2Rev3,
  StakedTokenV2Rev3__factory,
} from '../../types';
import { Signer } from 'ethers';
import { getDefenderRelaySigner } from '../../helpers/defender-utils';
import { DRE } from '../../helpers/misc-utils';
import { logError } from '../../helpers/tenderly-utils';

task('propose-extension', 'Create some proposals and votes')
  .addParam('stakedTokenProxy')
  .addParam('stakedTokenImpl')
  .addParam('stkBptProxy')
  .addParam('stkBptImpl')
  .addParam('governance')
  .addParam('longExecutor')
  .addParam('ipfsHash')
  .addFlag('defender')
  .setAction(
    async (
      {
        governance,
        longExecutor,
        defender,
        stakedTokenProxy,
        stakedTokenImpl,
        stkBptProxy,
        stkBptImpl,
        ipfsHash
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

      if (!stakedTokenImpl) {
        throw '[hh-task][propose-extension] stakedTokenImpl param is missing';
      }
      if (!stkBptImpl) {
        throw '[hh-task][propose-extension] stkBptImpl param is missing';
      }
      if (!longExecutor) {
        throw '[hh-task][propose-extension] longExecutor param is missing';
      }
      if (!stakedTokenProxy) {
        throw '[hh-task][propose-extension] stakedTokenProxy param is missing';
      }
      if (!stkBptProxy) {
        throw '[hh-task][propose-extension] stkBptProxy param is missing';
      }
      if (!ipfsHash) {
        throw '[hh-task][propose-extension] ipfsHash param is missing';
      }

      // Calldata for StakedLay implementation
      const payloadStkToken = StakedTokenV2Rev3__factory.connect(
        stakedTokenImpl,
        proposer
      ).interface.encodeFunctionData('initialize');
      const callDataStkToken = DRE.ethers.utils.defaultAbiCoder.encode(
        ['address', 'bytes'],
        [stakedTokenImpl, payloadStkToken]
      );

      // Calldata for StkBpt implementation
      // Empty arguments for initializer due they are not used
      const payloadStkBpt = StakedTokenBptRev2__factory.connect(
        stkBptImpl,
        proposer
      ).interface.encodeFunctionData('initialize', ['', '', '18']);
      const callDataStkBpt = DRE.ethers.utils.defaultAbiCoder.encode(
        ['address', 'bytes'],
        [stkBptImpl, payloadStkBpt]
      );
      const executeSignature = 'upgradeToAndCall(address,bytes)';
      const gov = await IStarlayGovernanceV2__factory.connect(governance, proposer);

      try {
        const tx = await gov.create(
          longExecutor,
          [stakedTokenProxy, stkBptProxy],
          ['0', '0'],
          [executeSignature, executeSignature],
          [callDataStkToken, callDataStkBpt],
          [false, false],
          ipfsHash,
          { gasLimit: 1000000 }
        );
        console.log('- Proposal submitted to Governance');
        await tx.wait();
      } catch (error) {
        logError();
        throw error;
      }

      console.log('Your Proposal has been submitted');
    }
  );
