import { setProvider, web3, Program, Spl, workspace, BN } from '@project-serum/anchor'
import { Burner } from '../target/types/burner'
import { addHolder, Holder } from './holder'
import provider from './provider'
import { createMint, delay, getOrCreateATA } from './utils'

const splToken = Spl.token()
const program = workspace.Burner as Program<Burner>

describe('claim', () => {
  const payer = provider.wallet
  const rewardMint = web3.Keypair.generate()
  const coalMint = web3.Keypair.generate()
  const furnace = web3.Keypair.generate()

  let rewardVault
  let furnaceAuthority
  let stoker: Holder

  beforeAll(async () => {
    setProvider(provider)

    await createMint(rewardMint, payer.publicKey)
    await createMint(coalMint, payer.publicKey, 0)

    const { address: rewardFrom } = await getOrCreateATA(rewardMint.publicKey, payer.publicKey)
    await splToken.methods
      .mintTo(new BN(1000))
      .accounts({
        mint: rewardMint.publicKey,
        to: rewardFrom,
        authority: payer.publicKey,
      })
      .rpc()

    rewardVault = await web3.PublicKey.findProgramAddress(
      [Buffer.from('reward_vault'), furnace.publicKey.toBuffer()],
      program.programId,
    )

    furnaceAuthority = await web3.PublicKey.findProgramAddress(
      [Buffer.from('furnace'), furnace.publicKey.toBuffer()],
      program.programId,
    )

    await program.methods
      .createFurnace(new BN(1000), new BN(2))
      .accounts({
        furnace: furnace.publicKey,
        furnaceAuthority: furnaceAuthority[0],
        coalMint: coalMint.publicKey,
        rewardMint: rewardMint.publicKey,
        rewardVault: rewardVault[0],
        rewardFrom: rewardFrom,
      })
      .signers([furnace])
      .rpc()

    stoker = await addHolder([
      { mint: coalMint.publicKey, amount: 10 },
      { mint: rewardMint.publicKey, amount: 0 },
    ])

    await program.methods
      .burn()
      .accounts({
        furnace: furnace.publicKey,
        coalMint: coalMint.publicKey,
        stoker: stoker.owner.publicKey,
        stokerCoalFrom: stoker.ata[0],
        clock: web3.SYSVAR_CLOCK_PUBKEY,
      })
      .signers([stoker.owner])
      .rpc()
  })

  test('fail: not complained', async () => {
    try {
      await program.methods
        .claim()
        .accounts({
          furnace: furnace.publicKey,
          furnaceAuthority: furnaceAuthority[0],
          rewardMint: rewardMint.publicKey,
          rewardVault: rewardVault[0],
          stoker: stoker.owner.publicKey,
          stokerRewardAta: stoker.ata[1],
          clock: web3.SYSVAR_CLOCK_PUBKEY,
        })
        .rpc()
      fail()
    } catch ({ error }) {
      expect(error.errorCode.code).toBe('FurnaceNotCompleted')
    }
  })

  test('success', async () => {
    await delay(2000)

    await program.methods
      .claim()
      .accounts({
        furnace: furnace.publicKey,
        furnaceAuthority: furnaceAuthority[0],
        rewardMint: rewardMint.publicKey,
        rewardVault: rewardVault[0],
        stoker: stoker.owner.publicKey,
        stokerRewardAta: stoker.ata[1],
        clock: web3.SYSVAR_CLOCK_PUBKEY,
      })
      .rpc()

    const stokerRewardTokentAccount = await splToken.account.token.fetch(stoker.ata[1])
    expect(stokerRewardTokentAccount.amount.eq(new BN(1000))).toBeTruthy()
  })
})
