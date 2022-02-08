import { expect } from 'chai';
import rawHRE from 'hardhat';
import { BigNumber } from 'ethers';
import { formatEther, parseEther } from 'ethers/lib/utils';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address';
import { JsonRpcSigner } from '@ethersproject/providers';
import { DRE, increaseTimeAndMineTenderly, timeLatest, waitForTx } from '../helpers/misc-utils';
import {
  increaseTimeTenderly,
  latestBlock,
  advanceBlockTo,
  impersonateAccountsHardhat,
} from '../helpers/misc-utils';
import { MAX_UINT_AMOUNT } from '../helpers/constants';
import { IStarlayGovernanceV2 } from '../types/IStarlayGovernanceV2';
import { ILendingPool } from '../types/ILendingPool';
import {
  StakedLayV2,
  StakedLayV2__factory,
  Erc20,
  SelfdestructTransfer__factory,
  Erc20__factory,
  IDelegationAwareToken__factory,
  StakedTokenV2Rev3,
  StakedTokenBptRev2,
  StakedTokenV2Rev3__factory,
  StakedTokenBptRev2__factory,
} from '../types';
import { spendList } from './helpers';
import { logError } from '../helpers/tenderly-utils';

const {
  RESERVES = 'DAI,GUSD,USDC,USDT,WBTC,WETH',
  POOL_CONFIGURATOR = '0x311bb771e4f8952e6da169b425e7e92d6ac45756',
  POOL_DATA_PROVIDER = '0x057835Ad21a177dbdd3090bB1CAE03EaCF78Fc6d',
  ECO_RESERVE = '0x25F2226B597E8F9514B3F68F00f494cF4f286491',
  LAY_TOKEN = '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9',
  IPFS_HASH = 'QmT9qk3CRYbFDWpDFYeAv8T8H1gnongwKhh5J68NLkLir6', // WIP
  GOVERNANCE_V2 = '0xEC568fffba86c094cf06b22134B23074DFE2252c', // mainnet
  LONG_EXECUTOR = '0x61910ecd7e8e942136ce7fe7943f956cea1cc2f7', // mainnet
} = process.env;

if (
  !RESERVES ||
  !POOL_CONFIGURATOR ||
  !POOL_DATA_PROVIDER ||
  !ECO_RESERVE ||
  !LAY_TOKEN ||
  !IPFS_HASH ||
  !GOVERNANCE_V2 ||
  !LONG_EXECUTOR
) {
  throw new Error('You have not set correctly the .env file, make sure to read the README.md');
}

const LENDING_POOL = '0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9';
const VOTING_DURATION = 64000;

const WHALE = '0x25f2226b597e8f9514b3f68f00f494cf4f286491';
const WHALE_2 = '0xbe0eb53f46cd790cd13851d5eff43d12404d33e8';

const BPT_POOL_TOKEN = '0x41a08648c3766f9f9d85598ff102a08f4ef84f84';
const STAKED_LAY = '0x4da27a545c0c5B758a6BA100e3a049001de870f5';
const BPT_STAKE = '0xa1116930326D21fB917d5A27F1E9943A9595fb47';
const DAI_TOKEN = '0x6b175474e89094c44da98b954eedeac495271d0f';
const DAI_HOLDER = '0x72aabd13090af25dbb804f84de6280c697ed1150';
const BPT_WHALE = '0xc1c3f183b71f52b4f5f8f0dd8eb023cdafd2fc93';

