import { eAstarNetwork, eEthereumNetwork, tEthereumAddress } from './types';
import { getParamPerNetwork } from './misc-utils';

export const MAX_UINT_AMOUNT =
  '115792089237316195423570985008687907853269984665640564039457584007913129639935';
export const MOCK_ETH_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
export const WAD = Math.pow(10, 18).toString();
export const COOLDOWN_SECONDS = '3600'; // 1 hour in seconds
export const UNSTAKE_WINDOW = '1800'; // 30 min in seconds
export const DISTRIBUTION_DURATION = '86400'; // 1 day in seconds

export const STAKED_TOKEN_NAME = 'Staked Lay';
export const STAKED_TOKEN_SYMBOL = 'sLAY';
export const STAKED_TOKEN_DECIMALS = 18;

export const GOVERNANCE_V2 = '0xEC568fffba86c094cf06b22134B23074DFE2252c';
export const UPGRADABLE_CRP_FACTORY = '0x1156C30b08DbF16281c803EAe0d52Eee7652f10C';
export const RAY_TOKEN = '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9';
export const WETH = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
export const REWARDS_VAULT = '0x25f2226b597e8f9514b3f68f00f494cf4f286491';
export const BPOOL_FACTORY = '0x9424B1412450D0f8Fc2255FAf6046b98213B76Bd';

export const CRP_IMPLEMENTATION = '0xadc74a134082ea85105258407159fbb428a73782';
export const SHORT_EXECUTOR = '0xee56e2b3d491590b5b31738cc34d5232f378a8d5';
export const LONG_EXECUTOR = '0x61910EcD7e8e942136CE7Fe7943f956cea1CC2f7';
export const PROXY_CRP_ADMIN = SHORT_EXECUTOR;
export const RESERVE_CONTROLER = '0x1E506cbb6721B83B1549fa1558332381Ffa61A93';
export const ZERO_ADDRESS: tEthereumAddress = '0x0000000000000000000000000000000000000000';

// PEI constants
export const PSM_STAKER_PREMIUM = '2';

// just junk mock

export const RANDOM_ADDRESSES = [
  '0x0000000000000000000000000000000000000221',
  '0x0000000000000000000000000000000000000321',
  '0x0000000000000000000000000000000000000211',
  '0x0000000000000000000000000000000000000251',
  '0x0000000000000000000000000000000000000271',
  '0x0000000000000000000000000000000000000291',
  '0x0000000000000000000000000000000000000321',
  '0x0000000000000000000000000000000000000421',
  '0x0000000000000000000000000000000000000521',
  '0x0000000000000000000000000000000000000621',
  '0x0000000000000000000000000000000000000721',
];

// LayToken's proxy
export const getTokenPerNetwork = (network: eEthereumNetwork | eAstarNetwork): tEthereumAddress =>
  getParamPerNetwork<tEthereumAddress>(
    {
      [eEthereumNetwork.coverage]: ZERO_ADDRESS,
      [eEthereumNetwork.hardhat]: ZERO_ADDRESS,
      [eEthereumNetwork.rinkeby]: ZERO_ADDRESS,
      [eEthereumNetwork.kovan]: '0x75AC15EbCA4e93D61bCc878ded9Ba338FD23E761', // Mock Lay Token
      [eEthereumNetwork.main]: '0x9c0435779F5E52CEC404D957C9bAa6f7d674C8bA',
      [eAstarNetwork.astar]: ZERO_ADDRESS, // Dummy
      [eAstarNetwork.shiden]: '0xb163716cb6c8b0a56e4f57c394A50F173E34181b',
      [eAstarNetwork.shibuya]: '0xEB741C051E474f83cff38B44A912281772C23CE6'
    },
    network
  );

export const getCooldownSecondsPerNetwork = (network: eEthereumNetwork | eAstarNetwork): tEthereumAddress =>
  getParamPerNetwork<string>(
    {
      [eEthereumNetwork.coverage]: COOLDOWN_SECONDS,
      [eEthereumNetwork.hardhat]: COOLDOWN_SECONDS,
      [eEthereumNetwork.rinkeby]: COOLDOWN_SECONDS,
      [eEthereumNetwork.kovan]: COOLDOWN_SECONDS, // '21600', // 8h
      [eEthereumNetwork.main]: '864000', // 10d
      [eAstarNetwork.astar]: COOLDOWN_SECONDS, // Dummy
      [eAstarNetwork.shiden]: COOLDOWN_SECONDS, // Dummy
      [eAstarNetwork.shibuya]: COOLDOWN_SECONDS // Dummy
    },
    network
  );

