use anchor_lang::{prelude::*, solana_program::clock::Slot};

#[account]
pub struct Furnace {
    pub reward_mint: Pubkey,

    pub bump: u8,
    pub vault_bump: u8,

    pub interval: u64,
    pub last_burn: u64,

    pub last_stoker: Pubkey,
}

impl Furnace {
    pub const LEN: usize = 8 + (32 + 1 + 1 + 8 + 8 + 32);

    pub fn initialize(&mut self, interval: Slot, reward_mint: Pubkey, bump: u8, vault_bump: u8) {
        self.interval = interval;
        self.reward_mint = reward_mint;
        self.bump = bump;
        self.vault_bump = vault_bump;
    }

    pub fn burn(&mut self, stoker: Pubkey, slot: Slot) {
        self.last_stoker = stoker;
        self.last_burn = slot;
    }

    pub fn is_completed(&self, slot: Slot) -> bool {
        self.last_burn != 0 && self.last_burn + self.interval < slot
    }
}
