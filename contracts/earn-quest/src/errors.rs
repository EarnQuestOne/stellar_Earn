use soroban_sdk::contracterror;

/// Comprehensive error codes for the EarnQuest contract.
#[contracterror(export = false)]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    // ── Quest Errors ──
    /// Quest already exists with this ID.
    QuestAlreadyExists = 1,
    /// Quest not found.
    QuestNotFound = 2,
    /// Invalid reward amount (e.g., zero or negative).
    InvalidRewardAmount = 3,
    /// Quest is still active and cannot be deleted.
    QuestStillActive = 4,
    /// Quest has reached its participant limit.
    QuestFull = 5,
    /// Invalid participant limit specified.
    InvalidParticipantLimit = 6,
    /// Invalid quest status for the requested operation.
    InvalidQuestStatus = 7,

    // ── Auth Errors ──
    /// Caller is not authorized for this operation.
    Unauthorized = 10,
    /// Caller is not the authorized verifier.
    UnauthorizedVerifier = 11,
    /// Caller is not authorized for contract upgrades.
    UnauthorizedUpgrade = 12,
    /// Invalid administrator address.
    InvalidAdmin = 13,

    // ── Submission Errors ──
    /// Invalid submission status for the requested operation.
    InvalidSubmissionStatus = 20,
    /// Submission not found.
    SubmissionNotFound = 21,
    /// Submission already exists for this user/quest.
    SubmissionAlreadyExists = 22,
    /// Duplicate submission detected.
    DuplicateSubmission = 23,
    /// Invalid proof hash provided.
    InvalidProofHash = 24,
    /// Submission has already been processed.
    SubmissionAlreadyProcessed = 25,

    // ── Payout Errors ──
    /// Contract has insufficient balance for payout.
    InsufficientBalance = 30,
    /// Token transfer failed.
    TransferFailed = 31,
    /// Reward has already been claimed.
    AlreadyClaimed = 32,
    /// Invalid asset for reward.
    InvalidAsset = 33,

    // ── Reputation Errors ──
    /// User statistics not found.
    UserStatsNotFound = 40,
    /// Badge has already been granted to this user.
    BadgeAlreadyGranted = 41,
    /// User not found in system.
    UserNotFound = 42,

    // Security / Emergency
    /// Contract is currently paused.
    Paused = 50,
    TimelockNotExpired = 51,
    AlreadyApproved = 52,
    InsufficientApprovals = 53,
    ContractPaused = 54,
    InvalidPauseState = 55,
    AlreadySigned = 56,
    EmergencyWindowClosed = 57,
    WithdrawalBlocked = 58,
    InsufficientSignatures = 59,

    // Validation Errors
    DeadlineInPast = 60,
    StringTooLong = 61,
    ArrayTooLong = 62,
    InvalidStatusTransition = 63,
    AmountTooLarge = 64,
    InvalidAddress = 65,
    QuestExpired = 66,
    QuestNotActive = 67,
    /// Deadline too soon.
    DeadlineTooSoon = 68,
    /// Deadline too far.
    DeadlineTooFar = 69,

    InsufficientEscrow = 70,
    EscrowNotFound = 71,
    EscrowInactive = 72,
    NoFundsToWithdraw = 73,
    QuestNotTerminal = 74,
    TokenMismatch = 75,
    MetadataNotFound = 76,

    // Reentrancy
    ReentrantCall = 80,

    // Dispute Errors
    DisputeNotFound = 81,
    DisputeAlreadyExists = 82,
    DisputeNotPending = 83,
    DisputeNotAuthorized = 84,
    DisputeAlreadyResolved = 85,
    DisputeNotAppealed = 86,
    DisputeAlreadyAppealed = 87,
    DisputeNotResolved = 95,


    // Additional validation / escrow
    InvalidDeadline = 88,
    QuestCancelled = 89,
    NoEscrowBalance = 90,
    InvalidEscrowAmount = 91,

    // Initialization / Upgrade
    AlreadyInitialized = 92,
    NotInitialized = 93,
    InvalidVersionNumber = 94,

    // Oracle
    OracleInactive = 100,
    NoValidOracleData = 101,
    InvalidOracleConfig = 102,
    OracleRespMismatch = 103,
    StaleOracleData = 104,
    InvalidOracleData = 105,
    LowOracleConfidence = 106,

    // Arithmetic
    ArithmeticOverflow = 110,
    ArithmeticUnderflow = 111,
    IndexOutOfBounds = 112,
    CommitmentNotFound = 113,
    InvalidCommitment = 114,
}



