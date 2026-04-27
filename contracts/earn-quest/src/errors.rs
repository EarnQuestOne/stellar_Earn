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

    // ── Security / Emergency ──
    /// Contract is currently paused.
    Paused = 50,
    /// Unpause timelock has not expired.
    TimelockNotExpired = 51,
    /// Operation already approved.
    AlreadyApproved = 52,
    /// Insufficient approvals for unpause.
    InsufficientApprovals = 53,
    /// Contract paused status error.
    ContractPaused = 54,
    /// Invalid pause state transition.
    InvalidPauseState = 55,
    /// Already signed by this admin.
    AlreadySigned = 56,
    /// Emergency operation window closed.
    EmergencyWindowClosed = 57,
    /// Withdrawal is currently blocked.
    WithdrawalBlocked = 58,
    /// Insufficient signatures for emergency action.
    InsufficientSignatures = 59,

    // ── Validation Errors ──
    /// Deadline is in the past.
    DeadlineInPast = 60,
    /// String parameter exceeds maximum length.
    StringTooLong = 61,
    /// Array parameter exceeds maximum length.
    ArrayTooLong = 62,
    /// Invalid status transition.
    InvalidStatusTransition = 63,
    /// Amount exceeds maximum allowed.
    AmountTooLarge = 64,
    /// Invalid address provided.
    InvalidAddress = 65,
    /// Quest has expired.
    QuestExpired = 66,
    /// Quest is not active.
    QuestNotActive = 67,
    /// Deadline is too soon.
    DeadlineTooSoon = 68,
    /// Deadline is too far in the future.
    DeadlineTooFar = 69,

    // ── Escrow Errors ──
    /// Insufficient funds in escrow.
    InsufficientEscrow = 70,
    /// Escrow record not found.
    EscrowNotFound = 71,
    /// Escrow is inactive.
    EscrowInactive = 72,
    /// No funds available to withdraw.
    NoFundsToWithdraw = 73,
    /// Quest is not in a terminal state (Completed/Expired/Cancelled).
    QuestNotTerminal = 74,
    /// Token mismatch between quest and escrow.
    TokenMismatch = 75,
    /// Metadata not found.
    MetadataNotFound = 76,

    // ── Reentrancy ──
    /// Reentrant call detected.
    ReentrantCall = 80,

    // ── Dispute Errors ──
    /// Dispute record not found.
    DisputeNotFound = 81,
    /// Dispute already exists for this submission.
    DisputeAlreadyExists = 82,
    /// Dispute is not in a pending state.
    DisputeNotPending = 83,
    /// Caller is not authorized to resolve this dispute.
    DisputeNotAuthorized = 84,
    /// Dispute has already been resolved.
    DisputeAlreadyResolved = 85,

    // ── Additional validation ──
    /// Invalid deadline timestamp.
    InvalidDeadline = 86,
    /// Quest has been cancelled.
    QuestCancelled = 87,
    /// Escrow balance is zero.
    NoEscrowBalance = 88,
    /// Invalid escrow amount.
    InvalidEscrowAmount = 89,

    // ── Initialization / Upgrade ──
    /// Contract is already initialized.
    AlreadyInitialized = 90,
    /// Contract is not initialized.
    NotInitialized = 91,
    /// Invalid version number for upgrade.
    InvalidVersionNumber = 92,

    // ── Oracle Errors ──
    /// Oracle is currently inactive.
    OracleInactive = 100,
    /// No valid data returned from oracle.
    NoValidOracleData = 101,
    /// Invalid oracle configuration.
    InvalidOracleConfig = 102,
    /// Mismatch in oracle response data.
    OracleRespMismatch = 103,
    /// Oracle data is stale.
    StaleOracleData = 104,
    /// Invalid data format from oracle.
    InvalidOracleData = 105,
    /// Oracle confidence score is too low.
    LowOracleConfidence = 106,
    /// Oracle already exists.
    OracleAlreadyExists = 107,
    /// Oracle not found.
    OracleNotFound = 108,

    // ── Arithmetic ──
    /// Arithmetic overflow.
    ArithmeticOverflow = 110,
    /// Arithmetic underflow.
    ArithmeticUnderflow = 111,

    // ── Commitment Errors ──
    /// Commitment not found for this submission.
    CommitmentNotFound = 120,
    /// Invalid commitment or salt.
    InvalidCommitment = 121,
}

