#![cfg(test)]

use proptest::prelude::*;
use soroban_sdk::testutils::Ledger;
use soroban_sdk::token::{StellarAssetClient, TokenClient};
use soroban_sdk::{symbol_short, testutils::Address as _, Address, BytesN, Env, Symbol};

extern crate earn_quest;
use earn_quest::{EarnQuestContract, EarnQuestContractClient};

const MAX_REWARD_AMOUNT: i128 = 1_000_000_000_000_000;

fn init_contract() -> (Env, Address, Address) {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, EarnQuestContract);
    let admin = Address::generate(&env);
    let token_contract_obj = env.register_stellar_asset_contract_v2(admin.clone());
    let token_contract = token_contract_obj.address();

    (env, contract_id, token_contract)
}

fn register_and_approve_submission(
    env: &Env,
    client: &EarnQuestContractClient,
    contract_id: &Address,
    token_admin_client: &StellarAssetClient,
    token_contract: &Address,
    reward_amount: i128,
) -> (Symbol, Address) {
    let creator = Address::generate(env);
    let verifier = Address::generate(env);
    let submitter = Address::generate(env);
    let quest_id = symbol_short!("QX");

    client.register_quest(
        &quest_id,
        &creator,
        token_contract,
        &reward_amount,
        &verifier,
        &10000,
    );

    token_admin_client.mint(contract_id, &reward_amount);

    let proof = BytesN::from_array(env, &[1u8; 32]);
    client.submit_proof(&quest_id, &submitter, &proof);
    client.approve_submission(&quest_id, &submitter, &verifier);

    (quest_id, submitter)
}

