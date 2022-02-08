import { BigNumberish, ethers } from 'ethers';
import rawBRE from 'hardhat';
import { makeSuite, TestEnv, initializeMakeSuite } from '../helpers/make-suite';
import {
  getCRPFactoryContract,
  deployStakedTokenV3,
  getCRPContract,
  getBpool,
  getERC20Contract,
  getController,
  deploySelfDestruct,
} from '../../helpers/contracts-accessors';
import {
  UPGRADABLE_CRP_FACTORY,
  WETH,
  RAY_TOKEN,
  RESERVE_CONTROLER,
  REWARDS_VAULT,
  SHORT_EXECUTOR,
  ZERO_ADDRESS,
  BPOOL_FACTORY,
  CRP_IMPLEMENTATION,
  LONG_EXECUTOR,
  GOVERNANCE_V2,
  PROXY_CRP_ADMIN,
} from '../../helpers/constants';
import {
  timeLatest,
  increaseTimeAndMine,
  increaseTime,
  impersonateAccountsHardhat,
  DRE,
  waitForTx,
} from '../../helpers/misc-utils';
import { parseEther } from 'ethers/lib/utils';
import { tEthereumAddress } from '../../helpers/types';
import { zeroAddress } from 'ethereumjs-util';
import { IcrpFactory } from '../../types/IcrpFactory';
import { MintableErc20 } from '../../types/MintableErc20';
import { IbPool } from '../../types/IbPool';
import { IConfigurableRightsPool } from '../../types/IConfigurableRightsPool';
import { StakedTokenV3 } from '../../types/StakedTokenV3';
import { IStarlayGovernanceV2 } from '../../types/IStarlayGovernanceV2';
import { IControllerStarlayEcosystemReserve } from '../../types/IControllerStarlayEcosystemReserve';
import { parse } from 'path';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address';

const { expect } = require('chai');

const WETH_HOLDER = '0x1840c62fD7e2396e470377e6B2a833F3A1E96221';
const MULTI_SIG = '0xC4E1A298c0D712fcF6Dd9124075b27177336f752';
const PROXY_CRP_ADMIHN = LONG_EXECUTOR;
const REWARDS_RECEIVER = '0xdd5ce83026f622d574ADa5e71D0a1f34700fA854'; // random
const EMISSION_MANAGER = SHORT_EXECUTOR;
const RESERVER_ALLOWANCE = parseEther('100000');

const LAY_WEIGHT = parseEther('40'); // 80 %
const WETH_WEIGHT = parseEther('10'); // 20 %
const INIT_LAY_PRICE = 502; // 1 ETH = 5.14 LAY
const PRICE_PRECISION = 100;
const INIT_TOKEN_SUPPLY_DIVIDER = 100;

// INIT LAY SUPPLY = 40 / 100 = 0.4
const INIT_LAY_POOL_SUPPLY = LAY_WEIGHT.div(INIT_TOKEN_SUPPLY_DIVIDER);
const INIT_WETH_POOL_SUPPLY = WETH_WEIGHT.div(INIT_TOKEN_SUPPLY_DIVIDER)
  .div(INIT_LAY_PRICE)
  .mul(PRICE_PRECISION);
// Requirement: 1000 BPT = aprox 1 LAY. 500 shares for 0.4 LAY + 0.1 LAY worth of WETH
const INIT_SHARE_SUPPLY = INIT_LAY_POOL_SUPPLY.mul(10).div(8).mul(1000);
// 0.1 %
const SWAP_FEE = parseEther('0.04');
const INFINITE_APPROVAL_AMOUNT = parseEther('100000000000');
console.log(INIT_WETH_POOL_SUPPLY.toString());
// Staked LAY
const COOLDOWN_SECONDS = '864000'; // 10 days
const UNSTAKE_WINDOW = '172800'; // 2 days
const DISTRIBUTION_DURATION = '15780000'; // 6 month

