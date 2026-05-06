// =============================================================================
// GraphQL API Server — exposes indexed data via GraphQL
// =============================================================================

import express from 'express';
import cors from 'cors';
import { graphqlHTTP } from 'express-graphql';
import { GraphQLSchema, GraphQLObjectType, GraphQLString, GraphQLInt, GraphQLList, GraphQLNonNull } from 'graphql';
import { config } from '../config';
import { resolvers } from './resolvers';

// =============================================================================
// GraphQL Type Definitions
// =============================================================================

const QuestStatusType = new GraphQLObjectType({
  name: 'QuestStatus',
  fields: {
    Active: { type: GraphQLString },
    Paused: { type: GraphQLString },
    Completed: { type: GraphQLString },
    Expired: { type: GraphQLString },
    Cancelled: { type: GraphQLString },
  },
});

const QuestType = new GraphQLObjectType({
  name: 'Quest',
  fields: {
    id: { type: new GraphQLNonNull(GraphQLString) },
    creator: { type: new GraphQLNonNull(GraphQLString) },
    rewardAsset: { type: new GraphQLNonNull(GraphQLString) },
    rewardAmount: { type: new GraphQLNonNull(GraphQLString) },
    verifier: { type: new GraphQLNonNull(GraphQLString) },
    deadline: { type: new GraphQLNonNull(GraphQLString) },
    status: { type: new GraphQLNonNull(GraphQLString) },
    totalClaims: { type: new GraphQLNonNull(GraphQLInt) },
    createdAt: { type: GraphQLString },
    createdInLedger: { type: GraphQLInt },
  },
});

const SubmissionType = new GraphQLObjectType({
  name: 'Submission',
  fields: {
    id: { type: new GraphQLNonNull(GraphQLString) },
    questId: { type: new GraphQLNonNull(GraphQLString) },
    submitter: { type: new GraphQLNonNull(GraphQLString) },
    proofHash: { type: GraphQLString },
    status: { type: new GraphQLNonNull(GraphQLString) },
    timestamp: { type: GraphQLString },
    commitmentHash: { type: GraphQLString },
    revealed: { type: GraphQLInt },
  },
});

const EscrowType = new GraphQLObjectType({
  name: 'Escrow',
  fields: {
    id: { type: new GraphQLNonNull(GraphQLString) },
    questId: { type: new GraphQLNonNull(GraphQLString) },
    depositor: { type: GraphQLString },
    token: { type: GraphQLString },
    totalDeposited: { type: GraphQLString },
    totalPaidOut: { type: GraphQLString },
    totalRefunded: { type: GraphQLString },
    isActive: { type: GraphQLInt },
    depositCount: { type: GraphQLInt },
    createdAt: { type: GraphQLString },
  },
});

const DisputeType = new GraphQLObjectType({
  name: 'Dispute',
  fields: {
    id: { type: new GraphQLNonNull(GraphQLString) },
    questId: { type: new GraphQLNonNull(GraphQLString) },
    initiator: { type: GraphQLString },
    arbitrator: { type: GraphQLString },
    status: { type: GraphQLString },
    filedAt: { type: GraphQLString },
  },
});

const UserStatsType = new GraphQLObjectType({
  name: 'UserStats',
  fields: {
    id: { type: new GraphQLNonNull(GraphQLString) },
    xp: { type: GraphQLString },
    level: { type: GraphQLInt },
    questsCompleted: { type: GraphQLInt },
    badges: { type: new GraphQLList(GraphQLString) },
    totalSubmissions: { type: GraphQLInt },
    totalPayouts: { type: GraphQLInt },
    totalPayoutAmount: { type: GraphQLString },
  },
});

const UserAggregatesType = new GraphQLObjectType({
  name: 'UserAggregates',
  fields: {
    totalSubmissions: { type: GraphQLInt },
    totalApprovals: { type: GraphQLInt },
    totalClaims: { type: GraphQLInt },
    totalEarned: { type: GraphQLString },
    xp: { type: GraphQLString },
    level: { type: GraphQLInt },
  },
});

const PlatformAggregatesType = new GraphQLObjectType({
  name: 'PlatformAggregates',
  fields: {
    totalQuests: { type: GraphQLInt },
    totalSubmissions: { type: GraphQLInt },
    totalRewardsClaimed: { type: GraphQLInt },
    totalRewardsDistributed: { type: GraphQLString },
    totalActiveUsers: { type: GraphQLInt },
  },
});

const EventType = new GraphQLObjectType({
  name: 'Event',
  fields: {
    id: { type: GraphQLString },
    event_type: { type: GraphQLString },
    contract_id: { type: GraphQLString },
    topics: { type: GraphQLString },
    data: { type: GraphQLString },
    ledger: { type: GraphQLInt },
    ledger_timestamp: { type: GraphQLString },
    tx_hash: { type: GraphQLString },
  },
});

// =============================================================================
// Root Query
// =============================================================================

