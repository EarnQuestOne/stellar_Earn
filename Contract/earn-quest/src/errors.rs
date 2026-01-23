use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    QuestAlreadyExists = 1,
    QuestNotFound = 2,
    InvalidRewardAmount = 3,
    Unauthorized = 4,
    InvalidQuestStatus = 5,
    SubmissionNotFound = 6,
    InvalidSubmissionStatus = 7,
    BadgeAlreadyGranted = 8,
    UserNotFound = 9,
    DuplicateSubmission = 10,
    QuestExpired = 11,
    InvalidProofHash = 12,
    UnauthorizedVerifier = 13,
    InvalidStatusTransition = 14,
    SubmissionAlreadyProcessed = 15,
}
