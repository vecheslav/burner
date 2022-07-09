use anchor_lang::{prelude::*, solana_program::clock::Slot};

pub mod events;
pub mod instructions;
pub mod state;

use instructions::*;
use state::*;

declare_id!("98ZZksmcbtKXafBzaRLzSrVWgvWZgkVkppr4P8cGrAXm");

#[program]
pub mod burner {
    use super::*;

    pub fn create_furnace(ctx: Context<CreateFurnace>, amount: u64, interval: u64) -> Result<()> {
        create_furnace_handler(ctx, amount, interval)
    }

    #[access_control(not_completed(&ctx.accounts.furnace, ctx.accounts.clock.slot))]
    pub fn burn(ctx: Context<Burn>) -> Result<()> {
        burn_handler(ctx)
    }

    #[access_control(completed(&ctx.accounts.furnace, ctx.accounts.clock.slot))]
    pub fn claim(ctx: Context<Claim>) -> Result<()> {
        claim_handler(ctx)
    }
}

#[error_code]
pub enum BurnerError {
    #[msg("You are not authorized to perform this action")]
    Unauthorized,

    #[msg("Furnace is already completed")]
    FurnaceCompleted,

    #[msg("Furnace is not completed")]
    FurnaceNotCompleted,
}

fn not_completed(furnace: &Furnace, slot: Slot) -> Result<()> {
    if furnace.is_completed(slot) {
        return err!(BurnerError::FurnaceCompleted);
    }

    Ok(())
}

fn completed(furnace: &Furnace, slot: Slot) -> Result<()> {
    if !furnace.is_completed(slot) {
        return err!(BurnerError::FurnaceNotCompleted);
    }

    Ok(())
}
