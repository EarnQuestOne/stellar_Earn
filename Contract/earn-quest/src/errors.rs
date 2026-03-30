use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    QuestAlreadyExists = 1,
    QuestNotFound = 2,
    QuestFull = 3,
    QuestExpired = 4,
    QuestNotActive = 5,
    InvalidRewardAmount = 6,
    InvalidParticipantLimit = 7,
    Unauthorized = 8,
    SubmissionNotFound = 9,
    SubmissionAlreadyExists = 10,
    InvalidSubmissionStatus = 11,
    UserStatsNotFound = 12,
    InvalidQuestStatus = 16,
    BadgeAlreadyGranted = 17,
    UserNotFound = 18,
    DuplicateSubmission = 19,
    InvalidProofHash = 20,
    UnauthorizedVerifier = 13,
    InvalidStatusTransition = 14,
    SubmissionAlreadyProcessed = 15,
    InvalidDeadline = 21,
    AlreadyInitialized = 22,
    NotInitialized = 23,
    InvalidAdmin = 24,
    UnauthorizedUpgrade = 25,
    InvalidVersionNumber = 26,
    InsufficientEscrow = 27,
    InvalidEscrowAmount = 28,
    QuestStillActive = 29,
    NoEscrowBalance = 30,
    QuestCancelled = 31,
    /// Contract is paused
    ContractPaused = 32,
    /// Pause state is invalid
    InvalidPauseState = 33,
    /// Address has already signed the pause
    AlreadySigned = 34,
    /// Emergency withdrawal is no longer allowed (grace period expired)
    EmergencyWindowClosed = 35,
    /// Cannot withdraw during active quest
    WithdrawalBlocked = 36,
    /// Not enough signatures for pause activation
    InsufficientSignatures = 37,
}
