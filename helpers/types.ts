import BigNumber from 'bignumber.js';

export enum eEthereumNetwork {
  coverage = 'coverage',
  hardhat = 'hardhat',
  kovan = 'kovan',
  main = 'main',
  tenderly = 'tenderly',
}

export enum eAstarNetwork {
  astar = 'astar',
  shiden = 'shiden',
  shibuya = 'shibuya',
}

export enum eContractid {
  DistributionManager = 'DistributionManager',
  StakedLay = 'StakedLay',
  StakedLayImpl = 'StakedLayImpl',
  IncentivesController = 'IncentivesController',
  IERC20Detailed = 'IERC20Detailed',
  AdminUpgradeabilityProxy = 'AdminUpgradeabilityProxy',
  InitializableAdminUpgradeabilityProxy = 'InitializableAdminUpgradeabilityProxy',
  MintableErc20 = 'MintableErc20',
  LendingPoolMock = 'LendingPoolMock',
  MockTransferHook = 'MockTransferHook',
  ATokenMock = 'ATokenMock',
  StakedLayV2 = 'StakedLayV2',
  DoubleTransferHelper = 'DoubleTransferHelper',
  ICRPFactory = 'ICRPFactory',
  StakedTokenV2 = 'StakedTokenV2',
  StakedTokenV3 = 'StakedTokenV3',
  IConfigurableRightsPool = 'IConfigurableRightsPool',
  IBPool = 'IBPool',
  IControllerAaveEcosystemReserve = 'IControllerAaveEcosystemReserve',
  MockSelfDestruct = 'SelfdestructTransfer',
  StakedTokenV2Rev3 = 'StakedTokenV2Rev3',
  StakedTokenBptRev2 = 'StakedTokenBptRev2',
}

export type tEthereumAddress = string;
export type tStringTokenBigUnits = string; // 1 ETH, or 10e6 USDC or 10e18 DAI
export type tBigNumberTokenBigUnits = BigNumber;
// 1 wei, or 1 basic unit of USDC, or 1 basic unit of DAI
export type tStringTokenSmallUnits = string;
export type tBigNumberTokenSmallUnits = BigNumber;

export interface iParamsPerNetwork<T> {
  [eEthereumNetwork.coverage]: T;
  [eEthereumNetwork.hardhat]: T;
  [eEthereumNetwork.kovan]: T;
  [eEthereumNetwork.main]: T;
  [eAstarNetwork.astar]: T;
  [eAstarNetwork.shiden]: T;
  [eAstarNetwork.shibuya]: T;
}