export const getUnstakeWindowPerNetwork = (network: eEthereumNetwork | eAstarNetwork): tEthereumAddress =>
  getParamPerNetwork<string>(
    {
      [eEthereumNetwork.coverage]: UNSTAKE_WINDOW,
      [eEthereumNetwork.hardhat]: UNSTAKE_WINDOW,
      [eEthereumNetwork.rinkeby]: UNSTAKE_WINDOW,
      [eEthereumNetwork.kovan]: UNSTAKE_WINDOW, // '10800', // 4h
      [eEthereumNetwork.main]: '172800', // 2d
      [eAstarNetwork.astar]: UNSTAKE_WINDOW, // Dummy
      [eAstarNetwork.shiden]: UNSTAKE_WINDOW, // Dummy
      [eAstarNetwork.shibuya]: UNSTAKE_WINDOW // Dummy
    },
    network
  );

// ProtoGovernance
export const getAdminPerNetwork = (network: eEthereumNetwork | eAstarNetwork): tEthereumAddress =>
  getParamPerNetwork<tEthereumAddress>(
    {
      [eEthereumNetwork.coverage]: ZERO_ADDRESS,
      [eEthereumNetwork.hardhat]: ZERO_ADDRESS,
      [eEthereumNetwork.rinkeby]: ZERO_ADDRESS,
      [eEthereumNetwork.kovan]: '0x175d905470e85279899C37F89000b195f3d0c0C5', // '0x8134929c3dcb1b8b82f27f53424b959fb82182f2', // Governance
      [eEthereumNetwork.main]: '0x8a2Efd9A790199F4c94c6effE210fce0B4724f52', // Governance
      [eAstarNetwork.astar]: ZERO_ADDRESS, // Dummy
      [eAstarNetwork.shiden]: '0x175d905470e85279899C37F89000b195f3d0c0C5', // Dummy
      [eAstarNetwork.shibuya]: '0x175d905470e85279899C37F89000b195f3d0c0C5'
    },
    network
  );

export const getDistributionDurationPerNetwork = (network: eEthereumNetwork | eAstarNetwork): tEthereumAddress =>
  getParamPerNetwork<tEthereumAddress>(
    {
      [eEthereumNetwork.coverage]: DISTRIBUTION_DURATION,
      [eEthereumNetwork.hardhat]: DISTRIBUTION_DURATION,
      [eEthereumNetwork.rinkeby]: DISTRIBUTION_DURATION,
      [eEthereumNetwork.kovan]: '864000',
      [eEthereumNetwork.main]: '12960000', // 5 months (30 days) in seconds
      [eAstarNetwork.astar]: DISTRIBUTION_DURATION, // Dummy
      [eAstarNetwork.shiden]: DISTRIBUTION_DURATION, // Dummy
      [eAstarNetwork.shibuya]: DISTRIBUTION_DURATION
    },
    network
  );

// IncentivesVault proxy
// refs
// - https://github.com/aave/genesis-migration
// - https://github.com/aave/genesis-migration/blob/master/tasks/deployments/1.vault.ts
export const getIncentivesVaultPerNetwork = (network: eEthereumNetwork | eAstarNetwork): tEthereumAddress =>
  getParamPerNetwork<tEthereumAddress>(
    {
      [eEthereumNetwork.coverage]: '',
      [eEthereumNetwork.hardhat]: '',
      [eEthereumNetwork.rinkeby]: ZERO_ADDRESS,
      [eEthereumNetwork.kovan]: '0x175d905470e85279899C37F89000b195f3d0c0C5',
      [eEthereumNetwork.main]: '0x253f7b06c1d60c1fbbc9d82c301327eb86e3ba81',
      [eAstarNetwork.astar]: ZERO_ADDRESS, // Dummy
      [eAstarNetwork.shiden]: '0x175d905470e85279899C37F89000b195f3d0c0C5', // Dummy
      [eAstarNetwork.shibuya]: '0x175d905470e85279899C37F89000b195f3d0c0C5' // Dummy
    },
    network
  );
