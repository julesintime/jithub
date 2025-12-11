/**
 * Email helper for E2E tests
 * Integrates with Inbucket API to capture and retrieve test emails
 *
 * Inbucket API docs: https://github.com/inbucket/inbucket/wiki/REST-API
 */
export class EmailHelper {
  private inbucketUrl: string;

  constructor() {
    this.inbucketUrl = process.env.INBUCKET_API_URL || 'https://inbucket.xuperson.org/api/v1';
  }

  /**
   * Get mailbox name from email address
   * Inbucket uses the local part of the email as the mailbox name
   */
  private getMailboxName(email: string): string {
    return email.split('@')[0];
  }

  /**
   * Wait for an email to arrive in the mailbox
   */
  async waitForEmail(email: string, timeout = 30000): Promise<InbucketMessage | null> {
    const mailbox = this.getMailboxName(email);
    const start = Date.now();

    while (Date.now() - start < timeout) {
      const messages = await this.getMessages(mailbox);
      if (messages.length > 0) {
        // Return the most recent message
        return messages[0];
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return null;
  }

  /**
   * Get all messages in a mailbox
   */
  async getMessages(mailbox: string): Promise<InbucketMessage[]> {
    try {
      const response = await fetch(`${this.inbucketUrl}/mailbox/${mailbox}`);
      if (!response.ok) {
        return [];
      }
      return response.json();
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  }

  /**
   * Get a specific message by ID
   */
  async getMessage(mailbox: string, messageId: string): Promise<InbucketMessageDetail | null> {
    try {
      const response = await fetch(`${this.inbucketUrl}/mailbox/${mailbox}/${messageId}`);
      if (!response.ok) {
        return null;
      }
      return response.json();
    } catch (error) {
      console.error('Error fetching message:', error);
      return null;
    }
  }

  /**
   * Get verification link from the most recent email
   */
  async getVerificationLink(email: string): Promise<string | null> {
    const message = await this.waitForEmail(email);
    if (!message) {
      console.error(`No email found for ${email}`);
      return null;
    }

    // Get full message details
    const mailbox = this.getMailboxName(email);
    const details = await this.getMessage(mailbox, message.id);
    if (!details) {
      console.error('Could not fetch message details');
      return null;
    }

    // Try to find verification link in HTML body first, then plain text
    const body = details.body?.html || details.body?.text || '';
    const linkMatch = body.match(/https?:\/\/[^\s<>"']+verify[^\s<>"']*/i);

    if (linkMatch) {
      return linkMatch[0];
    }

    // Try alternative patterns
    const altMatch = body.match(/https?:\/\/[^\s<>"']+token=[^\s<>"']*/i);
    return altMatch ? altMatch[0] : null;
  }

  /**
   * Get password reset link from the most recent email
   */
  async getPasswordResetLink(email: string): Promise<string | null> {
    const message = await this.waitForEmail(email);
    if (!message) {
      console.error(`No email found for ${email}`);
      return null;
    }

    const mailbox = this.getMailboxName(email);
    const details = await this.getMessage(mailbox, message.id);
    if (!details) {
      console.error('Could not fetch message details');
      return null;
    }

    const body = details.body?.html || details.body?.text || '';
    const linkMatch = body.match(/https?:\/\/[^\s<>"']+reset-password[^\s<>"']*/i);

    return linkMatch ? linkMatch[0] : null;
  }

  /**
   * Delete all messages in a mailbox
   */
  async clearMailbox(email: string): Promise<void> {
    const mailbox = this.getMailboxName(email);
    try {
      await fetch(`${this.inbucketUrl}/mailbox/${mailbox}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Error clearing mailbox:', error);
    }
  }

  /**
   * Delete a specific message
   */
  async deleteMessage(email: string, messageId: string): Promise<void> {
    const mailbox = this.getMailboxName(email);
    try {
      await fetch(`${this.inbucketUrl}/mailbox/${mailbox}/${messageId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  }
}

/**
 * Inbucket message list item
 */
interface InbucketMessage {
  id: string;
  from: string;
  to: string[];
  subject: string;
  date: string;
  size: number;
}

/**
 * Inbucket message detail
 */
interface InbucketMessageDetail {
  id: string;
  from: string;
  to: string[];
  subject: string;
  date: string;
  size: number;
  body: {
    text?: string;
    html?: string;
  };
  header: Record<string, string[]>;
}

export const emailHelper = new EmailHelper();