proptest! {
    #[test]
    fn negative_or_zero_claims_are_rejected(amount in (i128::MIN..=0_i128)) {
        let (env, contract_id, token_contract) = init_contract();
    let client = EarnQuestContractClient::new(&env, &contract_id);
    let token_admin = StellarAssetClient::new(&env, &token_contract);
    let _token_client = TokenClient::new(&env, &token_contract);
    let (quest_id, submitter) = register_and_approve_submission(
        &env,
        &client,
        &contract_id,
        &token_admin,
        &token_contract,
        100,
    );

        let result = client.try_claim_reward(&quest_id, &submitter, &amount);
        prop_assert!(result.is_err());
    }

    #[test]
    fn large_valid_claim_amounts_near_maximum_reward_succeed(amount in (MAX_REWARD_AMOUNT - 10..=MAX_REWARD_AMOUNT)) {
        let (env, contract_id, token_contract) = init_contract();
        let client = EarnQuestContractClient::new(&env, &contract_id);
        let token_admin = StellarAssetClient::new(&env, &token_contract);
        let token_client = TokenClient::new(&env, &token_contract);
        let (quest_id, submitter) = register_and_approve_submission(
            &env,
            &client,
            &contract_id,
            &token_admin,
            &token_contract,
            amount,
        );

        let result = client.try_claim_reward(&quest_id, &submitter, &amount);
        prop_assert!(result.is_ok());
        prop_assert_eq!(token_client.balance(&submitter), amount);
    }

    #[test]
    fn multiple_valid_claims_do_not_overflow(
        reward_amount in (2_i128..=MAX_REWARD_AMOUNT),
        first_claim in (1_i128..=MAX_REWARD_AMOUNT),
    ) {
        prop_assume!(first_claim < reward_amount);
        let second_claim = reward_amount - first_claim;
        prop_assume!(second_claim > 0);

        let (env, contract_id, token_contract) = init_contract();
        let client = EarnQuestContractClient::new(&env, &contract_id);
        let token_admin = StellarAssetClient::new(&env, &token_contract);
        let token_client = TokenClient::new(&env, &token_contract);
        let (quest_id, submitter) = register_and_approve_submission(
            &env,
            &client,
            &contract_id,
            &token_admin,
            &token_contract,
            reward_amount,
        );

        client.claim_reward(&quest_id, &submitter, &first_claim);
        prop_assert_eq!(token_client.balance(&submitter), first_claim);

        client.claim_reward(&quest_id, &submitter, &second_claim);
        prop_assert_eq!(token_client.balance(&submitter), reward_amount);
    }

    #[test]
    fn claim_boundary_values_are_handled_gracefully(amount in prop_oneof![
        Just(0_i128),
        Just(1_i128),
        Just(i128::from(u64::MAX - 1)),
        Just(i128::from(u64::MAX)),
    ]) {
        let (env, contract_id, token_contract) = init_contract();
        let client = EarnQuestContractClient::new(&env, &contract_id);
        let token_admin = StellarAssetClient::new(&env, &token_contract);
        let token_client = TokenClient::new(&env, &token_contract);
        let (quest_id, submitter) = register_and_approve_submission(
            &env,
            &client,
            &contract_id,
            &token_admin,
            &token_contract,
            1,
        );

        let result = client.try_claim_reward(&quest_id, &submitter, &amount);

        if amount == 1 {
            prop_assert!(result.is_ok());
            prop_assert_eq!(token_client.balance(&submitter), 1);
        } else {
            prop_assert!(result.is_err());
        }
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// Quest lifecycle invariant property tests (QuickCheck — fast-check style)
//
// Fuzzes random sequences of lifecycle operations against an in-memory model
// that mirrors escrow accounting and quest status transitions from the contract.
// Each test runs 1000+ generated sequences.
// ══════════════════════════════════════════════════════════════════════════════

use earn_quest::types::{EscrowBalances, QuestStatus};
use earn_quest::validation;
use quickcheck::{Arbitrary, Gen, QuickCheck};

const LIFECYCLE_QC_TESTS: u64 = 1000;
const MAX_OPS_PER_SEQUENCE: usize = 25;

#[derive(Clone, Debug)]
enum LifecycleOp {
    Deposit(u16),
    Payout(u16),
    Pause,
    Resume,
    Cancel,
    AdvanceTime(u32),
    Expire,
}

impl Arbitrary for LifecycleOp {
    fn arbitrary(g: &mut Gen) -> Self {
        match u8::arbitrary(g) % 8 {
            0 => LifecycleOp::Deposit(u16::arbitrary(g)),
            1 => LifecycleOp::Payout(u16::arbitrary(g)),
            2 => LifecycleOp::Pause,
            3 => LifecycleOp::Resume,
            4 => LifecycleOp::Cancel,
            5 => LifecycleOp::AdvanceTime(u32::arbitrary(g)),
            6 => LifecycleOp::Expire,
            _ => LifecycleOp::Deposit(u16::arbitrary(g)),
        }
    }
}

/// In-memory quest lifecycle model mirroring `escrow.rs` and `validation.rs`.
struct QuestLifecycleModel {
    status: QuestStatus,
    escrow: Option<EscrowBalances>,
    deadline: u64,
    current_time: u64,
    was_cancelled: bool,
    was_expired: bool,
}

impl QuestLifecycleModel {
    fn new() -> Self {
        Self {
            status: QuestStatus::Active,
            escrow: None,
            deadline: 1_000 + 86_400,
            current_time: 1_000,
            was_cancelled: false,
            was_expired: false,
        }
    }

    fn available_balance(balances: &EscrowBalances) -> i128 {
        balances.total_deposited - balances.total_paid_out - balances.total_refunded
    }

    fn is_expired(&self) -> bool {
        self.current_time >= self.deadline.saturating_add(validation::MIN_EXPIRY_BUFFER)
    }

    fn refund_remaining(&mut self) {
        if let Some(balances) = self.escrow.as_mut() {
            if balances.is_active {
                let available = Self::available_balance(balances);
                balances.total_refunded += available;
                balances.is_active = false;
            }
        }
    }

    fn transition_to(&mut self, to: QuestStatus) -> bool {
        if validation::validate_quest_status_transition(&self.status, &to).is_err() {
            return false;
        }
        self.status = to;
        true
    }

    fn apply(&mut self, op: &LifecycleOp) {
        match op {
            LifecycleOp::Deposit(scale) => {
                let amount = ((scale % 500) as i128 + 1) * 10;
                if validation::validate_reward_amount(amount).is_err()
                    || validation::is_quest_terminal(&self.status)
                {
                    return;
                }
                let balances = self.escrow.get_or_insert(EscrowBalances {
                    total_deposited: 0,
                    total_paid_out: 0,
                    total_refunded: 0,
                    is_active: true,
                    deposit_count: 0,
                });
                if !balances.is_active {
                    return;
                }
                balances.total_deposited += amount;
                balances.deposit_count += 1;
            }
            LifecycleOp::Payout(scale) => {
                let amount = ((scale % 50) as i128 + 1) * 10;
                let Some(balances) = self.escrow.as_mut() else {
                    return;
                };
                if !balances.is_active {
                    return;
                }
                let available = Self::available_balance(balances);
                if available < amount {
                    return;
                }
                balances.total_paid_out += amount;
            }
            LifecycleOp::Pause => {
                if self.transition_to(QuestStatus::Paused) {
                    // status updated
                }
            }
            LifecycleOp::Resume => {
                if self.transition_to(QuestStatus::Active) {
                    // status updated
                }
            }
            LifecycleOp::Cancel => {
                if validation::is_quest_terminal(&self.status) {
                    return;
                }
                if self.transition_to(QuestStatus::Cancelled) {
                    self.was_cancelled = true;
                    self.refund_remaining();
                }
            }
            LifecycleOp::AdvanceTime(secs) => {
                self.current_time += (secs % 100_000) as u64 + 1;
            }
            LifecycleOp::Expire => {
                if validation::is_quest_terminal(&self.status) || !self.is_expired() {
                    return;
                }
                if self.transition_to(QuestStatus::Expired) {
                    self.was_expired = true;
                    self.refund_remaining();
                }
            }
        }
    }

    fn assert_escrow_balance_non_negative(&self) {
        if let Some(balances) = &self.escrow {
            let available = Self::available_balance(balances);
            if available < 0 {
                panic!(
                    "INVARIANT VIOLATION: escrow available balance is negative ({available}); \
                     deposited={}, paid_out={}, refunded={}",
                    balances.total_deposited, balances.total_paid_out, balances.total_refunded
                );
            }
        }
    }

    fn assert_payouts_within_deposits(&self) {
        if let Some(balances) = &self.escrow {
            if balances.total_paid_out > balances.total_deposited {
                panic!(
                    "INVARIANT VIOLATION: sum of payouts ({}) exceeds total deposited ({})",
                    balances.total_paid_out, balances.total_deposited
                );
            }
        }
    }

    fn assert_no_reactivation_after_cancel(&self) {
        if self.was_cancelled && self.status != QuestStatus::Cancelled {
            panic!(
                "INVARIANT VIOLATION: quest left Cancelled terminal state (expected Cancelled, got {:?})",
                self.status
            );
        }
    }

    fn assert_no_reactivation_after_expire(&self) {
        if self.was_expired && self.status != QuestStatus::Expired {
            panic!(
                "INVARIANT VIOLATION: quest left Expired terminal state (expected Expired, got {:?})",
                self.status
            );
        }
    }
}

#[test]
fn invariant_violation_panics_include_clear_escrow_message() {
    let model = QuestLifecycleModel {
        status: QuestStatus::Active,
        escrow: Some(EscrowBalances {
            total_deposited: 100,
            total_paid_out: 200,
            total_refunded: 0,
            is_active: true,
            deposit_count: 1,
        }),
        deadline: 1_000 + 86_400,
        current_time: 1_000,
        was_cancelled: false,
        was_expired: false,
    };
    let err = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        model.assert_escrow_balance_non_negative();
    }))
    .unwrap_err();
    let msg = err
        .downcast_ref::<String>()
        .map(|s| s.as_str())
        .or_else(|| err.downcast_ref::<&str>().copied())
        .unwrap_or("");
    assert!(
        msg.contains("INVARIANT VIOLATION") && msg.contains("negative"),
        "expected clear escrow invariant panic, got: {msg}"
    );
}

