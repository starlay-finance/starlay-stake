import { task } from 'hardhat/config';
import { DRE } from '../../helpers/misc-utils';
import { Signer } from 'ethers';
import { getDefenderRelaySigner } from '../../helpers/defender-utils';

task('proposal-stk-extensions', 'Deploy implementations and create proposal')
  .addOptionalParam('staledTokenImpl')
  .addOptionalParam('stkbptimpl')
  .addFlag('defender')
  .setAction(async ({ defender, staledTokenImpl, stkbptimpl }, localBRE: any) => {
    await localBRE.run('set-dre');

    let deployer: Signer;

    [deployer] = await DRE.ethers.getSigners();

    if (defender) {
      const { signer } = await getDefenderRelaySigner();
      deployer = signer;
    }

    const {
      IPFS_HASH = '0x4d4a4bda3036f8da3f6911941df8c185f0e4ec248de44b44253dae5a4798a001', 
      GOVERNANCE_V2 = '0xEC568fffba86c094cf06b22134B23074DFE2252c', // mainnet
      LONG_EXECUTOR = '0x61910ecd7e8e942136ce7fe7943f956cea1cc2f7', // mainnet
    } = process.env;

    if (!IPFS_HASH || !GOVERNANCE_V2 || !LONG_EXECUTOR) {
      throw new Error('You have not set correctly the .env file, make sure to read the README.md');
    }

    const STAKED_TOKEN = '0x4da27a545c0c5B758a6BA100e3a049001de870f5';
    const STK_BPT_STAKE = '0xa1116930326D21fB917d5A27F1E9943A9595fb47';

    if (!staledTokenImpl) {
      staledTokenImpl = await DRE.run('deploy-staked-lay-rev3', { defender: !!defender });
    }
    if (!stkbptimpl) {
      stkbptimpl = await DRE.run('deploy-staked-bpt-rev2', { defender: !!defender });
    }

    await DRE.run('propose-extension', {
      stakedTokenProxy: STAKED_TOKEN,
      stakedTokenImpl: staledTokenImpl,
      stkBptProxy: STK_BPT_STAKE,
      stkBptImpl: stkbptimpl,
      governance: GOVERNANCE_V2,
      longExecutor: LONG_EXECUTOR,
      ipfsHash: IPFS_HASH,
      defender: !!defender,
    });

    return {
      staledTokenImpl,
      stkbptimpl,
    };
  });