describe('Proposal: Extend Staked Lay distribution', () => {
  let ethers;

  let whale: JsonRpcSigner;
  let daiHolder: JsonRpcSigner;
  let proposer: SignerWithAddress;
  let gov: IStarlayGovernanceV2;
  let pool: ILendingPool;
  let layToken: Erc20;
  let layBpt: Erc20;
  let dai: Erc20;
  let aDAI: Erc20;
  let proposalId: BigNumber;
  let stakedLayV2: StakedLayV2;
  let bptStakeV2: StakedLayV2;
  let stkLayImplAddress: string;
  let stkBptImplAddress: string;
  let stakedTokenV2Revision3Implementation: StakedTokenV2Rev3;
  let stakedBptV2Revision2Implementation: StakedTokenBptRev2;
  before(async () => {
    await rawHRE.run('set-dre');
    ethers = DRE.ethers;
    [proposer] = await DRE.ethers.getSigners();

    // Send ether to the LAY_WHALE, which is a non payable contract via selfdestruct
    const selfDestructContract = await new SelfdestructTransfer__factory(proposer).deploy();
    await (
      await selfDestructContract.destroyAndTransfer(WHALE, {
        value: ethers.utils.parseEther('1'),
      })
    ).wait();

    // Impersonating holders
    await impersonateAccountsHardhat([
      WHALE,
      WHALE_2,
      BPT_WHALE,
      ...Object.keys(spendList).map((k) => spendList[k].holder),
    ]);

    const whale2 = ethers.provider.getSigner(WHALE_2);
    const bptWhale = ethers.provider.getSigner(BPT_WHALE);
    whale = ethers.provider.getSigner(WHALE);
    daiHolder = ethers.provider.getSigner(DAI_HOLDER);

    // Initialize contracts and tokens
    gov = (await ethers.getContractAt(
      'IStarlayGovernanceV2',
      GOVERNANCE_V2,
      proposer
    )) as IStarlayGovernanceV2;
    pool = (await ethers.getContractAt(
      'ILendingPool',
      LENDING_POOL,
      proposer
    )) as ILendingPool;

    const { aTokenAddress } = await pool.getReserveData(DAI_TOKEN);

    layToken = Erc20__factory.connect(LAY_TOKEN, whale);
    layBpt = Erc20__factory.connect(BPT_POOL_TOKEN, bptWhale);
    stakedLayV2 = StakedLayV2__factory.connect(STAKED_LAY, proposer);
    bptStakeV2 = StakedLayV2__factory.connect(BPT_STAKE, proposer);
    dai = Erc20__factory.connect(DAI_TOKEN, daiHolder);
    aDAI = Erc20__factory.connect(aTokenAddress, proposer);

    // Transfer enough LAY to proposer
    await (await layToken.transfer(proposer.address, parseEther('2000000'))).wait();
    // Transfer enough LAY to proposer
    await (await layToken.connect(whale2).transfer(proposer.address, parseEther('1200000'))).wait();
    // Transfer DAI to repay future DAI loan
    await (await dai.transfer(proposer.address, parseEther('100000'))).wait();
    // Transfer LAY BPT pool shares to proposer
    await (await layBpt.transfer(proposer.address, parseEther('100'))).wait();
  });

  it('Proposal should be created', async () => {
    await advanceBlockTo((await latestBlock()) + 10);
    const govToken = IDelegationAwareToken__factory.connect(LAY_TOKEN, proposer);

    try {
      const balance = await layToken.balanceOf(proposer.address);
      console.log('Token Balance proposer', formatEther(balance));
      const propositionPower = await govToken.getPowerAtBlock(
        proposer.address,
        ((await latestBlock()) - 1).toString(),
        '1'
      );

      console.log(
        `Proposition power of ${proposer.address} at block - 1`,
        formatEther(propositionPower)
      );
    } catch (error) {
      console.log(error);
    }
    // Submit proposal
    proposalId = await gov.getProposalsCount();

    const { staledTokenImpl, stkBptImpl }: { [key: string]: string } = await DRE.run(
      'proposal-stk-extensions'
    );

    stkLayImplAddress = staledTokenImpl;
    stkBptImplAddress = stkBptImpl;

    stakedTokenV2Revision3Implementation = StakedTokenV2Rev3__factory.connect(
      stkLayImplAddress,
      proposer
    );
    stakedBptV2Revision2Implementation = StakedTokenBptRev2__factory.connect(
      stkBptImplAddress,
      proposer
    );

    // Mine block due flash loan voting protection
    await advanceBlockTo((await latestBlock()) + 1);

    const votingPower = await govToken.getPowerAtBlock(
      proposer.address,
      ((await latestBlock()) - 1).toString(),
      '0'
    );
    console.log(`Voting power of ${proposer.address} at block - 1`, formatEther(votingPower));

    // Submit vote and advance block to Queue phase
    await (await gov.submitVote(proposalId, true, { gasLimit: 300000 })).wait();
    await advanceBlockTo((await latestBlock()) + VOTING_DURATION + 1);
  });

  it('Proposal should be queued', async () => {
    // Queue and advance block to Execution phase
    try {
      await (await gov.queue(proposalId, { gasLimit: 3000000 })).wait();
    } catch (error) {
      logError();
      throw error;
    }

    const proposalState = await gov.getProposalState(proposalId);
    expect(proposalState).to.be.equal(5);

    await increaseTimeTenderly(604800 + 10);
  });

  it('Proposal should be executed', async () => {
    // Execute payload
    try {
      await (await gov.execute(proposalId, { gasLimit: 3000000 })).wait();
    } catch (error) {
      logError();
      throw error;
    }

    console.log('Proposal executed');

    const proposalState = await gov.getProposalState(proposalId);
    expect(proposalState).to.be.equal(7);
  });

  it('Users should be able to stake Lay', async () => {
    const amount = parseEther('10');
    await waitForTx(await layToken.connect(proposer).approve(stakedLayV2.address, amount));
    await expect(stakedLayV2.connect(proposer).stake(proposer.address, amount)).to.emit(
      stakedLayV2,
      'Staked'
    );
  });

  it('Users should be able to redeem stakedLay', async () => {
    const amount = parseEther('1');
    await increaseTimeAndMineTenderly(48600);

    try {
      await waitForTx(await stakedLayV2.cooldown({ gasLimit: 3000000 }));

      const COOLDOWN_SECONDS = await stakedLayV2.COOLDOWN_SECONDS();
      await increaseTimeAndMineTenderly(Number(COOLDOWN_SECONDS.toString()));

      await expect(
        stakedLayV2.connect(proposer).redeem(proposer.address, amount, { gasLimit: 3000000 })
      ).to.emit(stakedLayV2, 'Redeem');
    } catch (error) {
      logError();
      throw error;
    }
  });

  it('Users should be able to stake Lay Pool BPT', async () => {
    const amount = parseEther('10');
    await waitForTx(await layBpt.connect(proposer).approve(bptStakeV2.address, amount));
    await expect(bptStakeV2.connect(proposer).stake(proposer.address, amount)).to.emit(
      bptStakeV2,
      'Staked'
    );
  });

  it('Users should be able to redeem Lay via redeem stkBpt', async () => {
    const amount = parseEther('1');
    await increaseTimeAndMineTenderly(48600);

    try {
      await waitForTx(await bptStakeV2.cooldown({ gasLimit: 3000000 }));

      const COOLDOWN_SECONDS = await bptStakeV2.COOLDOWN_SECONDS();
      await increaseTimeAndMineTenderly(Number(COOLDOWN_SECONDS.toString()));

      await expect(
        bptStakeV2.connect(proposer).redeem(proposer.address, amount, { gasLimit: 3000000 })
      ).to.emit(bptStakeV2, 'Redeem');
    } catch (error) {
      logError();
      throw error;
    }
  });

  it('Users should be able to transfer StakedLay', async () => {
    await expect(stakedLayV2.transfer(whale._address, parseEther('1'))).emit(
      stakedLayV2,
      'Transfer'
    );
  });

  it('Users should be able to transfer stkBPT', async () => {
    await expect(bptStakeV2.transfer(whale._address, parseEther('1'))).emit(bptStakeV2, 'Transfer');
  });

  it('Staked Lay Distribution End should be extended', async () => {
    const implDistributionEnd = await stakedTokenV2Revision3Implementation.DISTRIBUTION_END();
    const proxyDistributionEnd = await stakedLayV2.DISTRIBUTION_END();

    expect(implDistributionEnd).to.be.eq(proxyDistributionEnd, 'DISTRIBUTION_END SHOULD MATCH');
  });
  it('Staked Lay revision should be 3', async () => {
    const revisionImpl = await stakedTokenV2Revision3Implementation.REVISION();
    const revisionProxy = await stakedLayV2.REVISION();

    expect(revisionImpl).to.be.eq(revisionProxy, 'DISTRIBUTION_END SHOULD MATCH');
    expect(revisionProxy).to.be.eq('3', 'DISTRIBUTION_END SHOULD MATCH');
  });
  it('Staked BPT  revision should be 2', async () => {
    const revisionImpl = await stakedBptV2Revision2Implementation.REVISION();
    const revisionProxy = await bptStakeV2.REVISION();

    expect(revisionImpl).to.be.eq(revisionProxy, 'DISTRIBUTION_END SHOULD MATCH');
    expect(revisionProxy).to.be.eq('2', 'DISTRIBUTION_END SHOULD MATCH');
  });
  it('Users should be able to deposit DAI at Lending Pool', async () => {
    // Deposit DAI to LendingPool
    await (await dai.connect(proposer).approve(pool.address, parseEther('2000'))).wait();

    const tx = await pool.deposit(dai.address, parseEther('100'), proposer.address, 0);
    expect(tx).to.emit(pool, 'Deposit');
  });

  it('Users should be able to request DAI loan from Lending Pool', async () => {
    // Request DAI loan to LendingPool
    const tx = await pool.borrow(dai.address, parseEther('1'), '2', '0', proposer.address);
    expect(tx).to.emit(pool, 'Borrow');
  });

  it('Users should be able to repay DAI loan from Lending Pool', async () => {
    // Repay DAI variable loan to LendingPool
    await (await dai.connect(proposer).approve(pool.address, MAX_UINT_AMOUNT)).wait();
    const tx = await pool.repay(dai.address, MAX_UINT_AMOUNT, '2', proposer.address);
    expect(tx).to.emit(pool, 'Repay');
  });

  it('Users should be able to withdraw DAI from Lending Pool', async () => {
    // Withdraw DAI from LendingPool
    await (await aDAI.connect(proposer).approve(pool.address, MAX_UINT_AMOUNT)).wait();
    const tx = await pool.withdraw(dai.address, MAX_UINT_AMOUNT, proposer.address);
    expect(tx).to.emit(pool, 'Withdraw');
  });
});
