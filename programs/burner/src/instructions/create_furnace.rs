use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::{events::CreateFurnaceEvent, state::*};

#[derive(Accounts)]
#[instruction(amount: u64, lifetime: u64)]
pub struct CreateFurnace<'info> {
    /// Furnace account
    #[account(
        init,
        payer = payer,
        space = Furnace::LEN
    )]
    pub furnace: Account<'info, Furnace>,

    /// CHECK: Furnace authority
    #[account(
        seeds = [b"furnace".as_ref(), furnace.key().as_ref()],
        bump,
    )]
    pub furnace_authority: UncheckedAccount<'info>,

    /// Mint of reward
    pub reward_mint: Account<'info, Mint>,

    /// Vault for reward
    #[account(
        init,
        seeds = [b"reward_vault".as_ref(), furnace.key().as_ref()],
        bump,
        payer = payer,
        token::mint = reward_mint,
        token::authority = furnace_authority,
    )]
    pub reward_vault: Account<'info, TokenAccount>,

    /// Mint of coal
    pub coal_mint: Account<'info, Mint>,

    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(mut)]
    pub reward_from: Account<'info, TokenAccount>,

    #[account(address = token::ID)]
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

impl<'info> CreateFurnace<'info> {
    fn transfer_context(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            Transfer {
                from: self.reward_from.to_account_info(),
                to: self.reward_vault.to_account_info(),
                authority: self.payer.to_account_info(),
            },
        )
    }
}

pub fn create_furnace_handler(
    ctx: Context<CreateFurnace>,
    amount: u64,
    lifetime: u64,
) -> Result<()> {
    let furnace = &mut ctx.accounts.furnace;
    let reward_mint = &ctx.accounts.reward_mint;
    let coal_mint = &ctx.accounts.coal_mint;

    furnace.initialize(
        *ctx.bumps.get("furnace_authority").unwrap(),
        *ctx.bumps.get("reward_vault").unwrap(),
        reward_mint.key(),
        coal_mint.key(),
        lifetime,
    );

    token::transfer(ctx.accounts.transfer_context(), amount)?;

    emit!(CreateFurnaceEvent {
        furnace: ctx.accounts.furnace.key(),
        amount,
    });

    Ok(())
}
