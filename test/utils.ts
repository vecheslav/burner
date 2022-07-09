import { Spl, web3 } from '@project-serum/anchor'
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token'
import provider from './provider'

const splToken = Spl.token()

export const delay = (time: number) => new Promise((resolve) => setTimeout(resolve, time))

export const createMint = async (mint: web3.Keypair, authority: web3.PublicKey, decimals = 9) => {
  await splToken.methods
    .initializeMint(decimals, authority, null)
    .accounts({
      mint: mint.publicKey,
      rent: web3.SYSVAR_RENT_PUBKEY,
    })
    .signers([mint])
    .preInstructions([await splToken.account.mint.createInstruction(mint)])
    .rpc()
}

export const getOrCreateATA = async (mint: web3.PublicKey, owner: web3.PublicKey) => {
  const address = await getAssociatedTokenAddress(
    mint,
    owner,
    true,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  )

  try {
    const account = await splToken.account.token.fetch(address)

    return { address, account }
  } catch (err) {
    const ix = createAssociatedTokenAccountInstruction(
      provider.wallet.publicKey,
      address,
      owner,
      mint,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    )

    const tx = new web3.Transaction().add(ix)
    await provider.sendAndConfirm(tx)

    const account = await splToken.account.token.fetch(address)

    return { address, account }
  }
}
