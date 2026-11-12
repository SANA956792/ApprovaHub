import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

// 1. users table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  name: text('name').notNull(),
  mobile: text('mobile').notNull().unique(),
  employeeId: text('employee_id').notNull().unique(),
  department: text('department').notNull().default('Administration'),
  designation: text('designation').notNull().default('Executive'),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('employee'), // 'super_admin' | 'employee'
  status: text('status').notNull().default('active'), // 'active' | 'inactive'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 2. request_categories table
export const requestCategories = pgTable('request_categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  icon: text('icon').notNull().default('FileText'),
  description: text('description').notNull().default(''),
  subcategories: text('subcategories').notNull().default('[]'), // JSON string array
  requiresAmount: boolean('requires_amount').notNull().default(true),
  requiresDates: boolean('requires_dates').notNull().default(false),
  isDefault: boolean('is_default').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 3. requests table
export const requests = pgTable('requests', {
  id: serial('id').primaryKey(),
  requestCode: text('request_code').notNull().unique(),
  employeeId: integer('employee_id')
    .references(() => users.id)
    .notNull(),
  categoryId: integer('category_id').references(() => requestCategories.id),
  categoryName: text('category_name').notNull(),
  subcategory: text('subcategory').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  amount: text('amount'),
  vendor: text('vendor'),
  paymentDate: text('payment_date'),
  startDate: text('start_date'),
  endDate: text('end_date'),
  numDays: integer('num_days'),
  assignedApproverId: integer('assigned_approver_id')
    .references(() => users.id)
    .notNull(),
  visibility: text('visibility').notNull().default('private'), // 'private' | 'group'
  groupId: integer('group_id'),
  status: text('status').notNull().default('Pending'), // 'Pending' | 'Approved' | 'Rejected'
  decidedById: integer('decided_by_id').references(() => users.id),
  decisionDate: timestamp('decision_date'),
  remarks: text('remarks'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 4. request_attachments table
export const requestAttachments = pgTable('request_attachments', {
  id: serial('id').primaryKey(),
  requestId: integer('request_id')
    .references(() => requests.id)
    .notNull(),
  fileName: text('file_name').notNull(),
  fileType: text('file_type').notNull(),
  fileSize: integer('file_size').notNull(),
  storageKey: text('storage_key').notNull().unique(),
  storageProvider: text('storage_provider').notNull().default('r2'), // 'r2' | 'postgres'
  fileData: text('file_data'), // Base64 payload when stored in PostgreSQL fallback
  uploadedById: integer('uploaded_by_id')
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 5. approval_history table
export const approvalHistory = pgTable('approval_history', {
  id: serial('id').primaryKey(),
  requestId: integer('request_id')
    .references(() => requests.id)
    .notNull(),
  actionById: integer('action_by_id')
    .references(() => users.id)
    .notNull(),
  actionByName: text('action_by_name').notNull(),
  action: text('action').notNull(), // 'Submitted' | 'Approved' | 'Rejected' | 'Commented'
  previousStatus: text('previous_status'),
  newStatus: text('new_status').notNull(),
  remarks: text('remarks'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 6. groups table
export const groups = pgTable('groups', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  createdById: integer('created_by_id')
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 7. group_members table
export const groupMembers = pgTable('group_members', {
  id: serial('id').primaryKey(),
  groupId: integer('group_id')
    .references(() => groups.id)
    .notNull(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  role: text('role').notNull().default('member'), // 'admin' | 'member'
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
});

// 8. group_messages table
export const groupMessages = pgTable('group_messages', {
  id: serial('id').primaryKey(),
  groupId: integer('group_id')
    .references(() => groups.id)
    .notNull(),
  senderId: integer('sender_id')
    .references(() => users.id)
    .notNull(),
  senderName: text('sender_name').notNull(),
  senderRole: text('sender_role').notNull().default('employee'),
  messageText: text('message_text').notNull(),
  sharedRequestId: integer('shared_request_id').references(() => requests.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 9. notifications table
export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: text('type').notNull().default('info'),
  relatedRequestId: integer('related_request_id'),
  relatedGroupId: integer('related_group_id'),
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 10. push_subscriptions table
export const pushSubscriptions = pgTable('push_subscriptions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  endpoint: text('endpoint').notNull().unique(),
  p256dh: text('p256dh').notNull(),
  auth: text('auth').notNull(),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 11. app_settings table
export const appSettings = pgTable('app_settings', {
  id: serial('id').primaryKey(),
  settingKey: text('setting_key').notNull().unique(),
  settingValue: text('setting_value').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  submittedRequests: many(requests),
  notifications: many(notifications),
  pushSubscriptions: many(pushSubscriptions),
}));

export const requestsRelations = relations(requests, ({ one, many }) => ({
  employee: one(users, {
    fields: [requests.employeeId],
    references: [users.id],
  }),
  category: one(requestCategories, {
    fields: [requests.categoryId],
    references: [requestCategories.id],
  }),
  attachments: many(requestAttachments),
  history: many(approvalHistory),
}));
