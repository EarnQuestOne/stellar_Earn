use soroban_sdk::{contracttype, Env, Symbol};

/// Categories of predefined quest templates
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum TemplateKind {
    CodeContribution,
    ContentCreation,
    BugReport,
    Translation,
    CommunitySupport,
}

/// A reusable quest template with sensible default parameters
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct QuestTemplate {
    /// Unique name identifier for the template
    pub name: Symbol,
    /// Template category
    pub kind: TemplateKind,
    /// Suggested reward amount per participant
    pub suggested_reward: i128,
    /// Suggested quest duration in seconds
    pub suggested_duration: u64,
    /// Suggested maximum number of participants
    pub suggested_max_participants: u32,
}

/// Return the default template configuration for a given kind
pub fn default_template(env: &Env, kind: TemplateKind) -> QuestTemplate {
    match kind {
        TemplateKind::CodeContribution => QuestTemplate {
            name: Symbol::new(env, "code_contrib"),
            kind: TemplateKind::CodeContribution,
            suggested_reward: 100,
            suggested_duration: 604_800,
            suggested_max_participants: 10,
        },
        TemplateKind::ContentCreation => QuestTemplate {
            name: Symbol::new(env, "content"),
            kind: TemplateKind::ContentCreation,
            suggested_reward: 50,
            suggested_duration: 259_200,
            suggested_max_participants: 20,
        },
        TemplateKind::BugReport => QuestTemplate {
            name: Symbol::new(env, "bug_report"),
            kind: TemplateKind::BugReport,
            suggested_reward: 200,
            suggested_duration: 86_400,
            suggested_max_participants: 5,
        },
        TemplateKind::Translation => QuestTemplate {
            name: Symbol::new(env, "translation"),
            kind: TemplateKind::Translation,
            suggested_reward: 30,
            suggested_duration: 432_000,
            suggested_max_participants: 50,
        },
        TemplateKind::CommunitySupport => QuestTemplate {
            name: Symbol::new(env, "community"),
            kind: TemplateKind::CommunitySupport,
            suggested_reward: 20,
            suggested_duration: 172_800,
            suggested_max_participants: 100,
        },
    }
}
