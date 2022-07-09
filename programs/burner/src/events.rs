use anchor_lang::prelude::*;

#[event]
pub struct CreateFurnaceEvent {
    pub furnace: Pubkey,
    pub amount: u64,
}

#[event]
pub struct BurnEvent {
    pub furnace: Pubkey,
    pub stoker: Pubkey,
    pub slot: u64,
}

#[event]
pub struct ClaimEvent {
    pub furnace: Pubkey,
    pub stoker: Pubkey,
}