const RootQueryType = new GraphQLObjectType({
  name: 'Query',
  fields: {
    quest: {
      type: QuestType,
      args: { id: { type: new GraphQLNonNull(GraphQLString) } },
      resolve: resolvers.Query.quest,
    },
    quests: {
      type: new GraphQLList(QuestType),
      args: {
        creator: { type: GraphQLString },
        status: { type: GraphQLString },
        rewardAsset: { type: GraphQLString },
        first: { type: GraphQLInt, defaultValue: 10 },
        offset: { type: GraphQLInt, defaultValue: 0 },
      },
      resolve: (_: any, args: any) => {
        const filter: any = {};
        if (args.creator) filter.creator = args.creator;
        if (args.status) filter.status = args.status;
        if (args.rewardAsset) filter.rewardAsset = args.rewardAsset;
        return resolvers.Query.quests(_, { filter, first: args.first, offset: args.offset });
      },
    },
    questsByCreator: {
      type: new GraphQLList(QuestType),
      args: {
        creator: { type: new GraphQLNonNull(GraphQLString) },
        first: { type: GraphQLInt, defaultValue: 10 },
        offset: { type: GraphQLInt, defaultValue: 0 },
      },
      resolve: resolvers.Query.questsByCreator,
    },
    questsByStatus: {
      type: new GraphQLList(QuestType),
      args: {
        status: { type: new GraphQLNonNull(GraphQLString) },
        first: { type: GraphQLInt, defaultValue: 10 },
        offset: { type: GraphQLInt, defaultValue: 0 },
      },
      resolve: resolvers.Query.questsByStatus,
    },
    submission: {
      type: SubmissionType,
      args: { id: { type: new GraphQLNonNull(GraphQLString) } },
      resolve: resolvers.Query.submission,
    },
    submissionsByQuest: {
      type: new GraphQLList(SubmissionType),
      args: {
        questId: { type: new GraphQLNonNull(GraphQLString) },
        first: { type: GraphQLInt, defaultValue: 10 },
        offset: { type: GraphQLInt, defaultValue: 0 },
      },
      resolve: resolvers.Query.submissionsByQuest,
    },
    submissionsByUser: {
      type: new GraphQLList(SubmissionType),
      args: {
        submitter: { type: new GraphQLNonNull(GraphQLString) },
        first: { type: GraphQLInt, defaultValue: 10 },
        offset: { type: GraphQLInt, defaultValue: 0 },
      },
      resolve: resolvers.Query.submissionsByUser,
    },
    userStats: {
      type: UserStatsType,
      args: { id: { type: new GraphQLNonNull(GraphQLString) } },
      resolve: resolvers.Query.userStats,
    },
    userActivity: {
      type: UserAggregatesType,
      args: { address: { type: new GraphQLNonNull(GraphQLString) } },
      resolve: resolvers.Query.userActivity,
    },
    escrow: {
      type: EscrowType,
      args: { id: { type: new GraphQLNonNull(GraphQLString) } },
      resolve: resolvers.Query.escrow,
    },
    escrowByQuest: {
      type: EscrowType,
      args: { questId: { type: new GraphQLNonNull(GraphQLString) } },
      resolve: resolvers.Query.escrowByQuest,
    },
    disputesByQuest: {
      type: new GraphQLList(DisputeType),
      args: {
        questId: { type: new GraphQLNonNull(GraphQLString) },
        first: { type: GraphQLInt, defaultValue: 10 },
        offset: { type: GraphQLInt, defaultValue: 0 },
      },
      resolve: resolvers.Query.disputesByQuest,
    },
    events: {
      type: new GraphQLList(EventType),
      args: {
        eventType: { type: GraphQLString },
        first: { type: GraphQLInt, defaultValue: 10 },
        offset: { type: GraphQLInt, defaultValue: 0 },
      },
      resolve: (_: any, args: any) => resolvers.Query.events(_, { filter: { eventType: args.eventType }, first: args.first, offset: args.offset }),
    },
    platformStats: {
      type: PlatformAggregatesType,
      resolve: resolvers.Query.platformStats,
    },
  },
});

// =============================================================================
// Server Setup
// =============================================================================

const schema = new GraphQLSchema({
  query: RootQueryType,
});

export function createApiServer(): express.Application {
  const app = express();
  app.use(cors());
  app.use(
    '/graphql',
    graphqlHTTP({
      schema,
      graphiql: true,
    }),
  );

  // Health check endpoint
  app.get('/health', (_req: any, res: any) => {
    res.json({ status: 'ok', service: 'stellar-earn-subgraph' });
  });

  return app;
}

export function startApiServer(): void {
  const app = createApiServer();
  app.listen(config.apiPort, () => {
    console.log(`[API] GraphQL server running at http://localhost:${config.apiPort}/graphql`);
    console.log(`[API] GraphiQL playground at http://localhost:${config.apiPort}/graphql`);
  });
}
