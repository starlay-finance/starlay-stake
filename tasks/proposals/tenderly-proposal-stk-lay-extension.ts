import { task } from 'hardhat/config';
import {
  Erc20__factory,
  IStarlayGovernanceV2,
  IDelegationAwareToken__factory,
  SelfdestructTransfer__factory,
  StakedLayV2__factory,
} from '../../types';
import { advanceBlockTo, DRE, increaseTimeTenderly, latestBlock } from '../../helpers/misc-utils';
import { logError } from '../../helpers/tenderly-utils';
import { parseEther, formatEther } from 'ethers/lib/utils';
import { getDefenderRelaySigner } from '../../helpers/defender-utils';
import { Signer } from '@ethersproject/abstract-signer';

task('proposal-stk-lay-extension:tenderly', 'Create proposal at Tenderly')
  .addFlag('defender')
  .setAction(async ({ defender }, localBRE: any) => {
    await localBRE.run('set-dre');

    let proposer: Signer;

    [proposer] = await DRE.ethers.getSigners();

    if (defender) {
      const { signer } = await getDefenderRelaySigner();
      proposer = signer;
    }

    const {
      RAY_TOKEN = '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9',
      GOVERNANCE_V2 = '0xEC568fffba86c094cf06b22134B23074DFE2252c', // mainnet
      LONG_EXECUTOR = '0x61910ecd7e8e942136ce7fe7943f956cea1cc2f7', // mainnet
    } = process.env;

    if (!RAY_TOKEN || !GOVERNANCE_V2 || !LONG_EXECUTOR) {
      throw new Error('You have not set correctly the .env file, make sure to read the README.md');
    }

    const VOTING_DURATION = 64000;

    const WHALE = '0x25f2226b597e8f9514b3f68f00f494cf4f286491';
    const WHALE_2 = '0xbe0eb53f46cd790cd13851d5eff43d12404d33e8';

    const LAY_STAKE = '0x4da27a545c0c5B758a6BA100e3a049001de870f5';
    const STK_BPT_STAKE = '0xa1116930326D21fB917d5A27F1E9943A9595fb47';

    const ethers = DRE.ethers;

    // Send ether to the LAY_WHALE, which is a non payable contract via selfdestruct
    const selfDestructContract = await new SelfdestructTransfer__factory(proposer).deploy();
    await selfDestructContract.deployTransaction.wait();
    await (
      await selfDestructContract.destroyAndTransfer(WHALE, {
        value: ethers.utils.parseEther('0.1'),
      })
    ).wait();

    // Impersonating holders
    const whale2 = ethers.provider.getSigner(WHALE_2);
    const whale = ethers.provider.getSigner(WHALE);

    // Initialize contracts and tokens
    const gov = (await ethers.getContractAt(
      'IStarlayGovernanceV2',
      GOVERNANCE_V2,
      proposer
    )) as IStarlayGovernanceV2;

    const layToken = Erc20__factory.connect(RAY_TOKEN, whale);
    const stakedLayV2 = StakedLayV2__factory.connect(LAY_STAKE, proposer);
    const bptStakeV2 = StakedLayV2__factory.connect(STK_BPT_STAKE, proposer);

    // Transfer enough LAY to proposer
    await (await layToken.transfer(await proposer.getAddress(), parseEther('2000000'))).wait();
    // Transfer enough LAY to proposer
    await (
      await layToken.connect(whale2).transfer(await proposer.getAddress(), parseEther('1200000'))
    ).wait();

    await advanceBlockTo((await latestBlock()) + 10);
    const govToken = IDelegationAwareToken__factory.connect(RAY_TOKEN, proposer);

    try {
      const balance = await layToken.balanceOf(await proposer.getAddress());
      console.log('LAY Balance proposer', formatEther(balance));
      const propositionPower = await govToken.getPowerAtBlock(
        await proposer.getAddress(),
        ((await latestBlock()) - 1).toString(),
        '1'
      );

      console.log(
        `Proposition power of ${await proposer.getAddress()} at block - 1`,
        formatEther(propositionPower)
      );
    } catch (error) {
      console.log(error);
    }
    // Submit proposal
    const proposalId = await gov.getProposalsCount();

    await DRE.run('proposal-stk-extensions', {
      defender: !!defender,
    });

    // Mine block due flash loan voting protection
    await advanceBlockTo((await latestBlock()) + 1);

    const votingPower = await govToken.getPowerAtBlock(
      await proposer.getAddress(),
      ((await latestBlock()) - 1).toString(),
      '0'
    );
    console.log(
      `Voting power of ${await proposer.getAddress()} at block - 1`,
      formatEther(votingPower)
    );

    // Submit vote and advance block to Queue phase
    await (await gov.submitVote(proposalId, true)).wait();
    await advanceBlockTo((await latestBlock()) + VOTING_DURATION + 1);

    // Queue and advance block to Execution phase
    try {
      await (await gov.queue(proposalId)).wait();
    } catch (error) {
      logError();
      throw error;
    }
    await increaseTimeTenderly(604800 + 10);

    // Execute
    try {
      await (await gov.execute(proposalId)).wait();
    } catch (error) {
      logError();
      throw error;
    }

    console.log('- Proposal executed:');
    console.log('- Lay Stake v2 Distribution End');
    console.log('  - Distribution End', await (await stakedLayV2.DISTRIBUTION_END()).toString());
    console.log('  - Revision', await (await stakedLayV2.REVISION()).toString());
    console.log('  - Name', await stakedLayV2.name());
    console.log('  - Symbol', await stakedLayV2.symbol());
    console.log('  - Decimals', await stakedLayV2.decimals());
    console.log('- BPT Stake v2');
    console.log('  - Distribution End', await (await bptStakeV2.DISTRIBUTION_END()).toString());
    console.log('  - Revision', await (await bptStakeV2.REVISION()).toString());
    console.log('  - Name', await bptStakeV2.name());
    console.log('  - Symbol', await bptStakeV2.symbol());
    console.log('  - Decimals', await bptStakeV2.decimals());
  });