rawBRE.run('set-dre').then(async () => {
  makeSuite('Deploy stkBPT', async (testEnv: TestEnv) => {
    let CRPFactory: IcrpFactory;
    let CRPool: IConfigurableRightsPool; // Configurable Smart Pool
    let BPShares: MintableErc20; // Configurable Smart pool, token interface
    let layToken: MintableErc20;
    let weth: MintableErc20;
    let BPool: IbPool; // BPool
    let ReserveController: IControllerStarlayEcosystemReserve;
    let stakedBPS: StakedTokenV3; // bptshare
    let deployerSigner: ethers.providers.JsonRpcSigner;
    let holderSigner: ethers.providers.JsonRpcSigner;
    let wethHolderSigner: ethers.providers.JsonRpcSigner;
    let shortExecutorSigner: ethers.providers.JsonRpcSigner;
    let holderWethBalance: ethers.BigNumber;
    let holderLayBalance: ethers.BigNumber;
    let deployer = testEnv.users[2];
    before(async () => {
      await initializeMakeSuite();
      await impersonateAccountsHardhat([MULTI_SIG, WETH_HOLDER, SHORT_EXECUTOR]);
      deployer = testEnv.users[2];
      layToken = await getERC20Contract(RAY_TOKEN);
      weth = await getERC20Contract(WETH);
      ReserveController = await getController(RESERVE_CONTROLER);
      CRPFactory = await getCRPFactoryContract(UPGRADABLE_CRP_FACTORY);
      holderSigner = DRE.ethers.provider.getSigner(MULTI_SIG);
      wethHolderSigner = DRE.ethers.provider.getSigner(WETH_HOLDER);
      shortExecutorSigner = DRE.ethers.provider.getSigner(SHORT_EXECUTOR);
      deployerSigner = DRE.ethers.provider.getSigner(deployer.address);
      await waitForTx(
        await weth.connect(wethHolderSigner).transfer(MULTI_SIG, parseEther('10000'))
      );
      await waitForTx(
        await wethHolderSigner.sendTransaction({ to: MULTI_SIG, value: parseEther('2') })
      );
    });
    beforeEach(async () => {
      holderWethBalance = await weth.balanceOf(MULTI_SIG);
      holderLayBalance = await layToken.balanceOf(MULTI_SIG);
    });
    it('Creates a new CRP', async () => {
      let CRPAddress = zeroAddress();
      // Listener: registering new pool address
      CRPFactory.on(CRPFactory.filters.LogNewCrp(deployer.address, null), async (sender, pool) => {
        CRPAddress = pool;
        expect(await CRPFactory.isCrp(CRPAddress)).to.be.equal(true);
      });

      // creating new CRP: setting init settings before pool creation
      await waitForTx(
        await CRPFactory.connect(deployerSigner).newCrp(
          BPOOL_FACTORY,
          {
            poolTokenSymbol: 'ABPT',
            poolTokenName: 'Lay Balance Pool Token',
            constituentTokens: [RAY_TOKEN, WETH],
            tokenBalances: [INIT_LAY_POOL_SUPPLY, INIT_WETH_POOL_SUPPLY],
            tokenWeights: [LAY_WEIGHT, WETH_WEIGHT],
            swapFee: SWAP_FEE,
          },
          {
            canPauseSwapping: true,
            canChangeSwapFee: true,
            canChangeWeights: true,
            canAddRemoveTokens: true,
            canWhitelistLPs: false,
            canChangeCap: true,
          },
          CRP_IMPLEMENTATION,
          PROXY_CRP_ADMIN
        )
      );
      // Making sure the listener is shot before moving on
      while (CRPAddress == zeroAddress()) {
        await new Promise<void>((res) => {
          setTimeout(async () => {
            res();
          }, 100);
        });
      }
      CRPool = await getCRPContract(CRPAddress);
      BPShares = await getERC20Contract(CRPAddress); // same contract, ERC Interface
    });
    it('Gives control to multisig', async () => {
      await waitForTx(await CRPool.connect(deployer.signer).setController(MULTI_SIG));
    });
    it('Creates the smart Pool: 80/20 LAY/ETH', async () => {
      await waitForTx(
        await layToken.connect(holderSigner).approve(CRPool.address, INFINITE_APPROVAL_AMOUNT)
      );
      await waitForTx(
        await weth.connect(holderSigner).approve(CRPool.address, INFINITE_APPROVAL_AMOUNT)
      );

      let bp = await CRPool.bPool();
      // bpool not created yet
      expect(bp).to.be.equal(zeroAddress());
      // creating bPool
      await waitForTx(await CRPool.connect(holderSigner).createPool(INIT_SHARE_SUPPLY));
      const bptAddress = await CRPool.bPool();
      expect(bptAddress).to.not.be.equal(zeroAddress());

      BPool = await getBpool(bptAddress); //Underlying BPool

      expect(await BPShares.balanceOf(MULTI_SIG)).to.be.equal(INIT_SHARE_SUPPLY);
      expect(await BPShares.totalSupply()).to.be.equal(INIT_SHARE_SUPPLY);
      expect(await layToken.balanceOf(MULTI_SIG)).to.be.equal(
        holderLayBalance.sub(INIT_LAY_POOL_SUPPLY)
      );
      expect(await weth.balanceOf(MULTI_SIG)).to.be.equal(
        holderWethBalance.sub(INIT_WETH_POOL_SUPPLY)
      );
    });
    it('Increases cap', async () => {
      await waitForTx(await CRPool.connect(holderSigner).setCap(parseEther('10000000000000000')));
    });
    it('Let a user join the smart pool, adding liquidity', async () => {
      const BOUGHT_SHARES = parseEther('10');
      await waitForTx(
        await CRPool.connect(holderSigner).joinPool(BOUGHT_SHARES, [
          INFINITE_APPROVAL_AMOUNT,
          INFINITE_APPROVAL_AMOUNT,
        ])
      );
      expect(await BPShares.balanceOf(MULTI_SIG)).to.be.equal(INIT_SHARE_SUPPLY.add(BOUGHT_SHARES));
    });
    it('Let a user make a swap Weth => Lay', async () => {
      await waitForTx(
        await layToken.connect(holderSigner).approve(BPool.address, INFINITE_APPROVAL_AMOUNT)
      );
      await waitForTx(
        await weth.connect(holderSigner).approve(BPool.address, INFINITE_APPROVAL_AMOUNT)
      );
      // swapping weth for lay. Price is currently 1 LAY = 10 ETH
      const SOLD_WETH = parseEther('0.0004');
      await waitForTx(
        await BPool.connect(holderSigner).swapExactAmountIn(
          WETH,
          SOLD_WETH,
          RAY_TOKEN,
          parseEther('0.00001'),
          parseEther('0.0005').mul(INIT_LAY_PRICE)
        )
      );
      expect(await weth.balanceOf(MULTI_SIG)).to.be.equal(holderWethBalance.sub(SOLD_WETH));
    });
    it('Let a user make a swap LAY => WETH', async () => {
      const SOLD_LAY = parseEther('0.005');
      await waitForTx(
        await BPool.connect(holderSigner).swapExactAmountIn(
          RAY_TOKEN,
          SOLD_LAY,
          WETH,
          parseEther('0.0002'),
          parseEther('100')
        )
      );
      expect(await layToken.balanceOf(MULTI_SIG)).to.be.equal(holderLayBalance.sub(SOLD_LAY));
    });
    it('Creates the staked token overlay', async () => {
      const { deployer } = testEnv;
      stakedBPS = await deployStakedTokenV3([
        CRPool.address,
        RAY_TOKEN,
        COOLDOWN_SECONDS,
        UNSTAKE_WINDOW,
        REWARDS_VAULT,
        EMISSION_MANAGER,
        DISTRIBUTION_DURATION,
        'staked LAY/ETH BPT',
        'stkLBPT',
        '18',
        zeroAddress(),
      ]);
    });
    it('Configure the asset', async () => {
      // sending fun to the executor to pay for impernated tx
      const SelfDestructContract = await deploySelfDestruct();
      await waitForTx(
        await SelfDestructContract.destroyAndTransfer(SHORT_EXECUTOR, { value: parseEther('10') })
      );
      await waitForTx(
        await stakedBPS.connect(shortExecutorSigner).configureAssets([
          {
            emissionPerSecond: parseEther('0.0001').toString(),
            totalStaked: parseEther('1000').toString(),
            underlyingAsset: stakedBPS.address,
          },
        ])
      );
    });
    it('Execute the vault to approve stkBPShares', async () => {
      await ReserveController.connect(shortExecutorSigner).approve(
        layToken.address,
        stakedBPS.address,
        RESERVER_ALLOWANCE
      );
    });
    it('Stake shares and get rewards', async () => {
      const STAKED_SHARES = parseEther('10');
      const shareBlance = await BPShares.balanceOf(MULTI_SIG);
      await waitForTx(
        await BPShares.connect(holderSigner).approve(stakedBPS.address, INFINITE_APPROVAL_AMOUNT)
      );
      await waitForTx(await stakedBPS.connect(holderSigner).stake(MULTI_SIG, STAKED_SHARES));
      expect(await BPShares.balanceOf(MULTI_SIG)).to.be.equal(shareBlance.sub(STAKED_SHARES));
      expect(await stakedBPS.balanceOf(MULTI_SIG)).to.be.equal(STAKED_SHARES);
      await increaseTimeAndMine(60 * 60 * 24 * 3);
      await waitForTx(await stakedBPS.connect(holderSigner).claimRewards(REWARDS_RECEIVER, 1));
      expect(await layToken.balanceOf(REWARDS_RECEIVER)).to.be.equal(1);
    });
  });
});