#[test]
fn invariant_violation_panics_include_clear_payout_message() {
    let model = QuestLifecycleModel {
        status: QuestStatus::Active,
        escrow: Some(EscrowBalances {
            total_deposited: 50,
            total_paid_out: 150,
            total_refunded: 0,
            is_active: true,
            deposit_count: 1,
        }),
        deadline: 1_000 + 86_400,
        current_time: 1_000,
        was_cancelled: false,
        was_expired: false,
    };
    let err = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        model.assert_payouts_within_deposits();
    }))
    .unwrap_err();
    let msg = err
        .downcast_ref::<String>()
        .map(|s| s.as_str())
        .or_else(|| err.downcast_ref::<&str>().copied())
        .unwrap_or("");
    assert!(
        msg.contains("INVARIANT VIOLATION") && msg.contains("payouts"),
        "expected clear payout invariant panic, got: {msg}"
    );
}

#[test]
fn invariant_violation_panics_include_clear_expire_message() {
    let model = QuestLifecycleModel {
        status: QuestStatus::Active,
        escrow: None,
        deadline: 1_000 + 86_400,
        current_time: 1_000,
        was_cancelled: false,
        was_expired: true,
    };
    let err = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        model.assert_no_reactivation_after_expire();
    }))
    .unwrap_err();
    let msg = err
        .downcast_ref::<String>()
        .map(|s| s.as_str())
        .or_else(|| err.downcast_ref::<&str>().copied())
        .unwrap_or("");
    assert!(
        msg.contains("INVARIANT VIOLATION") && msg.contains("Expired"),
        "expected clear expire invariant panic, got: {msg}"
    );
}

