use anchor_lang::prelude::*;

declare_id!("6cZmF2RJSN2KmYvCDLeiqMZvUFwasjpYY5anBhENnKPR");

#[program]
pub mod orakick {
    use super::*;

    pub fn create_match(
        ctx: Context<CreateMatch>,
        match_id: u64,
        team_a: String,
        team_b: String,
        kickoff_time: i64,
    ) -> Result<()> {
        let market = &mut ctx.accounts.match_market;
        market.authority = ctx.accounts.authority.key();
        market.match_id = match_id;
        market.team_a = team_a;
        market.team_b = team_b;
        market.kickoff_time = kickoff_time;
        market.status = MatchStatus::Open;
        market.total_pool = 0;
        market.result = None;
        market.final_score_a = 0;
        market.final_score_b = 0;
        market.bump = ctx.bumps.match_market;
        Ok(())
    }

    pub fn place_prediction(
        ctx: Context<PlacePrediction>,
        prediction_type: PredictionType,
        amount: u64,
    ) -> Result<()> {
        require!(amount > 0, OrakickError::InvalidAmount);
        let market = &ctx.accounts.match_market;
        require!(market.status == MatchStatus::Open, OrakickError::MarketClosed);

        let clock = Clock::get()?;
        require!(clock.unix_timestamp < market.kickoff_time, OrakickError::MatchStarted);

        // Transfer USDC from user to vault
        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            anchor_spl::token::Transfer {
                from: ctx.accounts.user_token_account.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        );
        anchor_spl::token::transfer(cpi_ctx, amount)?;

        // Record prediction
        let prediction = &mut ctx.accounts.prediction;
        prediction.user = ctx.accounts.user.key();
        prediction.match_market = ctx.accounts.match_market.key();
        prediction.prediction_type = prediction_type;
        prediction.amount = amount;
        prediction.claimed = false;
        prediction.bump = ctx.bumps.prediction;

        // Update pool
        let market = &mut ctx.accounts.match_market;
        market.total_pool = market.total_pool.checked_add(amount).unwrap();

        Ok(())
    }

    pub fn resolve_match(
        ctx: Context<ResolveMatch>,
        score_a: u8,
        score_b: u8,
    ) -> Result<()> {
        let market = &mut ctx.accounts.match_market;
        require!(market.status == MatchStatus::Open, OrakickError::MarketClosed);
        require!(
            ctx.accounts.authority.key() == market.authority,
            OrakickError::Unauthorized
        );

        market.final_score_a = score_a;
        market.final_score_b = score_b;
        market.status = MatchStatus::Resolved;

        // Determine match result
        if score_a > score_b {
            market.result = Some(MatchResult::TeamAWin);
        } else if score_b > score_a {
            market.result = Some(MatchResult::TeamBWin);
        } else {
            market.result = Some(MatchResult::Draw);
        }

        Ok(())
    }

    pub fn claim_winnings(ctx: Context<ClaimWinnings>) -> Result<()> {
        let prediction = &ctx.accounts.prediction;
        let market = &ctx.accounts.match_market;

        require!(market.status == MatchStatus::Resolved, OrakickError::MarketNotResolved);
        require!(!prediction.claimed, OrakickError::AlreadyClaimed);

        let is_winner = match &prediction.prediction_type {
            PredictionType::MatchWinner { outcome } => {
                market.result.as_ref() == Some(outcome)
            }
            PredictionType::OverUnder { total_goals, over } => {
                let actual_total = market.final_score_a as u16 + market.final_score_b as u16;
                if *over {
                    actual_total > *total_goals as u16
                } else {
                    actual_total < *total_goals as u16
                }
            }
            PredictionType::CorrectScore { score_a, score_b } => {
                *score_a == market.final_score_a && *score_b == market.final_score_b
            }
        };

        require!(is_winner, OrakickError::PredictionLost);

        // Calculate payout (winner takes proportional share of pool)
        // For simplicity: winner gets 2x their bet (capped at pool)
        let payout = prediction.amount.checked_mul(2).unwrap().min(market.total_pool);

        // Transfer from vault to user
        let match_id_bytes = market.match_id.to_le_bytes();
        let seeds = &[
            b"match_market",
            match_id_bytes.as_ref(),
            &[market.bump],
        ];
        let signer_seeds = &[&seeds[..]];

        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            anchor_spl::token::Transfer {
                from: ctx.accounts.vault.to_account_info(),
                to: ctx.accounts.user_token_account.to_account_info(),
                authority: ctx.accounts.match_market.to_account_info(),
            },
            signer_seeds,
        );
        anchor_spl::token::transfer(cpi_ctx, payout)?;

