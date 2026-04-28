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
    TlNotExp = 51,
    Apprvd = 52,
    NoApprv = 53,
    CPaused = 54,
    BadPause = 55,
    Signed = 56,
    EWinClsd = 57,
    WdrwBlk = 58,
    NoSigs = 59,

    // Validation Errors
    DlPast = 60,
    StrLong = 61,
    ArrLong = 62,
    BadTrans = 63,
    AmtBig = 64,
    BadAddr = 65,
    QstExp = 66,
    QstNoAct = 67,
    /// Deadline too soon.
    DlSoon = 68,
    /// Deadline too far.
    DlFar = 69,

    NoEscrow = 70,
    EscNf = 71,
    EscInact = 72,
    NoFunds = 73,
    QstNotTr = 74,
    TokMis = 75,
    MetaNf = 76,

    // Reentrancy
    Reent = 80,

    // Dispute Errors
    DspNf = 81,
    DspExist = 82,
    DspNPend = 83,
    DspNoAut = 84,
    DspResol = 85,
    DspNAppld = 86,
    DspAppld = 87,

    // Additional validation / escrow
    BadDline = 88,
    QstCncl = 89,
    NoEscBal = 90,
    BadEscAm = 91,

    // Initialization / Upgrade
    InitDup = 92,
    NoInit = 93,
    BadVer = 94,

    // Oracle
    OrInact = 100,
    NoOrData = 101,
    BadOrCfg = 102,
    OrRspMis = 103,
    OrStale = 104,
    BadOrDat = 105,
    OrLowCnf = 106,

    // Arithmetic
    Ovfl = 110,
    Undfl = 111,
    IndexOutOfBounds = 112,
    CommitmentNotFound = 113,
    InvalidCommitment = 114,
}

impl Error {
    pub const QuestAlreadyExists: Error = Error::QstExists;
    pub const QuestNotFound: Error = Error::QstNotFd;
    pub const InvalidRewardAmount: Error = Error::BadRwAmt;
    pub const QuestStillActive: Error = Error::QstActive;
    pub const QuestFull: Error = Error::QstFull;
    pub const InvalidParticipantLimit: Error = Error::BadPLimit;
    pub const InvalidQuestStatus: Error = Error::BadQStat;

    pub const Unauthorized: Error = Error::Unauth;
    pub const UnauthorizedVerifier: Error = Error::UnauthV;
    pub const UnauthorizedUpgrade: Error = Error::UnauthUp;
    pub const InvalidAdmin: Error = Error::BadAdmin;

    pub const InvalidSubmissionStatus: Error = Error::BadSStat;
    pub const SubmissionNotFound: Error = Error::SubNotFd;
    pub const SubmissionAlreadyExists: Error = Error::SubExists;
    pub const DuplicateSubmission: Error = Error::DupSub;
    pub const InvalidProofHash: Error = Error::BadProof;
    pub const SubmissionAlreadyProcessed: Error = Error::SubProc;
    pub const SubmissionProcessed: Error = Error::SubProc;

    pub const InsufficientBalance: Error = Error::NoBal;
    pub const TransferFailed: Error = Error::XferFail;
    pub const AlreadyClaimed: Error = Error::Claimed;
    pub const InvalidAsset: Error = Error::BadAsset;

    pub const UserStatsNotFound: Error = Error::StatsNfd;
    pub const BadgeAlreadyGranted: Error = Error::BadgeDup;
    pub const UserNotFound: Error = Error::UserNf;

    pub const TimelockNotExpired: Error = Error::TlNotExp;
    pub const AlreadyApproved: Error = Error::Apprvd;
    pub const InsufficientApprovals: Error = Error::NoApprv;
    pub const ContractPaused: Error = Error::CPaused;
    pub const InvalidPauseState: Error = Error::BadPause;
    pub const AlreadySigned: Error = Error::Signed;
    pub const EmergencyWindowClosed: Error = Error::EWinClsd;
    pub const WithdrawalBlocked: Error = Error::WdrwBlk;
    pub const InsufficientSignatures: Error = Error::NoSigs;

    pub const DeadlineInPast: Error = Error::DlPast;
    pub const StringTooLong: Error = Error::StrLong;
    pub const ArrayTooLong: Error = Error::ArrLong;
    pub const InvalidStatusTransition: Error = Error::BadTrans;
    pub const AmountTooLarge: Error = Error::AmtBig;
    pub const InvalidAddress: Error = Error::BadAddr;
    pub const QuestExpired: Error = Error::QstExp;
    pub const QuestNotActive: Error = Error::QstNoAct;
    pub const DeadlineTooSoon: Error = Error::DlSoon;
    pub const DeadlineTooFar: Error = Error::DlFar;

    pub const InsufficientEscrow: Error = Error::NoEscrow;
    pub const EscrowNotFound: Error = Error::EscNf;
    pub const EscrowInactive: Error = Error::EscInact;
    pub const NoFundsToWithdraw: Error = Error::NoFunds;
    pub const QuestNotTerminal: Error = Error::QstNotTr;
    pub const TokenMismatch: Error = Error::TokMis;
    pub const MetadataNotFound: Error = Error::MetaNf;

    pub const ReentrantCall: Error = Error::Reent;

    pub const DisputeNotFound: Error = Error::DspNf;
    pub const DisputeAlreadyExists: Error = Error::DspExist;
    pub const DisputeNotPending: Error = Error::DspNPend;
    pub const DisputeNotAuthorized: Error = Error::DspNoAut;
    pub const DisputeAlreadyResolved: Error = Error::DspResol;
    pub const DisputeNotResolved: Error = Error::DspResol;
    pub const DisputeNotAppealed: Error = Error::DspNAppld;
    pub const DisputeAlreadyAppealed: Error = Error::DspAppld;

    pub const InvalidDeadline: Error = Error::BadDline;
    pub const QuestCancelled: Error = Error::QstCncl;
    pub const NoEscrowBalance: Error = Error::NoEscBal;
    pub const InvalidEscrowAmount: Error = Error::BadEscAm;

    pub const AlreadyInitialized: Error = Error::InitDup;
    pub const NotInitialized: Error = Error::NoInit;
    pub const InvalidVersionNumber: Error = Error::BadVer;

    pub const OracleInactive: Error = Error::OrInact;
    pub const NoValidOracleData: Error = Error::NoOrData;
    pub const InvalidOracleConfig: Error = Error::BadOrCfg;
    pub const OracleRespMismatch: Error = Error::OrRspMis;
    pub const StaleOracleData: Error = Error::OrStale;
    pub const InvalidOracleData: Error = Error::BadOrDat;
    pub const LowOracleConfidence: Error = Error::OrLowCnf;

    pub const ArithmeticOverflow: Error = Error::Ovfl;
    pub const ArithmeticUnderflow: Error = Error::Undfl;
}