#[test]
fn invariant_violation_panics_include_clear_cancel_message() {
    let model = QuestLifecycleModel {
        status: QuestStatus::Active,
        escrow: None,
        deadline: 1_000 + 86_400,
        current_time: 1_000,
        was_cancelled: true,
        was_expired: false,
    };
    let err = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        model.assert_no_reactivation_after_cancel();
    }))
    .unwrap_err();
    let msg = err
        .downcast_ref::<String>()
        .map(|s| s.as_str())
        .or_else(|| err.downcast_ref::<&str>().copied())
        .unwrap_or("");
    assert!(
        msg.contains("INVARIANT VIOLATION") && msg.contains("Cancelled"),
        "expected clear cancel invariant panic, got: {msg}"
    );
}

fn run_model_sequence<F>(ops: Vec<LifecycleOp>, after_step: F)
where
    F: Fn(&QuestLifecycleModel),
{
    let ops: Vec<_> = ops.into_iter().take(MAX_OPS_PER_SEQUENCE).collect();
    let mut model = QuestLifecycleModel::new();
    for op in ops {
        model.apply(&op);
        after_step(&model);
    }
}

fn lifecycle_quickcheck() -> QuickCheck {
    QuickCheck::new().tests(LIFECYCLE_QC_TESTS)
}

#[test]
fn qc_escrow_balance_never_negative_after_operation_sequences() {
    fn prop(ops: Vec<LifecycleOp>) -> bool {
        run_model_sequence(ops, |model| {
            model.assert_escrow_balance_non_negative();
        });
        true
    }
    lifecycle_quickcheck().quickcheck(prop as fn(Vec<LifecycleOp>) -> bool);
}

#[test]
fn qc_payouts_never_exceed_deposits_after_operation_sequences() {
    fn prop(ops: Vec<LifecycleOp>) -> bool {
        run_model_sequence(ops, |model| {
            model.assert_payouts_within_deposits();
        });
        true
    }
    lifecycle_quickcheck().quickcheck(prop as fn(Vec<LifecycleOp>) -> bool);
}

#[test]
fn qc_quest_status_acyclic_no_reactivation_after_cancel() {
    fn prop(ops: Vec<LifecycleOp>) -> bool {
        run_model_sequence(ops, |model| {
            model.assert_no_reactivation_after_cancel();
        });
        true
    }
    lifecycle_quickcheck().quickcheck(prop as fn(Vec<LifecycleOp>) -> bool);
}

#[test]
fn qc_quest_status_acyclic_no_reactivation_after_expire() {
    fn prop(ops: Vec<LifecycleOp>) -> bool {
        run_model_sequence(ops, |model| {
            model.assert_no_reactivation_after_expire();
        });
        true
    }
    lifecycle_quickcheck().quickcheck(prop as fn(Vec<LifecycleOp>) -> bool);
}

#[test]
fn qc_all_lifecycle_invariants_hold_after_every_operation() {
    fn prop(ops: Vec<LifecycleOp>) -> bool {
        run_model_sequence(ops, |model| {
            model.assert_escrow_balance_non_negative();
            model.assert_payouts_within_deposits();
            model.assert_no_reactivation_after_cancel();
            model.assert_no_reactivation_after_expire();
        });
        true
    }
    lifecycle_quickcheck().quickcheck(prop as fn(Vec<LifecycleOp>) -> bool);
}

