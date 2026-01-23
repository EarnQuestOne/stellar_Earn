import { Injectable, Logger } from '@nestjs/common';
import { WebhookEvent } from '../webhooks.service';

@Injectable()
export class GithubHandler {
  private readonly logger = new Logger(GithubHandler.name);

  async handleEvent(event: WebhookEvent): Promise<any> {
    try {
      this.logger.log(`Handling GitHub webhook event: ${event.type}`);
      
      // Parse GitHub event payload
      const payload = typeof event.payload === 'string' 
        ? JSON.parse(event.payload) 
        : event.payload;

      // Handle different GitHub event types
      switch (event.type.toLowerCase()) {
        case 'push':
          return await this.handlePushEvent(payload, event.id);
        case 'pull_request':
          return await this.handlePullRequestEvent(payload, event.id);
        case 'issues':
          return await this.handleIssuesEvent(payload, event.id);
        default:
          this.logger.log(`Unhandled GitHub event type: ${event.type}`);
          return { status: 'ignored', eventType: event.type };
      }
    } catch (error) {
      this.logger.error(`Error handling GitHub event ${event.id}:`, error.stack);
      throw error;
    }
  }

  private async handlePushEvent(payload: any, eventId: string): Promise<any> {
    this.logger.log(`Processing push event ${eventId} for repository ${payload.repository?.full_name}`);
    
    // Extract relevant information
    const repoName = payload.repository?.full_name;
    const branch = payload.ref?.replace('refs/heads/', '');
    const commits = payload.commits || [];
    const sender = payload.sender?.login;

    // In a real implementation, you would:
    // 1. Validate the repository against allowed repos
    // 2. Check if this push meets verification criteria
    // 3. Trigger automated approval if valid
    // 4. Update submission status in database

    return {
      status: 'processed',
      eventType: 'push',
      repository: repoName,
      branch: branch,
      commitCount: commits.length,
      sender: sender,
      approved: true, // Simplified - in reality would depend on business logic
    };
  }

  private async handlePullRequestEvent(payload: any, eventId: string): Promise<any> {
    this.logger.log(`Processing pull request event ${eventId} for PR #${payload.pull_request?.number}`);
    
    const action = payload.action;
    const prNumber = payload.pull_request?.number;
    const repoName = payload.repository?.full_name;
    const author = payload.pull_request?.user?.login;

    // Handle different PR actions
    switch (action) {
      case 'opened':
      case 'reopened':
        return {
          status: 'processed',
          eventType: 'pull_request_opened',
          prNumber: prNumber,
          repository: repoName,
          author: author,
          action: action,
          approved: false, // PR opened, awaiting review/approval
        };
      case 'closed':
        const merged = payload.pull_request?.merged;
        return {
          status: 'processed',
          eventType: 'pull_request_closed',
          prNumber: prNumber,
          repository: repoName,
          author: author,
          merged: merged,
          approved: merged, // Auto-approve if merged
        };
      default:
        return {
          status: 'ignored',
          eventType: 'pull_request',
          action: action,
        };
    }
  }

  private async handleIssuesEvent(payload: any, eventId: string): Promise<any> {
    this.logger.log(`Processing issues event ${eventId} for issue #${payload.issue?.number}`);
    
    const action = payload.action;
    const issueNumber = payload.issue?.number;
    const repoName = payload.repository?.full_name;
    const author = payload.issue?.user?.login;

    return {
      status: 'processed',
      eventType: 'issues',
      issueNumber: issueNumber,
      repository: repoName,
      author: author,
      action: action,
      approved: action === 'closed', // Auto-approve when issue is closed
    };
  }
}