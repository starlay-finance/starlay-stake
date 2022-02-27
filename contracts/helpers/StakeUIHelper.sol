// SPDX-License-Identifier: MIT
pragma solidity 0.7.5;
pragma experimental ABIEncoderV2;
import {IERC20} from '../interfaces/IERC20.sol';
import {IStakedToken} from '../interfaces/IStakedToken.sol';
import {StakeUIHelperI} from '../interfaces/StakeUIHelperI.sol';
import {IERC20WithNonce} from '../interfaces/IERC20WithNonce.sol';
import {IPriceOracle} from '../../submodule-protocol/contracts/interfaces/IPriceOracle.sol';

contract StakeUIHelper is StakeUIHelperI {
  IPriceOracle public immutable PRICE_ORACLE;

  address public immutable MOCK_USD_ADDRESS;
  address public immutable AAVE;
  IStakedToken public immutable STAKED_AAVE;

  uint256 constant SECONDS_PER_YEAR = 365 * 24 * 60 * 60;
  uint256 constant APY_PRECISION = 10000;
  uint256 internal constant USD_BASE = 1e26;

  constructor(
    IPriceOracle priceOracle,
    address aave,
    IStakedToken stkAave,
    address mockUsd
  ) public {
    PRICE_ORACLE = priceOracle;

    AAVE = aave;
    STAKED_AAVE = stkAave;
    MOCK_USD_ADDRESS = mockUsd;
  }

  function _getUserAndGeneralStakedAssetData(
    IStakedToken stakeToken,
    address underlyingToken,
    address user,
    bool isNonceAvailable
  ) internal view returns (AssetUIData memory) {
    AssetUIData memory data;
    GeneralStakeUIData memory generalStakeData = _getGeneralStakedAssetData(stakeToken);

    data.stakeTokenTotalSupply = generalStakeData.stakeTokenTotalSupply;
    data.stakeCooldownSeconds = generalStakeData.stakeCooldownSeconds;
    data.stakeUnstakeWindow = generalStakeData.stakeUnstakeWindow;
    data.rewardTokenPriceEth = generalStakeData.rewardTokenPriceEth;
    data.distributionEnd = generalStakeData.distributionEnd;
    data.distributionPerSecond = generalStakeData.distributionPerSecond;

    if (user != address(0)) {
      UserStakeUIData memory userStakeData =
        _getUserStakedAssetData(stakeToken, underlyingToken, user, isNonceAvailable);

      data.underlyingTokenUserBalance = userStakeData.underlyingTokenUserBalance;
      data.stakeTokenUserBalance = userStakeData.stakeTokenUserBalance;
      data.userIncentivesToClaim = userStakeData.userIncentivesToClaim;
      data.userCooldown = userStakeData.userCooldown;
      data.userPermitNonce = userStakeData.userPermitNonce;
    }

    return data;
  }

  function _getUserStakedAssetData(
    IStakedToken stakeToken,
    address underlyingToken,
    address user,
    bool isNonceAvailable
  ) internal view returns (UserStakeUIData memory) {
    UserStakeUIData memory data;
    data.underlyingTokenUserBalance = IERC20(underlyingToken).balanceOf(user);
    data.stakeTokenUserBalance = stakeToken.balanceOf(user);
    data.userIncentivesToClaim = stakeToken.getTotalRewardsBalance(user);
    data.userCooldown = stakeToken.stakersCooldowns(user);
    data.userPermitNonce = isNonceAvailable ? IERC20WithNonce(underlyingToken)._nonces(user) : 0;

    return data;
  }

  function _getGeneralStakedAssetData(IStakedToken stakeToken)
    internal
    view
    returns (GeneralStakeUIData memory)
  {
    GeneralStakeUIData memory data;

    data.stakeTokenTotalSupply = stakeToken.totalSupply();
    data.stakeCooldownSeconds = stakeToken.COOLDOWN_SECONDS();
    data.stakeUnstakeWindow = stakeToken.UNSTAKE_WINDOW();
    data.rewardTokenPriceEth = PRICE_ORACLE.getAssetPrice(AAVE);
    data.distributionEnd = stakeToken.DISTRIBUTION_END();
    if (block.timestamp < data.distributionEnd) {
      data.distributionPerSecond = stakeToken.assets(address(stakeToken)).emissionPerSecond;
    }

    return data;
  }

  function _calculateApy(uint256 distributionPerSecond, uint256 stakeTokenTotalSupply)
    internal
    pure
    returns (uint256)
  {
    return (distributionPerSecond * SECONDS_PER_YEAR * APY_PRECISION) / stakeTokenTotalSupply;
  }

  function getStkAaveData(address user) public view override returns (AssetUIData memory) {
    AssetUIData memory data = _getUserAndGeneralStakedAssetData(STAKED_AAVE, AAVE, user, true);

    data.stakeTokenPriceEth = data.rewardTokenPriceEth;
    data.stakeApy = _calculateApy(data.distributionPerSecond, data.stakeTokenTotalSupply);
    return data;
  }

  function getStkGeneralAaveData() public view override returns (GeneralStakeUIData memory) {
    GeneralStakeUIData memory data = _getGeneralStakedAssetData(STAKED_AAVE);

    data.stakeTokenPriceEth = data.rewardTokenPriceEth;
    data.stakeApy = _calculateApy(data.distributionPerSecond, data.stakeTokenTotalSupply);
    return data;
  }

  function getStkUserAaveData(address user) public view override returns (UserStakeUIData memory) {
    UserStakeUIData memory data = _getUserStakedAssetData(STAKED_AAVE, AAVE, user, true);
    return data;
  }

  function getUserUIData(address user)
    external
    view
    override
    returns (AssetUIData memory, uint256)
  {
    return (getStkAaveData(user), USD_BASE / PRICE_ORACLE.getAssetPrice(MOCK_USD_ADDRESS));
  }

  function getGeneralStakeUIData()
    external
    view
    override
    returns (GeneralStakeUIData memory, uint256)
  {
    return (getStkGeneralAaveData(), USD_BASE / PRICE_ORACLE.getAssetPrice(MOCK_USD_ADDRESS));
  }

  function getUserStakeUIData(address user)
    external
    view
    override
    returns (UserStakeUIData memory, uint256)
  {
    return (getStkUserAaveData(user), USD_BASE / PRICE_ORACLE.getAssetPrice(MOCK_USD_ADDRESS));
  }
}