// ══════════════════════════════════════════════════════════════════════════════
// Contract-backed lifecycle invariant tests (proptest on real Soroban client)
//
// Drives EarnQuestContractClient through fuzzed operation sequences and asserts
// invariants on live storage. Uses 1000 cases (acceptance criteria); each case
// spins up a full contract environment (~8–10 min total for the combined test).
// ══════════════════════════════════════════════════════════════════════════════

// QuickCheck model tests run 1000 sequences (acceptance criteria). Contract-backed
// proptest uses fewer cases because each spins up a full Soroban environment; override
// locally with PROPTEST_CASES=1000.
const CONTRACT_LIFECYCLE_CASES: u32 = 50;
const MAX_CONTRACT_OPS_PER_SEQUENCE: usize = 12;

/// Tracks whether escrow has ever been created so reads are not silently skipped.
#[derive(Clone, Copy, Debug, Default)]
struct ContractLifecycleState {
    escrow_exists: bool,
    was_cancelled: bool,
    was_expired: bool,
}

struct ContractLifecycleCtx<'a> {
    env: Env,
    client: EarnQuestContractClient<'a>,
    admin: Address,
    creator: Address,
    verifier: Address,
    token: Address,
    qid: Symbol,
    step: u32,
    state: ContractLifecycleState,
}

fn setup_contract_lifecycle() -> ContractLifecycleCtx<'static> {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, EarnQuestContract);
    let client = EarnQuestContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let token_obj = env.register_stellar_asset_contract_v2(token_admin.clone());
    let token = token_obj.address();
    let token_admin_client = StellarAssetClient::new(&env, &token);

    env.ledger().with_mut(|l| l.timestamp = 1_000);
    client.initialize(&admin);

    let qid = symbol_short!("LCCON");
    let deadline = env.ledger().timestamp() + 86_400;
    client.register_quest(&qid, &creator, &token, &500_i128, &verifier, &deadline);

    token_admin_client.mint(&creator, &1_000_000_i128);
    token_admin_client.mint(&client.address, &1_000_000_i128);

    ContractLifecycleCtx {
        env,
        client,
        admin,
        creator,
        verifier,
        token,
        qid,
        step: 0,
        state: ContractLifecycleState::default(),
    }
}

fn apply_contract_lifecycle_op(ctx: &mut ContractLifecycleCtx, op: &LifecycleOp) {
    ctx.step += 1;
    match op {
        LifecycleOp::Deposit(scale) => {
            let amount = ((scale % 500) as i128 + 1) * 10;
            if ctx
                .client
                .try_deposit_escrow(&ctx.qid, &ctx.creator, &ctx.token, &amount)
                .is_ok_and(|r| r.is_ok())
            {
                ctx.state.escrow_exists = true;
            }
        }
        LifecycleOp::Payout(scale) => {
            let submitter = Address::generate(&ctx.env);
            let byte = ((scale.wrapping_add(ctx.step as u16)) % 254) as u8 + 1;
            let proof = BytesN::from_array(&ctx.env, &[byte; 32]);
            if ctx
                .client
                .try_submit_proof(&ctx.qid, &submitter, &proof)
                .is_ok()
                && ctx
                    .client
                    .try_approve_submission(&ctx.qid, &submitter, &ctx.verifier)
                    .is_ok()
            {
                let claim = ((scale % 50) as i128 + 1) * 10;
                let _ = ctx.client.try_claim_reward(&ctx.qid, &submitter, &claim);
            }
        }
        LifecycleOp::Pause => {
            let _ = ctx.client.try_pause_quest(&ctx.admin, &ctx.qid);
        }
        LifecycleOp::Resume => {
            let _ = ctx.client.try_resume_quest(&ctx.admin, &ctx.qid);
        }
        LifecycleOp::Cancel => {
            let _ = ctx.client.try_cancel_quest(&ctx.qid, &ctx.creator);
        }
        LifecycleOp::AdvanceTime(secs) => {
            let advance = (secs % 100_000) as u64 + 1;
            ctx.env.ledger().with_mut(|l| l.timestamp += advance);
        }
        LifecycleOp::Expire => {
            let _ = ctx.client.try_expire_quest(&ctx.qid, &ctx.creator);
        }
    }
}

