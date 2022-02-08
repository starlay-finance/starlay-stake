[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Build pass](https://github.com/starlay-finance/starlay-stake/actions/workflows/node.js.yml/badge.svg)](https://github.com/starlay-finance/starlay-stake/actions/workflows/node.js.yml)
[![codecov](https://codecov.io/gh/starlay-finance/starlay-stake/branch/master/graph/badge.svg?token=0rtEtFEtgN)](https://codecov.io/gh/starlay-finance/starlay-stake/)

## About Development

### Setup

set specified node version
reference: `.node-version`

create `.env` file like

```env
# Mnemonic, only first address will be used
MNEMONIC=""

# Add Alchemy or Infura provider keys, alchemy takes preference at the config level
ALCHEMY_KEY=""
INFURA_KEY=""
BWARE_LABS_KEY=""

# Optional Etherscan key, for automatize the verification of the contracts at Etherscan
ETHERSCAN_KEY=""

# Optional, if you plan to use Tenderly scripts
TENDERLY_PROJECT=""
TENDERLY_USERNAME=""
```

### Deploy

```bash
npm install
npm run compile
docker-compose up
# --- other terminal ---
docker-compose exec contracts-env bash
npm run shibuya:deployment
```