impl Error {
    // Aliases kept for backward compatibility if needed, 
    // but preferred usage is the full name from the enum.
    pub const QstExists: Error = Error::QuestAlreadyExists;
    pub const QstNotFd: Error = Error::QuestNotFound;
    pub const BadRwAmt: Error = Error::InvalidRewardAmount;
    pub const QstActive: Error = Error::QuestStillActive;
    pub const QstFull: Error = Error::QuestFull;
    pub const BadPLimit: Error = Error::InvalidParticipantLimit;
    pub const BadQStat: Error = Error::InvalidQuestStatus;
    pub const Unauth: Error = Error::Unauthorized;
    pub const UnauthV: Error = Error::UnauthorizedVerifier;
    pub const UnauthUp: Error = Error::UnauthorizedUpgrade;
    pub const BadAdmin: Error = Error::InvalidAdmin;
    pub const BadSStat: Error = Error::InvalidSubmissionStatus;
    pub const SubNotFd: Error = Error::SubmissionNotFound;
    pub const SubExists: Error = Error::SubmissionAlreadyExists;
    pub const DupSub: Error = Error::DuplicateSubmission;
    pub const BadProof: Error = Error::InvalidProofHash;
    pub const SubProc: Error = Error::SubmissionAlreadyProcessed;
    pub const NoBal: Error = Error::InsufficientBalance;
    pub const XferFail: Error = Error::TransferFailed;
    pub const Claimed: Error = Error::AlreadyClaimed;
    pub const BadAsset: Error = Error::InvalidAsset;
    pub const StatsNfd: Error = Error::UserStatsNotFound;
    pub const BadgeDup: Error = Error::BadgeAlreadyGranted;
    pub const UserNf: Error = Error::UserNotFound;
    pub const TlNotExp: Error = Error::TimelockNotExpired;
    pub const Apprvd: Error = Error::AlreadyApproved;
    pub const NoApprv: Error = Error::InsufficientApprovals;
    pub const CPaused: Error = Error::ContractPaused;
    pub const BadPause: Error = Error::InvalidPauseState;
    pub const Signed: Error = Error::AlreadySigned;
    pub const EWinClsd: Error = Error::EmergencyWindowClosed;
    pub const WdrwBlk: Error = Error::WithdrawalBlocked;
    pub const NoSigs: Error = Error::InsufficientSignatures;
    pub const DlPast: Error = Error::DeadlineInPast;
    pub const StrLong: Error = Error::StringTooLong;
    pub const ArrLong: Error = Error::ArrayTooLong;
    pub const BadTrans: Error = Error::InvalidStatusTransition;
    pub const AmtBig: Error = Error::AmountTooLarge;
    pub const BadAddr: Error = Error::InvalidAddress;
    pub const QstExp: Error = Error::QuestExpired;
    pub const QstNoAct: Error = Error::QuestNotActive;
    pub const DlSoon: Error = Error::DeadlineTooSoon;
    pub const DlFar: Error = Error::DeadlineTooFar;
    pub const NoEscrow: Error = Error::InsufficientEscrow;
    pub const EscNf: Error = Error::EscrowNotFound;
    pub const EscInact: Error = Error::EscrowInactive;
    pub const NoFunds: Error = Error::NoFundsToWithdraw;
    pub const QstNotTr: Error = Error::QuestNotTerminal;
    pub const TokMis: Error = Error::TokenMismatch;
    pub const MetaNf: Error = Error::MetadataNotFound;
    pub const Reent: Error = Error::ReentrantCall;
    pub const DspNf: Error = Error::DisputeNotFound;
    pub const DspExist: Error = Error::DisputeAlreadyExists;
    pub const DspNPend: Error = Error::DisputeNotPending;
    pub const DspNoAut: Error = Error::DisputeNotAuthorized;
    pub const DspResol: Error = Error::DisputeAlreadyResolved;
    pub const BadDline: Error = Error::InvalidDeadline;
    pub const QstCncl: Error = Error::QuestCancelled;
    pub const NoEscBal: Error = Error::NoEscrowBalance;
    pub const BadEscAm: Error = Error::InvalidEscrowAmount;
    pub const InitDup: Error = Error::AlreadyInitialized;
    pub const NoInit: Error = Error::NotInitialized;
    pub const BadVer: Error = Error::InvalidVersionNumber;
    pub const OrInact: Error = Error::OracleInactive;
    pub const NoOrData: Error = Error::NoValidOracleData;
    pub const BadOrCfg: Error = Error::InvalidOracleConfig;
    pub const OrRspMis: Error = Error::OracleRespMismatch;
    pub const OrStale: Error = Error::StaleOracleData;
    pub const BadOrDat: Error = Error::InvalidOracleData;
    pub const OrLowCnf: Error = Error::LowOracleConfidence;
    pub const Ovfl: Error = Error::ArithmeticOverflow;
    pub const Undfl: Error = Error::ArithmeticUnderflow;
}
