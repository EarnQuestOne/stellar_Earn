/** Payload enqueued on the outbound-webhook delivery queue. */
export interface OutboundWebhookDeliveryPayload {
  /** WebhookDelivery row id. */
  deliveryId: string;
  /** WebhookSubscription row id. */
  subscriptionId: string;
  /** Domain event type (e.g. `quest.created`). */
  eventType: string;
  /** Stable originating event id. */
  eventId: string;
  /** Canonical payload delivered to the consumer. */
  payload: Record<string, unknown>;
  /** Callback URL. */
  targetUrl: string;
  /** Encrypted signing secret (decrypted only in the processor). */
  secretEncrypted: string | null;
}

/** Canonical envelope delivered to consumers. */
export interface OutboundWebhookEnvelope {
  id: string;
  type: string;
  timestamp: string;
  data: unknown;
}