        // Mark as claimed
        let prediction = &mut ctx.accounts.prediction;
        prediction.claimed = true;

        Ok(())
    }
}

// === Accounts ===

#[derive(Accounts)]
#[instruction(match_id: u64)]
pub struct CreateMatch<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = 8 + MatchMarket::INIT_SPACE,
        seeds = [b"match_market", match_id.to_le_bytes().as_ref()],
        bump
    )]
    pub match_market: Account<'info, MatchMarket>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PlacePrediction<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mut)]
    pub match_market: Account<'info, MatchMarket>,

    #[account(
        init,
        payer = user,
        space = 8 + Prediction::INIT_SPACE,
        seeds = [b"prediction", match_market.key().as_ref(), user.key().as_ref()],
        bump
    )]
    pub prediction: Account<'info, Prediction>,

    #[account(mut)]
    pub user_token_account: Account<'info, anchor_spl::token::TokenAccount>,

    #[account(mut)]
    pub vault: Account<'info, anchor_spl::token::TokenAccount>,

    pub token_program: Program<'info, anchor_spl::token::Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ResolveMatch<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(mut)]
    pub match_market: Account<'info, MatchMarket>,
}

#[derive(Accounts)]
pub struct ClaimWinnings<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mut)]
    pub match_market: Account<'info, MatchMarket>,

    #[account(
        mut,
        seeds = [b"prediction", match_market.key().as_ref(), user.key().as_ref()],
        bump = prediction.bump
    )]
    pub prediction: Account<'info, Prediction>,

    #[account(mut)]
    pub user_token_account: Account<'info, anchor_spl::token::TokenAccount>,

    #[account(mut)]
    pub vault: Account<'info, anchor_spl::token::TokenAccount>,

    pub token_program: Program<'info, anchor_spl::token::Token>,
}

// === State ===

#[account]
#[derive(InitSpace)]
pub struct MatchMarket {
    pub authority: Pubkey,
    pub match_id: u64,
    #[max_len(32)]
    pub team_a: String,
    #[max_len(32)]
    pub team_b: String,
    pub kickoff_time: i64,
    pub status: MatchStatus,
    pub total_pool: u64,
    pub result: Option<MatchResult>,
    pub final_score_a: u8,
    pub final_score_b: u8,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Prediction {
    pub user: Pubkey,
    pub match_market: Pubkey,
    pub prediction_type: PredictionType,
    pub amount: u64,
    pub claimed: bool,
    pub bump: u8,
}

// === Enums ===

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum MatchStatus {
    Open,
    Resolved,
    Cancelled,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum MatchResult {
    TeamAWin,
    TeamBWin,
    Draw,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum PredictionType {
    MatchWinner { outcome: MatchResult },
    OverUnder { total_goals: u8, over: bool },
    CorrectScore { score_a: u8, score_b: u8 },
}

// === Errors ===

#[error_code]
pub enum OrakickError {
    #[msg("Invalid prediction amount")]
    InvalidAmount,
    #[msg("Market is closed")]
    MarketClosed,
    #[msg("Match has already started")]
    MatchStarted,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Market not resolved yet")]
    MarketNotResolved,
    #[msg("Winnings already claimed")]
    AlreadyClaimed,
    #[msg("Prediction lost")]
    PredictionLost,
}
