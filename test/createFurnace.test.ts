import { setProvider, web3, Program, Spl, workspace, BN } from '@project-serum/anchor'
import { Burner } from '../target/types/burner'
import provider from './provider'
import { createMint, getOrCreateATA } from './utils'

const splToken = Spl.token()
const program = workspace.Burner as Program<Burner>

describe('create furnace', () => {
  const payer = provider.wallet
  const rewardMint = web3.Keypair.generate()

  beforeAll(async () => {
    setProvider(provider)

    await createMint(rewardMint, payer.publicKey)

    const { address: rewardFrom } = await getOrCreateATA(rewardMint.publicKey, payer.publicKey)
    await splToken.methods
      .mintTo(new BN(1000))
      .accounts({
        mint: rewardMint.publicKey,
        to: rewardFrom,
        authority: payer.publicKey,
      })
      .rpc()
  })

  test('success', async () => {
    const furnace = web3.Keypair.generate()
    const { address: rewardFrom } = await getOrCreateATA(rewardMint.publicKey, payer.publicKey)

    const rewardVault = await web3.PublicKey.findProgramAddress(
      [Buffer.from('reward_vault'), furnace.publicKey.toBuffer()],
      program.programId,
    )

    const furnaceAuthority = await web3.PublicKey.findProgramAddress(
      [Buffer.from('furnace'), furnace.publicKey.toBuffer()],
      program.programId,
    )

    await program.methods
      .createFurnace(new BN(1000), new BN(10))
      .accounts({
        furnace: furnace.publicKey,
        furnaceAuthority: furnaceAuthority[0],
        rewardMint: rewardMint.publicKey,
        rewardVault: rewardVault[0],
        rewardFrom: rewardFrom,
      })
      .signers([furnace])
      .rpc()

    const furnaceAccount = await program.account.furnace.fetch(furnace.publicKey)
    const rewardVaultTokentAccount = await splToken.account.token.fetch(rewardVault[0])

    expect(furnaceAccount.rewardMint.equals(rewardMint.publicKey)).toBeTruthy()
    expect(rewardVaultTokentAccount.amount.eq(new BN(1000))).toBeTruthy()
  })
})
