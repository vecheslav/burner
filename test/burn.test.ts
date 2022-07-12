import { setProvider, web3, Program, Spl, workspace, BN } from '@project-serum/anchor'
import { Burner } from '../target/types/burner'
import { addHolder, Holder } from './holder'
import provider from './provider'
import { createMint, getOrCreateATA } from './utils'

const splToken = Spl.token()
const program = workspace.Burner as Program<Burner>

describe('burn', () => {
  const payer = provider.wallet
  const rewardMint = web3.Keypair.generate()
  const coalMint = web3.Keypair.generate()
  const furnace = web3.Keypair.generate()

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
        coalMint: coalMint.publicKey,
        rewardMint: rewardMint.publicKey,
        rewardVault: rewardVault[0],
        rewardFrom: rewardFrom,
      })
      .signers([furnace])
      .rpc()

    stoker = await addHolder([{ mint: coalMint.publicKey, amount: 10 }])
  })

  test('fail: invalid coal mint', async () => {
    const fakeCoalMint = web3.Keypair.generate()
    await createMint(fakeCoalMint, payer.publicKey, 0)

    try {
      await program.methods
        .burn()
        .accounts({
          furnace: furnace.publicKey,
          coalMint: fakeCoalMint.publicKey,
          stoker: stoker.owner.publicKey,
          stokerCoalFrom: stoker.ata[0],
          clock: web3.SYSVAR_CLOCK_PUBKEY,
        })
        .signers([stoker.owner])
        .rpc()
      fail()
    } catch ({ error }) {
      expect(error.errorCode.code).toBe('ConstraintHasOne')
    }
  })

  test('success', async () => {
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

    const furnaceAccount = await program.account.furnace.fetch(furnace.publicKey)
    console.log(furnaceAccount)

    expect(furnaceAccount.lastStoker.equals(stoker.owner.publicKey)).toBeTruthy()
  })
})
