use soroban_sdk::contracterror;

#[contracterror(export = false)]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    // Quest Errors
    QstExists = 1,
    QstNotFd = 2,
    BadRwAmt = 3,
    QstActive = 4,
    QstFull = 5,
    BadPLimit = 6,
    BadQStat = 7,

    // Auth Errors
    Unauth = 10,
    UnauthV = 11,
    UnauthUp = 12,
    BadAdmin = 13,

    // Submission Errors
    BadSStat = 20,
    SubNotFd = 21,
    SubExists = 22,
    DupSub = 23,
    BadProof = 24,
    SubProc = 25,

    // Payout Errors
    NoBal = 30,
    XferFail = 31,
    Claimed = 32,
    BadAsset = 33,

    // Reputation Errors
    StatsNfd = 40,
    BadgeDup = 41,
    UserNf = 42,

    // Security / Emergency
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

    // Additional validation / escrow
    BadDline = 86,
    QstCncl = 87,
    NoEscBal = 88,
    BadEscAm = 89,

    // Initialization / Upgrade
    InitDup = 90,
    NoInit = 91,
    BadVer = 92,

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
}
