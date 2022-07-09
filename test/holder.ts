import { BN, Spl, web3 } from '@project-serum/anchor'
import provider from './provider'
import { getOrCreateATA } from './utils'

const splToken = Spl.token()

export interface Holder {
  owner: web3.Keypair
  ata: web3.PublicKey[]
}

export const addHolder = async (
  assets: { mint: web3.PublicKey; amount?: BN }[],
): Promise<Holder> => {
  const owner = web3.Keypair.generate()
  const ata: web3.PublicKey[] = []

  const tx = new web3.Transaction().add(
    web3.SystemProgram.transfer({
      fromPubkey: provider.wallet.publicKey,
      lamports: web3.LAMPORTS_PER_SOL,
      toPubkey: owner.publicKey,
    }),
  )
  await provider.sendAndConfirm(tx)

  for (const asset of assets) {
    const { address: assetATA } = await getOrCreateATA(asset.mint, owner.publicKey)

    await splToken.methods
      .mintTo(asset.amount === undefined ? new BN(1000000) : asset.amount)
      .accounts({
        mint: asset.mint,
        to: assetATA,
        authority: provider.wallet.publicKey,
      })
      .rpc()

    ata.push(assetATA)
  }

  return {
    owner,
    ata,
  }
}
