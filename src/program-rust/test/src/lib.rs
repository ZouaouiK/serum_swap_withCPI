use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program_error::ProgramError,
    pubkey::Pubkey,
};
use anchor_lang::prelude::*;
use anchor_spl::dex;
use anchor_spl::dex::serum_dex::instruction::SelfTradeBehavior;
use anchor_spl::dex::serum_dex::matching::{OrderType, Side as SerumSide};
use anchor_spl::dex::serum_dex::state::MarketState;
use anchor_spl::token;
use solana_program::declare_id;
use std::num::NonZeroU64;
/// Define the type of state stored in accounts
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct GreetingAccount {
    /// number of greetings
    pub counter: u32,
}
// Associated token account for Pubkey::default.
mod empty {
    use super::*;
    declare_id!("HJt8Tjdsc9ms9i4WCZEzhzr4oyf3ANcdzXrNdLPFqm3M");
}

#[derive(Accounts)]
pub struct Swap<'info> {
    pub market: MarketAccounts<'info>,
    #[account(signer)]
    pub authority: AccountInfo<'info>,
    #[account(mut, constraint = pc_wallet.key != &empty::ID)]
    pub pc_wallet: AccountInfo<'info>,
    // Programs.
    pub dex_program: AccountInfo<'info>,
    pub token_program: AccountInfo<'info>,
    // Sysvars.
    pub rent: AccountInfo<'info>,
}
// Market accounts are the accounts used to place orders against the dex minus
// common accounts, i.e., program ids, sysvars, and the `pc_wallet`.
#[derive(Accounts, Clone)]
pub struct MarketAccounts<'info> {
    #[account(mut)]
    pub market: AccountInfo<'info>,
    #[account(mut)]
    pub open_orders: AccountInfo<'info>,
    #[account(mut)]
    pub request_queue: AccountInfo<'info>,
    #[account(mut)]
    pub event_queue: AccountInfo<'info>,
    #[account(mut)]
    pub bids: AccountInfo<'info>,
    #[account(mut)]
    pub asks: AccountInfo<'info>,
    // The `spl_token::Account` that funds will be taken from, i.e., transferred
    // from the user into the market's vault.
    //
    // For bids, this is the base currency. For asks, the quote.
    #[account(mut, constraint = order_payer_token_account.key != &empty::ID)]
    pub order_payer_token_account: AccountInfo<'info>,
    // Also known as the "base" currency. For a given A/B market,
    // this is the vault for the A mint.
    #[account(mut)]
    pub coin_vault: AccountInfo<'info>,
    // Also known as the "quote" currency. For a given A/B market,
    // this is the vault for the B mint.
    #[account(mut)]
    pub pc_vault: AccountInfo<'info>,
    // PDA owner of the DEX's token accounts for base + quote currencies.
    pub vault_signer: AccountInfo<'info>,
    // User wallets.
    #[account(mut, constraint = coin_wallet.key != &empty::ID)]
    pub coin_wallet: AccountInfo<'info>,
}

// An exchange rate for swapping *from* one token *to* another.
#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct ExchangeRate {
    // The amount of *to* tokens one should receive for a single *from token.
    // This number must be in native *to* units with the same amount of decimals
    // as the *to* mint.
    pub rate: u64,
    // Number of decimals of the *from* token's mint.
    pub from_decimals: u8,
    // Number of decimals of the *to* token's mint.
    // For a direct swap, this should be zero.
    pub quote_decimals: u8,
    // True if *all* of the *from* currency sold should be used when calculating
    // the executed exchange rate.
    //
    // To perform a transitive swap, one sells on one market and buys on
    // another, where both markets are quoted in the same currency. Now suppose
    // one swaps A for B across A/USDC and B/USDC. Further suppose the first
    // leg swaps the entire *from* amount A for USDC, and then only half of
    // the USDC is used to swap for B on the second leg. How should we calculate
    // the exchange rate?
    //
    // If strict is true, then the exchange rate will be calculated as a direct
    // function of the A tokens lost and B tokens gained, ignoring the surplus
    // in USDC received. If strict is false, an effective exchange rate will be
    // used. I.e. the surplus in USDC will be marked at the exchange rate from
    // the second leg of the swap and that amount will be added to the
    // *to* mint received before calculating the swap's exchange rate.
    //
    // Transitive swaps only. For direct swaps, this field is ignored.
    pub strict: bool,
}
#[derive(AnchorSerialize, AnchorDeserialize)]
pub enum Side {
    Bid,
    Ask,
}
// Declare and export the program's entrypoint
entrypoint!(process_instruction);

