use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    // Quest Errors
    QuestAlreadyExists = 1,
    QuestNotFound = 2,
    InvalidRewardAmount = 3,
    QuestStillActive = 4,
    
    // Auth Errors
    Unauthorized = 10,
    
    // Submission Errors
    InvalidSubmissionStatus = 20,
    SubmissionNotFound = 21,
    
    // Payout Errors
    InsufficientBalance = 30,
    TransferFailed = 31,
    AlreadyClaimed = 32,
    InvalidAsset = 33,
    
    // Reputation Errors
    UserStatsNotFound = 40,
}
