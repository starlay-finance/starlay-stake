import { task } from 'hardhat/config';
import {
  Erc20__factory,
  IStarlayGovernanceV2,
  IDelegationAwareToken__factory,
  SelfdestructTransfer__factory,
} from '../../types';
import { advanceBlockTo, DRE, increaseTimeTenderly, latestBlock } from '../../helpers/misc-utils';
import { logError } from '../../helpers/tenderly-utils';
import { parseEther, formatEther } from 'ethers/lib/utils';
import { getDefenderRelaySigner } from '../../helpers/defender-utils';
import { Signer } from '@ethersproject/abstract-signer';

task('proposal-vault-approval:tenderly', 'Create proposal at Tenderly')
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
      REWARDS_VAULT = '0x25F2226B597E8F9514B3F68F00f494cF4f286491',
      RAY_STAKE = '0x4da27a545c0c5B758a6BA100e3a049001de870f5',
      STK_BPT_STAKE = '0xa1116930326D21fB917d5A27F1E9943A9595fb47',
    } = process.env;

    if (!RAY_TOKEN || !GOVERNANCE_V2) {
      throw new Error('You have not set correctly the .env file, make sure to read the README.md');
    }

    const VOTING_DURATION = 19200;

    const WHALE = '0x25f2226b597e8f9514b3f68f00f494cf4f286491';
    const WHALE_2 = '0xbe0eb53f46cd790cd13851d5eff43d12404d33e8';

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

    console.log('- Prior proposal:');
    console.log('- Rewards Vault Allowance');
    console.log('  - StakedLay', formatEther(await layToken.allowance(REWARDS_VAULT, RAY_STAKE)));
    console.log('  - StakedBPT', formatEther(await layToken.allowance(REWARDS_VAULT, STK_BPT_STAKE)));

    // Transfer enough LAY to proposer
    await (await layToken.transfer(await proposer.getAddress(), parseEther('2000000'))).wait();
    // Transfer enough LAY to proposer
    await (
      await layToken.connect(whale2).transfer(await proposer.getAddress(), parseEther('1200000'))
    ).wait();

    await advanceBlockTo((await latestBlock()) + 10);

    // Submit proposal
    const proposalId = await gov.getProposalsCount();

    await DRE.run('proposal-vault-approval', {
      defender: !!defender,
      ipfsHash: '0x4d4a4bda3036f8da3f6911941df8c185f0e4ec248de44b44253dae5a4798a001',
    });

    // Mine block due flash loan voting protection
    await advanceBlockTo((await latestBlock()) + 1);

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
    await increaseTimeTenderly(86400 + 10);

    // Execute
    try {
      await (await gov.execute(proposalId, { gasLimit: 3000000 })).wait();
    } catch (error) {
      logError();
      throw error;
    }

    console.log('');
    console.log('- Proposal executed:');
    console.log('- Rewards Vault Allowance');
    console.log('  - StakedLay', formatEther(await layToken.allowance(REWARDS_VAULT, RAY_STAKE)));
    console.log('  - StakedBPT', formatEther(await layToken.allowance(REWARDS_VAULT, STK_BPT_STAKE)));
  });
