use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Mint, Token, TokenAccount, Transfer},
};

use crate::{events::ClaimEvent, state::*};

#[derive(Accounts)]
pub struct Claim<'info> {
    /// Furnace account
    #[account(constraint = furnace.last_stoker == stoker.key())]
    pub furnace: Account<'info, Furnace>,

    /// CHECK: Furnace authority
    #[account(
        seeds = [b"furnace".as_ref(), furnace.key().as_ref()],
        bump = furnace.bump,
    )]
    pub furnace_authority: UncheckedAccount<'info>,

    /// Mint of reward
    pub reward_mint: Account<'info, Mint>,

    /// Vault for reward
    #[account(
        mut,
        seeds = [b"reward_vault".as_ref(), furnace.key().as_ref()],
        bump = furnace.reward_vault_bump,
    )]
    pub reward_vault: Account<'info, TokenAccount>,

    /// CHECK:
    pub stoker: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = reward_mint,
        associated_token::authority = stoker,
    )]
    pub stoker_reward_ata: Account<'info, TokenAccount>,

    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(address = token::ID)]
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
    pub clock: Sysvar<'info, Clock>,
}

impl<'info> Claim<'info> {
    fn transfer_context(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            Transfer {
                from: self.reward_vault.to_account_info(),
                to: self.stoker_reward_ata.to_account_info(),
                authority: self.furnace_authority.to_account_info(),
            },
        )
    }
}

pub fn claim_handler(ctx: Context<Claim>) -> Result<()> {
    let vault = &ctx.accounts.reward_vault;

    let seeds = &[
        b"furnace".as_ref(),
        &ctx.accounts.furnace.key().to_bytes()[..32],
        &[ctx.accounts.furnace.bump],
    ];
    token::transfer(
        ctx.accounts.transfer_context().with_signer(&[seeds]),
        vault.amount,
    )?;

    emit!(ClaimEvent {
        furnace: ctx.accounts.furnace.key(),
        stoker: ctx.accounts.stoker.key(),
    });

    Ok(())
}