// Program entrypoint's implementation
pub fn process_instruction(
    program_id: &Pubkey, // Public key of the account the hello world program was loaded into
    accounts: &[AccountInfo], // The account to say hello to
    _instruction_data: &[u8], // Ignored, all helloworld instructions are hello
) -> ProgramResult {

  /*   msg!("Hello World Rust program entrypoint");
    // Iterating accounts is safer than indexing
    let accounts_iter = &mut accounts.iter();
        // Get the account to say hello to
        msg!("1");
        let owner = next_account_info(accounts_iter)?;
        let token_program_id=next_account_info(accounts_iter)?;
        let program_address= next_account_info(accounts_iter)?;
        let create_account_program=next_account_info(accounts_iter)?;
        let program_id_swap=next_account_info(accounts_iter)?;
        let program_id_swap_info=program_id_swap.clone();
        let nonce=_instruction_data[0];
        msg!("2");
        let cpi_accounts=serum_swap::cpi::accounts::StructAccount{
            owner:owner.clone()
        };
        msg!("3");
        let expected_allocated_key =Pubkey::create_program_address(&[&create_account_program.key.to_bytes()[..32], &[nonce]], program_id)?;
        if *program_address.key != expected_allocated_key {
        // allocated key does not match the derived address
        return Err(ProgramError::InvalidArgument);
        }
        msg!("4");
        let seeds=&[&create_account_program.key.to_bytes()[..32], &[nonce]];
        let signer_seeds = &[&seeds[..]];
        msg!("5");
        let cpi_ctx = CpiContext::new_with_signer(program_id_swap_info, cpi_accounts,signer_seeds);
        msg!("6");
        serum_swap::cpi::hello(cpi_ctx);
        msg!("7");
        Ok(()) */


     msg!("Hello World Rust program entrypoint");

    // Iterating accounts is safer than indexing
    let accounts_iter = &mut accounts.iter();
    msg!("1");
    // Get the account to say hello to
    let market1 = next_account_info(accounts_iter)?;
    let request_queue = next_account_info(accounts_iter)?;
    let event_queue = next_account_info(accounts_iter)?;
    let bids = next_account_info(accounts_iter)?;
    let asks = next_account_info(accounts_iter)?;
    let coin_vault = next_account_info(accounts_iter)?;
    let pc_vault = next_account_info(accounts_iter)?;
    let vault_signer = next_account_info(accounts_iter)?;
    let open_orders = next_account_info(accounts_iter)?;
    let order_payer_token_account = next_account_info(accounts_iter)?;
    let coin_wallet = next_account_info(accounts_iter)?;
    let pc_wallet = next_account_info(accounts_iter)?;
    let authority = next_account_info(accounts_iter)?;
    let dex_program = next_account_info(accounts_iter)?;
    let token_program = next_account_info(accounts_iter)?;
    let swap_program_id= next_account_info(accounts_iter)?;
    let rent = next_account_info(accounts_iter)?;
    let program_address= next_account_info(accounts_iter)?;
    let create_account_program=next_account_info(accounts_iter)?;
    let program_id_swap_info=swap_program_id.clone();
    let amount:u64=_instruction_data[0].into();
    let nonce=_instruction_data[1];
    msg!("2");
    let expected_allocated_key =Pubkey::create_program_address(&[&create_account_program.key.to_bytes()[..32], &[nonce]], program_id)?;
        if *program_address.key != expected_allocated_key {
        // allocated key does not match the derived address
        return Err(ProgramError::InvalidArgument);
        }
        msg!("4");
        let seeds=&[&create_account_program.key.to_bytes()[..32], &[nonce]];
        let signer_seeds = &[&seeds[..]];
    let cpi_accounts=serum_swap::cpi::accounts::Swap{
        market:serum_swap::cpi::accounts::MarketAccounts{
            market:market1.clone(),
            open_orders:open_orders.clone(),
            request_queue:request_queue.clone(),
            event_queue:event_queue.clone(),
            bids:bids.clone(),
            asks:asks.clone(),
            order_payer_token_account:order_payer_token_account.clone(),
            coin_vault:coin_vault.clone(),
            pc_vault:pc_vault.clone(),
            vault_signer:vault_signer.clone(),
            coin_wallet:coin_wallet.clone()
        },
        authority:authority.clone(),
        pc_wallet:pc_wallet.clone(),
        dex_program:dex_program.clone(),
        token_program:token_program.clone(),
        rent:rent.clone()
    };
    msg!("3");
   
    msg!("4");
      let rate:u64 = 1;
      let from_decimals:u8 = 2;
      let quote_decimals:u8 = 2;
      let strict:bool=false;
      let min_exchange_rate=serum_swap::ExchangeRate{ rate, from_decimals, quote_decimals, strict };
let side=serum_swap::Side::Bid;
    msg!("8");
   // let cpi_ctx = CpiContext::new(program_id_swap_info cpi_accounts);
   let cpi_ctx = CpiContext::new(program_id_swap_info, cpi_accounts);
    msg!("5");
    
    serum_swap::cpi::swap(cpi_ctx,side,amount,min_exchange_rate);
    msg!("6");

    

    Ok(()) 
}

// Sanity tests
#[cfg(test)]
mod test {
    use super::*;
    use solana_program::clock::Epoch;
    use std::mem;

    #[test]
    fn test_sanity() {
        let program_id = Pubkey::default();
        let key = Pubkey::default();
        let mut lamports = 0;
        let mut data = vec![0; mem::size_of::<u32>()];
        let owner = Pubkey::default();
        let account = AccountInfo::new(
            &key,
            false,
            true,
            &mut lamports,
            &mut data,
            &owner,
            false,
            Epoch::default(),
        );
        let instruction_data: Vec<u8> = Vec::new();

        let accounts = vec![account];

        assert_eq!(
            GreetingAccount::try_from_slice(&accounts[0].data.borrow())
                .unwrap()
                .counter,
            0
        );
        process_instruction(&program_id, &accounts, &instruction_data).unwrap();
        assert_eq!(
            GreetingAccount::try_from_slice(&accounts[0].data.borrow())
                .unwrap()
                .counter,
            1
        );
        process_instruction(&program_id, &accounts, &instruction_data).unwrap();
        assert_eq!(
            GreetingAccount::try_from_slice(&accounts[0].data.borrow())
                .unwrap()
                .counter,
            2
        );
    }
}
