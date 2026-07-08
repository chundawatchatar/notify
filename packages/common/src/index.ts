const notificationChannels = ["email", "sms", "push", "in_app"] as const;

const notificationStatuses = [
  "draft",
  "queued",
  "sent",
  "delivered",
  "failed",
  "cancelled",
] as const;

type NotificationChannel = (typeof notificationChannels)[number];
type NotificationStatus = (typeof notificationStatuses)[number];

type EntityId = string;
type ISODateTime = string;

interface NotificationRecipient {
  id: EntityId;
  email?: string;
  phoneNumber?: string;
  displayName?: string;
}

interface NotificationTemplate {
  id: EntityId;
  name: string;
  channel: NotificationChannel;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

interface NotificationEvent {
  id: EntityId;
  templateId: EntityId;
  channel: NotificationChannel;
  status: NotificationStatus;
  recipient: NotificationRecipient;
  createdAt: ISODateTime;
  deliveredAt?: ISODateTime;
  failureReason?: string;
}

export type {
  EntityId,
  ISODateTime,
  NotificationChannel,
  NotificationEvent,
  NotificationRecipient,
  NotificationStatus,
  NotificationTemplate,
};
export { notificationChannels, notificationStatuses };