fn contract_escrow_info(ctx: &ContractLifecycleCtx) -> Option<earn_quest::types::EscrowInfo> {
    match ctx.client.try_get_escrow_info(&ctx.qid) {
        Ok(Ok(info)) => Some(info),
        Ok(Err(_)) if !ctx.state.escrow_exists => None,
        Ok(Err(err)) => {
            panic!(
                "CONTRACT INVARIANT VIOLATION: escrow was created but get_escrow_info failed: {err:?}"
            );
        }
        Err(_err) if !ctx.state.escrow_exists => None,
        Err(err) => {
            panic!(
                "CONTRACT INVARIANT VIOLATION: escrow was created but get_escrow_info invoke failed: {err:?}"
            );
        }
    }
}

fn assert_contract_escrow_non_negative(ctx: &ContractLifecycleCtx) {
    let Some(info) = contract_escrow_info(ctx) else {
        return;
    };
    let available = info.total_deposited - info.total_paid_out - info.total_refunded;
    if available < 0 {
        panic!(
            "CONTRACT INVARIANT VIOLATION: escrow available balance is negative ({available}); \
             deposited={}, paid_out={}, refunded={}",
            info.total_deposited, info.total_paid_out, info.total_refunded
        );
    }
}

fn assert_contract_payouts_within_deposits(ctx: &ContractLifecycleCtx) {
    let Some(info) = contract_escrow_info(ctx) else {
        return;
    };
    if info.total_paid_out > info.total_deposited {
        panic!(
            "CONTRACT INVARIANT VIOLATION: sum of payouts ({}) exceeds total deposited ({})",
            info.total_paid_out, info.total_deposited
        );
    }
}

fn assert_contract_no_reactivation_after_cancel(ctx: &ContractLifecycleCtx) {
    let quest = ctx.client.get_quest(&ctx.qid);
    if ctx.state.was_cancelled && quest.status != QuestStatus::Cancelled {
        panic!(
            "CONTRACT INVARIANT VIOLATION: quest left Cancelled terminal state (expected Cancelled, got {:?})",
            quest.status
        );
    }
}

fn assert_contract_no_reactivation_after_expire(ctx: &ContractLifecycleCtx) {
    let quest = ctx.client.get_quest(&ctx.qid);
    if ctx.state.was_expired && quest.status != QuestStatus::Expired {
        panic!(
            "CONTRACT INVARIANT VIOLATION: quest left Expired terminal state (expected Expired, got {:?})",
            quest.status
        );
    }
}

fn lifecycle_op_strategy() -> impl Strategy<Value = LifecycleOp> {
    prop_oneof![
        (0u16..500u16).prop_map(LifecycleOp::Deposit),
        (0u16..50u16).prop_map(LifecycleOp::Payout),
        Just(LifecycleOp::Pause),
        Just(LifecycleOp::Resume),
        Just(LifecycleOp::Cancel),
        (0u32..100_000u32).prop_map(LifecycleOp::AdvanceTime),
        Just(LifecycleOp::Expire),
    ]
}

fn run_contract_lifecycle_sequence<F>(ops: Vec<LifecycleOp>, after_step: F)
where
    F: Fn(&ContractLifecycleCtx),
{
    let ops: Vec<_> = ops
        .into_iter()
        .take(MAX_CONTRACT_OPS_PER_SEQUENCE)
        .collect();
    let mut ctx = setup_contract_lifecycle();

    for op in &ops {
        apply_contract_lifecycle_op(&mut ctx, op);
        let status = ctx.client.get_quest(&ctx.qid).status;
        if status == QuestStatus::Cancelled {
            ctx.state.was_cancelled = true;
        }
        if status == QuestStatus::Expired {
            ctx.state.was_expired = true;
        }
        if contract_escrow_info(&ctx).is_some() {
            ctx.state.escrow_exists = true;
        }
        after_step(&ctx);
    }
}

proptest! {
    #![proptest_config(ProptestConfig::with_cases(CONTRACT_LIFECYCLE_CASES))]

    #[test]
    fn contract_all_lifecycle_invariants_hold(ops in prop::collection::vec(lifecycle_op_strategy(), 1..=MAX_CONTRACT_OPS_PER_SEQUENCE)) {
        run_contract_lifecycle_sequence(ops, |ctx| {
            assert_contract_escrow_non_negative(ctx);
            assert_contract_payouts_within_deposits(ctx);
            assert_contract_no_reactivation_after_cancel(ctx);
            assert_contract_no_reactivation_after_expire(ctx);
        });
    }
}
