use anchor_lang::{prelude::*, solana_program::clock::Slot};

#[account]
pub struct Furnace {
    pub bump: u8,
    pub reward_vault_bump: u8,

    pub reward_mint: Pubkey,
    pub coal_mint: Pubkey,

    pub lifetime: u64,

    pub last_burn: u64,
    pub last_stoker: Pubkey,
}

impl Furnace {
    pub const LEN: usize = 8 + (1 + 1 + 32 + 32 + 8 + 8 + 32);

    pub fn initialize(
        &mut self,
        bump: u8,
        reward_vault_bump: u8,
        reward_mint: Pubkey,
        coal_mint: Pubkey,
        lifetime: Slot,
    ) {
        self.bump = bump;
        self.reward_vault_bump = reward_vault_bump;
        self.reward_mint = reward_mint;
        self.coal_mint = coal_mint;
        self.lifetime = lifetime;
    }

    pub fn burn(&mut self, stoker: Pubkey, slot: Slot) {
        self.last_stoker = stoker;
        self.last_burn = slot;
    }

    pub fn is_completed(&self, slot: Slot) -> bool {
        self.last_burn != 0 && self.last_burn + self.lifetime < slot
    }
}
