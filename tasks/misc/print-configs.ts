import { task } from "hardhat/config"
import { DRE, getDb } from "../../helpers/misc-utils"
import { eAstarNetwork, eContractid } from "../../helpers/types"
import { StakedTokenV2Rev3__factory } from "../../types"

task('print-configs', 'print configuration about staked token').setAction(
  async ({}, localBRE) => {
    await localBRE.run('set-dre')
    const network = localBRE.network.name as eAstarNetwork
    const signers = await DRE.ethers.getSigners();
    const account = signers[0] // if emissionManager, change this index of signers array
    const contractId = eContractid.StakedLay
    const contractAddress = (await getDb().get(`${contractId}.${network}`).value()).address

    console.log("--- Start Task ---")
    console.log(`target network: ${network}`)
    console.log(`target address: ${contractAddress}`)

    const instance = StakedTokenV2Rev3__factory.connect(
      contractAddress,
      account
    )

    console.log(`# ${contractId}`)
    console.log(`name ... ${await instance.name()}`)
    console.log(`symbol ... ${await instance.symbol()}`)
    console.log(`decimals ... ${await instance.decimals()}`)
    console.log(`REWARD_TOKEN ... ${await instance.REWARD_TOKEN()}`)
    console.log(`STAKED_TOKEN ... ${await instance.STAKED_TOKEN()}`)
    console.log(`totalSupply ... ${await instance.totalSupply()}`)
    console.log(`REWARDS_VAULT ... ${await instance.REWARDS_VAULT()}`)
    console.log(`EMISSION_MANAGER ... ${await instance.EMISSION_MANAGER()}`)
    console.log(`DISTRIBUTION_END ... ${await instance.DISTRIBUTION_END()}`)
    console.log(`COOLDOWN_SECONDS ... ${await instance.COOLDOWN_SECONDS()}`)
    console.log(`UNSTAKE_WINDOW ... ${await instance.UNSTAKE_WINDOW()}`)
    const asset = await instance.assets(contractAddress)
    console.log(`assets ... ${JSON.stringify({
      emissionPerSecond: asset.emissionPerSecond.toString(),
      index: asset.index.toString(),
      lastUpdateTimestamp: asset.lastUpdateTimestamp.toString()
    })}`)
    console.log("--- Finished Task ---")
  }
)