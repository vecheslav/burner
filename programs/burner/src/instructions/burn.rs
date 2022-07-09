use anchor_lang::prelude::*;
use anchor_spl::token::{self, Burn as TokenBurn, Mint, Token, TokenAccount};

use crate::{events::BurnEvent, state::*};

#[derive(Accounts)]
pub struct Burn<'info> {
    /// Furnace account
    #[account(mut)]
    pub furnace: Account<'info, Furnace>,

    /// Mint of coal
    #[account(mut)]
    pub coal_mint: Account<'info, Mint>,

    #[account(mut)]
    pub stoker: Signer<'info>,

    #[account(mut)]
    pub stoker_coal_from: Account<'info, TokenAccount>,

    #[account(address = token::ID)]
    pub token_program: Program<'info, Token>,
    pub clock: Sysvar<'info, Clock>,
}

impl<'info> Burn<'info> {
    fn burn_context(&self) -> CpiContext<'_, '_, '_, 'info, TokenBurn<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            TokenBurn {
                mint: self.coal_mint.to_account_info(),
                from: self.stoker_coal_from.to_account_info(),
                authority: self.stoker.to_account_info(),
            },
        )
    }
}

pub fn burn_handler(ctx: Context<Burn>) -> Result<()> {
    let furnace = &mut ctx.accounts.furnace;
    let stoker = &ctx.accounts.stoker;
    let clock = &ctx.accounts.clock;

    furnace.burn(stoker.key(), clock.slot);

    // Burn just one coal, cuz of the furnace is not rubber
    token::burn(ctx.accounts.burn_context(), 1)?;

    emit!(BurnEvent {
        furnace: ctx.accounts.furnace.key(),
        stoker: ctx.accounts.stoker.key(),
        slot: clock.slot,
    });

    Ok(())
}
