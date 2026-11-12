import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import { WebSocketServer, WebSocket } from 'ws';
import * as XLSX from 'xlsx';
import { createServer as createViteServer } from 'vite';

import {
  addGroupMemberRecord,
  configureSalwaSuperAdmin,
  createApprovalRequest,
  createCustomCategory,
  createEmployeeRecord,
  createGroupMessageRecord,
  createGroupRecord,
  createNotificationRecord,
  decideApprovalRequest,
  deleteCustomCategoryRecord,
  ensureInitialSetup,
  findUserById,
  findUserByMobile,
  getAttachmentRecordById,
  getGroupFullDetails,
  getRecentActivities,
  getRequestFullDetails,
  getSuperAdminAccountsStatus,
  listActiveApprovers,
  listAllUsers,
  listCategories,
  listGroupsForUser,
  listRequestsForUser,
  listUserNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  removeGroupMemberRecord,
   sanitizeUser,
  saveRequestAttachment,
  saveUserPushSubscription,
  setUserPasswordHash,
  updateCategoryRecord,
  updateEmployeeRecord,
  updateGroupRecord,
} from './src/db/repository.ts';
import {
  AuthRequest,
  loginRateLimiter,
  requireAuth,
  requireSuperAdmin,
  signJwtToken,
  verifyJwtToken,
} from './src/middleware/auth.ts';
import {
  getAttachmentSignedDownloadUrl,
  getR2Status,
  uploadAttachmentFile,
} from './src/services/r2Storage.ts';
import {
  initVapidKeys,
  sendWebPushToUser,
} from './src/services/pushService.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB per file
    files: 5,
  },
  fileFilter: (_req, file, cb) => {
    const allowedMime = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv',
    ];
    if (allowedMime.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          'Unsupported file type. Allowed formats: PDF, PNG, JPG, WEBP, DOC, DOCX, XLS, XLSX, CSV, TXT.'
        )
      );
    }
  },
});

async function startServer() {
  const app = express();
  const server = http.createServer(app);

  // Security & JSON Middleware
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // WebSocket Server for Real-Time Group Chat & Live Notifications
  const wss = new WebSocketServer({ server, path: '/ws' });
  const clientsByUserId = new Map<number, Set<WebSocket>>();

  function broadcastToUser(userId: number, event: string, data: unknown) {
    const sockets = clientsByUserId.get(userId);
    if (!sockets) return;
    const message = JSON.stringify({ event, data });
    for (const ws of sockets) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    }
  }

  function broadcastToAll(event: string, data: unknown) {
    const message = JSON.stringify({ event, data });
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  }

  wss.on('connection', (ws, req) => {
    let connectedUserId: number | null = null;
    try {
      const url = new URL(req.url || '', 'http://localhost');
      const token = url.searchParams.get('token');
      if (token) {
        const payload = verifyJwtToken(token);
        if (payload?.sub) {
          connectedUserId = Number(payload.sub);
          if (!clientsByUserId.has(connectedUserId)) {
            clientsByUserId.set(connectedUserId, new Set());
          }
          clientsByUserId.get(connectedUserId)!.add(ws);
        }
      }
    } catch {
      // Ignore parse error
    }

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(String(raw));
        if (msg.type === 'auth' && msg.token) {
          const payload = verifyJwtToken(msg.token);
          if (payload?.sub) {
            connectedUserId = Number(payload.sub);
            if (!clientsByUserId.has(connectedUserId)) {
              clientsByUserId.set(connectedUserId, new Set());
            }
            clientsByUserId.get(connectedUserId)!.add(ws);
          }
        }
      } catch {
        // Ignore malformed ws frame
      }
    });

    ws.on('close', () => {
      if (connectedUserId && clientsByUserId.has(connectedUserId)) {
        clientsByUserId.get(connectedUserId)!.delete(ws);
      }
    });
  });

  async function notifyUser(input: {
    userId: number;
    title: string;
    message: string;
    type: string;
    relatedRequestId?: number | null;
    relatedGroupId?: number | null;
    url?: string;
  }) {
    try {
      const notif = await createNotificationRecord(input);
      broadcastToUser(input.userId, 'notification:new', notif);
      await sendWebPushToUser(input.userId, {
        title: input.title,
        body: input.message,
        url: input.url || '/',
        relatedRequestId: input.relatedRequestId,
        relatedGroupId: input.relatedGroupId,
        tag: `${input.type}-${input.relatedRequestId || input.relatedGroupId || Date.now()}`,
      });
    } catch (err) {
      console.error('Failed to dispatch notification:', err);
    }
  }

  // ==================== API ROUTES ====================

  // 1. Health Check
  app.get('/api/health', async (_req, res) => {
    try {
      await ensureInitialSetup();
      res.json({
        status: 'healthy',
        service: 'APPROVAL Management System',
        timestamp: new Date().toISOString(),
        storage: getR2Status(),
      });
    } catch (error: any) {
      res.status(503).json({
        status: 'degraded',
        error: error.message || 'Database check failed',
      });
    }
  });

  // 2. Super Admin Accounts Status
  app.get('/api/auth/super-admins-status', async (_req, res) => {
    try {
      const status = await getSuperAdminAccountsStatus();
      res.json(status);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to check status' });
    }
  });

  // 3. Configure Salwa Super Admin Account (if not already present in DB)
  app.post('/api/auth/configure-salwa', loginRateLimiter, async (req, res) => {
    try {
      const { mobile, password } = req.body;
      const user = await configureSalwaSuperAdmin(
        String(mobile || ''),
        String(password || '')
      );
      const token = signJwtToken({
        id: user.id,
        mobile: user.mobile,
        role: user.role,
      });
      res.json({ token, user });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to configure Salwa account' });
    }
  });

  // 4. Mobile + Password Login
  app.post('/api/auth/login', loginRateLimiter, async (req, res) => {
    try {
      const { mobile, password } = req.body;
      const cleanMobile = String(mobile || '').trim();
      const rawPassword = String(password || '');

      if (!cleanMobile || !rawPassword) {
        return res.status(400).json({
          error: 'Please enter both your mobile number and password.',
        });
      }

      const user = await findUserByMobile(cleanMobile);
      if (!user) {
        return res.status(401).json({
          error:
            'Invalid mobile number or password. Please verify your credentials.',
        });
      }

      if (user.status !== 'active') {
        return res.status(403).json({
          error:
            'Your account is inactive. Please contact a Super Admin to reactivate your access.',
        });
      }

      // First-time secure password setup for designated Super Admins if not yet set via environment
      if (user.passwordHash === 'UNCONFIGURED') {
        if (rawPassword.length < 6) {
          return res.status(400).json({
            error:
              'Initial Super Admin password configuration requires at least 6 characters.',
          });
        }
        const updatedUser = await setUserPasswordHash(user.id, rawPassword);
        const token = signJwtToken({
          id: updatedUser.id,
          mobile: updatedUser.mobile,
          role: updatedUser.role,
        });
        return res.json({
          token,
          user: sanitizeUser(updatedUser),
          firstTimeConfigured: true,
        });
      }

      const passwordValid = await bcrypt.compare(rawPassword, user.passwordHash);
      if (!passwordValid) {
        return res.status(401).json({
          error: 'Invalid mobile number or password.',
        });
      }

      const token = signJwtToken({
        id: user.id,
        mobile: user.mobile,
        role: user.role,
      });

      return res.json({
        token,
        user: sanitizeUser(user),
      });
    } catch (error: any) {
      console.error('Login error:', error);
      return res.status(500).json({
        error: error.message || 'Authentication failed. Please try again.',
      });
    }
  });

  // 5. Current Authenticated User Profile
  app.get('/api/auth/me', requireAuth, async (req: AuthRequest, res) => {
    res.json({ user: req.user });
  });

  // 6. Change Own Password
  app.post(
    '/api/auth/change-password',
    requireAuth,
    async (req: AuthRequest, res) => {
      try {
        const { currentPassword, newPassword } = req.body;
        if (!newPassword || String(newPassword).length < 6) {
          return res.status(400).json({
            error: 'New password must be at least 6 characters long.',
          });
        }
        const dbUser = await findUserById(req.user!.id);
        if (!dbUser) {
          return res.status(404).json({ error: 'Account not found.' });
        }

        if (
          dbUser.passwordHash !== 'UNCONFIGURED' &&
          currentPassword !== undefined
        ) {
          const valid = await bcrypt.compare(
            String(currentPassword),
            dbUser.passwordHash
          );
          if (!valid) {
            return res
              .status(400)
              .json({ error: 'Current password is incorrect.' });
          }
        }

        await setUserPasswordHash(dbUser.id, String(newPassword));
        res.json({ message: 'Password updated successfully.' });
      } catch (error: any) {
        res
          .status(500)
          .json({ error: error.message || 'Failed to update password.' });
      }
    }
  );

  // 7. Dashboard Overview & KPIs
  app.get('/api/dashboard', requireAuth, async (req: AuthRequest, res) => {
    try {
      const currentUser = req.user!;
      const accessibleRequests = await listRequestsForUser(currentUser);
      const myRequests = accessibleRequests.filter(
        (r) => r.employeeId === currentUser.id
      );
      const allUsers = await listAllUsers();
      const userNotifications = await listUserNotifications(currentUser.id);
      const recentActivities =
        currentUser.role === 'super_admin'
          ? await getRecentActivities(12)
          : [];

      const kpis = {
        totalApprovals: accessibleRequests.length,
        pendingApprovals: accessibleRequests.filter(
          (r) => r.status === 'Pending'
        ).length,
        approvedRequests: accessibleRequests.filter(
          (r) => r.status === 'Approved'
        ).length,
        rejectedRequests: accessibleRequests.filter(
          (r) => r.status === 'Rejected'
        ).length,
        totalEmployees: allUsers.length,
        activeEmployees: allUsers.filter((u) => u.status === 'active').length,
        mySubmissions: myRequests.length,
        myPending: myRequests.filter((r) => r.status === 'Pending').length,
        myApproved: myRequests.filter((r) => r.status === 'Approved').length,
        myRejected: myRequests.filter((r) => r.status === 'Rejected').length,
      };

      const pendingApprovalList = accessibleRequests
        .filter(
          (r) =>
            r.status === 'Pending' &&
            (currentUser.role === 'super_admin' ||
              r.assignedApproverId === currentUser.id)
        )
        .slice(0, 10);

      res.json({
        kpis,
        recentRequests: accessibleRequests.slice(0, 8),
        pendingApprovalList,
        recentActivities,
        employeeOverview:
          currentUser.role === 'super_admin' ? allUsers.slice(0, 8) : [],
        unreadNotifications: userNotifications.filter((n) => !n.isRead).length,
      });
    } catch (error: any) {
      res
        .status(500)
        .json({ error: error.message || 'Failed to load dashboard data.' });
    }
  });

  // 8. Approval Categories (12 Defaults + Unlimited Custom Categories)
  app.get('/api/categories', requireAuth, async (req: AuthRequest, res) => {
    try {
      const includeInactive =
        req.query.includeInactive === 'true' &&
        req.user?.role === 'super_admin';
      const categories = await listCategories(!includeInactive);
      res.json({ categories });
    } catch (error: any) {
      res
        .status(500)
        .json({ error: error.message || 'Failed to load categories.' });
    }
  });

  app.post(
    '/api/categories',
    requireAuth,
    requireSuperAdmin,
    async (req: AuthRequest, res) => {
      try {
        const {
          name,
          icon,
          description,
          subcategories,
          requiresAmount,
          requiresDates,
        } = req.body;
        const created = await createCustomCategory({
          name: String(name || ''),
          icon: String(icon || 'FileText'),
          description: String(description || ''),
          subcategories: Array.isArray(subcategories) ? subcategories : [],
          requiresAmount: Boolean(requiresAmount ?? true),
          requiresDates: Boolean(requiresDates ?? false),
        });
        broadcastToAll('categories:updated', created);
        res.status(201).json({ category: created });
      } catch (error: any) {
        res
          .status(400)
          .json({ error: error.message || 'Failed to create category.' });
      }
    }
  );

  app.put(
    '/api/categories/:id',
    requireAuth,
    requireSuperAdmin,
    async (req: AuthRequest, res) => {
      try {
        const id = Number(req.params.id);
        const updated = await updateCategoryRecord(id, req.body);
        broadcastToAll('categories:updated', updated);
        res.json({ category: updated });
      } catch (error: any) {
        res
          .status(400)
          .json({ error: error.message || 'Failed to update category.' });
      }
    }
  );

  app.delete(
    '/api/categories/:id',
    requireAuth,
    requireSuperAdmin,
    async (req: AuthRequest, res) => {
      try {
        const id = Number(req.params.id);
        await deleteCustomCategoryRecord(id);
        broadcastToAll('categories:updated', { id, deleted: true });
        res.json({ success: true });
      } catch (error: any) {
        res
          .status(400)
          .json({ error: error.message || 'Failed to delete category.' });
      }
    }
  );

  // 9. Employees & Approvers Management
  app.get('/api/approvers', requireAuth, async (_req: AuthRequest, res) => {
    try {
      const approvers = await listActiveApprovers();
      res.json({ approvers });
    } catch (error: any) {
      res
        .status(500)
        .json({ error: error.message || 'Failed to load approvers.' });
    }
  });

  app.get('/api/employees', requireAuth, async (req: AuthRequest, res) => {
    try {
      const employees = await listAllUsers({
        search:
          typeof req.query.search === 'string' ? req.query.search : undefined,
        department:
          typeof req.query.department === 'string'
            ? req.query.department
            : undefined,
        status:
          typeof req.query.status === 'string' ? req.query.status : undefined,
      });
      res.json({ employees });
    } catch (error: any) {
      res
        .status(500)
        .json({ error: error.message || 'Failed to load employees.' });
    }
  });

  app.get('/api/employees/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const targetId = Number(req.params.id);
      if (
        req.user!.role !== 'super_admin' &&
        req.user!.id !== targetId
      ) {
        return res
          .status(403)
          .json({ error: 'Forbidden: Cannot view another employee record.' });
      }
      const emp = await findUserById(targetId);
      if (!emp) {
        return res.status(404).json({ error: 'Employee not found.' });
      }
      const history = await listRequestsForUser(req.user!, {
        employeeId: targetId,
      });
      res.json({
        employee: sanitizeUser(emp),
        requests: history,
      });
    } catch (error: any) {
      res
        .status(500)
        .json({ error: error.message || 'Failed to load employee details.' });
    }
  });

  app.post(
    '/api/employees',
    requireAuth,
    requireSuperAdmin,
    async (req: AuthRequest, res) => {
      try {
        const {
          name,
          mobile,
          employeeId,
          department,
          designation,
          password,
          status,
        } = req.body;
        if (!name || !mobile || !employeeId || !password) {
          return res.status(400).json({
            error:
              'Employee Name, Mobile Number, Employee ID, and Password are required.',
          });
        }
        if (String(password).length < 6) {
          return res.status(400).json({
            error: 'Password must be at least 6 characters.',
          });
        }
        const created = await createEmployeeRecord({
          name: String(name),
          mobile: String(mobile),
          employeeId: String(employeeId),
          department: String(department || 'General'),
          designation: String(designation || 'Executive'),
          password: String(password),
          status: status === 'inactive' ? 'inactive' : 'active',
        });
        res.status(201).json({ employee: created });
      } catch (error: any) {
        res
          .status(400)
          .json({ error: error.message || 'Failed to create employee.' });
      }
    }
  );

  app.put(
    '/api/employees/:id',
    requireAuth,
    requireSuperAdmin,
    async (req: AuthRequest, res) => {
      try {
        const targetId = Number(req.params.id);
        const updated = await updateEmployeeRecord(targetId, req.body);
        res.json({ employee: updated });
      } catch (error: any) {
        res
          .status(400)
          .json({ error: error.message || 'Failed to update employee.' });
      }
    }
  );

  app.post(
    '/api/employees/:id/reset-password',
    requireAuth,
    requireSuperAdmin,
    async (req: AuthRequest, res) => {
      try {
        const targetId = Number(req.params.id);
        const { newPassword } = req.body;
        if (!newPassword || String(newPassword).length < 6) {
          return res.status(400).json({
            error: 'New password must be at least 6 characters.',
          });
        }
        await setUserPasswordHash(targetId, String(newPassword));
        res.json({ message: 'Employee password has been reset successfully.' });
      } catch (error: any) {
        res
          .status(400)
          .json({ error: error.message || 'Failed to reset password.' });
      }
    }
  );

  // 10. Requests & Approval Workflow
  app.get('/api/requests', requireAuth, async (req: AuthRequest, res) => {
    try {
      const list = await listRequestsForUser(req.user!, {
        status:
          typeof req.query.status === 'string' ? req.query.status : undefined,
        category:
          typeof req.query.category === 'string'
            ? req.query.category
            : undefined,
        employeeId: req.query.employeeId
          ? Number(req.query.employeeId)
          : undefined,
        department:
          typeof req.query.department === 'string'
            ? req.query.department
            : undefined,
        assignedApproverId: req.query.assignedApproverId
          ? Number(req.query.assignedApproverId)
          : undefined,
        startDate:
          typeof req.query.startDate === 'string'
            ? req.query.startDate
            : undefined,
        endDate:
          typeof req.query.endDate === 'string' ? req.query.endDate : undefined,
        search:
          typeof req.query.search === 'string' ? req.query.search : undefined,
        scope:
          req.query.scope === 'my' || req.query.scope === 'assigned'
            ? req.query.scope
            : 'all',
      });
      res.json({ requests: list });
    } catch (error: any) {
      res
        .status(500)
        .json({ error: error.message || 'Failed to load requests.' });
    }
  });

  app.get('/api/requests/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const details = await getRequestFullDetails(id, req.user!);
      if (!details) {
        return res.status(404).json({ error: 'Request not found.' });
      }
      res.json({ request: details });
    } catch (error: any) {
      res
        .status(403)
        .json({ error: error.message || 'Failed to load request details.' });
    }
  });

  app.post(
    '/api/requests',
    requireAuth,
    upload.array('attachments', 5),
    async (req: AuthRequest, res) => {
      try {
        const currentUser = req.user!;
        const {
          categoryId,
          categoryName,
          subcategory,
          title,
          description,
          amount,
          vendor,
          paymentDate,
          startDate,
          endDate,
          numDays,
          assignedApproverId,
          visibility,
          groupId,
        } = req.body;

        if (
          !categoryName ||
          !subcategory ||
          !title ||
          !description ||
          !assignedApproverId
        ) {
          return res.status(400).json({
            error:
              'Category, Subcategory, Title, Description, and Assigned Approver are required.',
          });
        }

        if (
          amount !== undefined &&
          amount !== null &&
          String(amount).trim() !== ''
        ) {
          const parsedAmt = Number(amount);
          if (Number.isNaN(parsedAmt) || parsedAmt < 0) {
            return res
              .status(400)
              .json({ error: 'Please enter a valid positive amount.' });
          }
        }

        if (startDate && endDate && String(endDate) < String(startDate)) {
          return res.status(400).json({
            error: 'End Date cannot be earlier than Start Date.',
          });
        }

        const createdReq = await createApprovalRequest({
          employeeId: currentUser.id,
          employeeName: currentUser.name,
          categoryId: Number(categoryId) || 1,
          categoryName: String(categoryName),
          subcategory: String(subcategory),
          title: String(title),
          description: String(description),
          amount:
            amount !== undefined && String(amount).trim() !== ''
              ? String(amount).trim()
              : null,
          vendor: vendor ? String(vendor).trim() : null,
          paymentDate: paymentDate ? String(paymentDate) : null,
          startDate: startDate ? String(startDate) : null,
          endDate: endDate ? String(endDate) : null,
          numDays: numDays ? Number(numDays) : null,
          assignedApproverId: Number(assignedApproverId),
          visibility: visibility === 'group' ? 'group' : 'private',
          groupId: groupId ? Number(groupId) : null,
        });

        // Upload attachments to Cloudflare R2 (or PostgreSQL binary store)
        const files = (req.files as Express.Multer.File[]) || [];
        const savedAttachments = [];
        for (const file of files) {
          const uploaded = await uploadAttachmentFile(
            file.buffer,
            file.originalname,
            file.mimetype
          );
          const att = await saveRequestAttachment({
            requestId: createdReq.id,
            fileName: file.originalname,
            fileType: file.mimetype,
            fileSize: file.size,
            storageKey: uploaded.storageKey,
            storageProvider: uploaded.storageProvider,
            fileData: uploaded.fileData,
            uploadedById: currentUser.id,
          });
          savedAttachments.push(att);
        }

        // Notify Assigned Approver
        await notifyUser({
          userId: Number(assignedApproverId),
          title: `New Approval Assigned: ${createdReq.request_code}`,
          message: `${currentUser.name} submitted "${createdReq.title}" (${createdReq.category_name}) for your approval.`,
          type: 'request_assigned',
          relatedRequestId: createdReq.id,
          url: `/?page=request-details&id=${createdReq.id}`,
        });

        // Also notify Super Admins if different from assignedApproverId and creator
        const allUsers = await listAllUsers();
        for (const u of allUsers) {
          if (
            u.role === 'super_admin' &&
            u.id !== Number(assignedApproverId) &&
            u.id !== currentUser.id
          ) {
            await notifyUser({
              userId: u.id,
              title: `New Request Submitted: ${createdReq.request_code}`,
              message: `${currentUser.name} submitted "${createdReq.title}" (${createdReq.category_name}).`,
              type: 'request_created',
              relatedRequestId: createdReq.id,
              url: `/?page=request-details&id=${createdReq.id}`,
            });
          }
        }

        broadcastToAll('request:created', {
          id: createdReq.id,
          requestCode: createdReq.request_code,
        });

        if (visibility === 'group' && groupId) {
          broadcastToAll('group:message', {
            groupId: Number(groupId),
          });
        }

        res.status(201).json({
          request: createdReq,
          attachments: savedAttachments,
        });
      } catch (error: any) {
        console.error('Create request error:', error);
        res
          .status(400)
          .json({ error: error.message || 'Failed to submit request.' });
      }
    }
  );

  // 11. Approve or Reject Request
  app.post(
    '/api/requests/:id/decision',
    requireAuth,
    async (req: AuthRequest, res) => {
      try {
        const requestId = Number(req.params.id);
        const { decision, remarks } = req.body;
        if (decision !== 'Approved' && decision !== 'Rejected') {
          return res.status(400).json({
            error: 'Decision must be either Approved or Rejected.',
          });
        }
        if (decision === 'Rejected' && (!remarks || !String(remarks).trim())) {
          return res.status(400).json({
            error: 'Please provide remarks explaining the rejection reason.',
          });
        }

        const updated = await decideApprovalRequest({
          requestId,
          decidedById: req.user!.id,
          decidedByName: req.user!.name,
          decidedByRole: req.user!.role,
          decision,
          remarks: String(remarks || ''),
        });

        // Notify Requesting Employee
        await notifyUser({
          userId: updated.employee_id,
          title: `Request ${decision}: ${updated.request_code}`,
          message: `Your request "${updated.title}" was ${decision.toLowerCase()} by ${req.user!.name}.${remarks ? ` Remarks: ${remarks}` : ''}`,
          type:
            decision === 'Approved' ? 'request_approved' : 'request_rejected',
          relatedRequestId: updated.id,
          url: `/?page=request-details&id=${updated.id}`,
        });

        broadcastToAll('request:updated', {
          id: updated.id,
          status: updated.status,
        });

        const full = await getRequestFullDetails(requestId, req.user!);
        res.json({ request: full });
      } catch (error: any) {
        res
          .status(400)
          .json({ error: error.message || 'Failed to record decision.' });
      }
    }
  );

  // 12. Secure Attachment View/Download
  app.get(
    '/api/attachments/:id/download',
    requireAuth,
    async (req: AuthRequest, res) => {
      try {
        const attachmentId = Number(req.params.id);
        const att = await getAttachmentRecordById(attachmentId);
        if (!att) {
          return res.status(404).json({ error: 'Attachment not found.' });
        }

        // Verify user can access parent request
        await getRequestFullDetails(att.requestId, req.user!);

        if (att.storageProvider === 'r2') {
          const signedUrl = await getAttachmentSignedDownloadUrl(
            att.storageKey
          );
          if (signedUrl) {
            return res.redirect(signedUrl);
          }
        }

        if (att.fileData) {
          const buffer = Buffer.from(att.fileData, 'base64');
          res.setHeader('Content-Type', att.fileType);
          res.setHeader(
            'Content-Disposition',
            `inline; filename="${encodeURIComponent(att.fileName)}"`
          );
          return res.send(buffer);
        }

        return res
          .status(404)
          .json({ error: 'Attachment binary content is unavailable.' });
      } catch (error: any) {
        res
          .status(403)
          .json({ error: error.message || 'Unauthorized to access attachment.' });
      }
    }
  );

  // 13. Groups & Real-Time Group Chat
  app.get('/api/groups', requireAuth, async (req: AuthRequest, res) => {
    try {
      const list = await listGroupsForUser(req.user!);
      res.json({ groups: list });
    } catch (error: any) {
      res
        .status(500)
        .json({ error: error.message || 'Failed to load groups.' });
    }
  });

  app.post('/api/groups', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { name, description, memberIds } = req.body;
      if (!name || !String(name).trim()) {
        return res.status(400).json({ error: 'Group name is required.' });
      }
      const parsedMembers = Array.isArray(memberIds)
        ? memberIds.map(Number).filter(Boolean)
        : [];
      const created = await createGroupRecord({
        name: String(name),
        description: String(description || ''),
        createdById: req.user!.id,
        memberIds: parsedMembers,
      });

      for (const uid of parsedMembers) {
        if (uid !== req.user!.id) {
          await notifyUser({
            userId: uid,
            title: `Added to Group: ${created.name}`,
            message: `${req.user!.name} added you to the group "${created.name}".`,
            type: 'group_added',
            relatedGroupId: created.id,
            url: `/?page=group-chat&id=${created.id}`,
          });
        }
      }

      broadcastToAll('group:updated', { groupId: created.id });
      res.status(201).json({ group: created });
    } catch (error: any) {
      res
        .status(400)
        .json({ error: error.message || 'Failed to create group.' });
    }
  });

  app.get('/api/groups/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const groupId = Number(req.params.id);
      const details = await getGroupFullDetails(groupId, req.user!);
      if (!details) {
        return res.status(404).json({ error: 'Group not found.' });
      }
      res.json({ group: details });
    } catch (error: any) {
      res
        .status(403)
        .json({ error: error.message || 'Failed to load group details.' });
    }
  });

  app.put('/api/groups/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const groupId = Number(req.params.id);
      await getGroupFullDetails(groupId, req.user!);
      const { name, description } = req.body;
      if (!name || !String(name).trim()) {
        return res.status(400).json({ error: 'Group name is required.' });
      }
      const updated = await updateGroupRecord(groupId, {
        name: String(name),
        description: String(description || ''),
      });
      broadcastToAll('group:updated', { groupId });
      res.json({ group: updated });
    } catch (error: any) {
      res
        .status(400)
        .json({ error: error.message || 'Failed to update group.' });
    }
  });

  app.post(
    '/api/groups/:id/members',
    requireAuth,
    async (req: AuthRequest, res) => {
      try {
        const groupId = Number(req.params.id);
        const { userId } = req.body;
        const grp = await getGroupFullDetails(groupId, req.user!);
        if (!grp) {
          return res.status(404).json({ error: 'Group not found.' });
        }
        const targetUser = await findUserById(Number(userId));
        if (!targetUser) {
          return res
            .status(404)
            .json({ error: 'Only registered employees can be added to groups.' });
        }
        await addGroupMemberRecord(groupId, targetUser.id);
        await notifyUser({
          userId: targetUser.id,
          title: `Added to Group: ${grp.name}`,
          message: `${req.user!.name} added you to "${grp.name}".`,
          type: 'group_added',
          relatedGroupId: groupId,
          url: `/?page=group-chat&id=${groupId}`,
        });
        broadcastToAll('group:updated', { groupId });
        const refreshed = await getGroupFullDetails(groupId, req.user!);
        res.json({ group: refreshed });
      } catch (error: any) {
        res
          .status(400)
          .json({ error: error.message || 'Failed to add member.' });
      }
    }
  );

  app.delete(
    '/api/groups/:id/members/:userId',
    requireAuth,
    async (req: AuthRequest, res) => {
      try {
        const groupId = Number(req.params.id);
        const targetUserId = Number(req.params.userId);
        await getGroupFullDetails(groupId, req.user!);
        await removeGroupMemberRecord(groupId, targetUserId);
        broadcastToAll('group:updated', { groupId });
        const refreshed = await getGroupFullDetails(groupId, req.user!);
        res.json({ group: refreshed });
      } catch (error: any) {
        res
          .status(400)
          .json({ error: error.message || 'Failed to remove member.' });
      }
    }
  );

  app.post(
    '/api/groups/:id/messages',
    requireAuth,
    async (req: AuthRequest, res) => {
      try {
        const groupId = Number(req.params.id);
        const { messageText, sharedRequestId } = req.body;
        const grp = await getGroupFullDetails(groupId, req.user!);
        if (!grp) {
          return res.status(404).json({ error: 'Group not found.' });
        }

        if (
          (!messageText || !String(messageText).trim()) &&
          !sharedRequestId
        ) {
          return res.status(400).json({ error: 'Message text is required.' });
        }

        const msg = await createGroupMessageRecord({
          groupId,
          senderId: req.user!.id,
          senderName: req.user!.name,
          senderRole: req.user!.role,
          messageText: String(
            messageText || 'Shared an approval request card.'
          ),
          sharedRequestId: sharedRequestId ? Number(sharedRequestId) : null,
        });

        // Broadcast live via WebSocket to all group members
        broadcastToAll('group:message', {
          groupId,
          message: msg,
        });

        // Notify group members (excluding sender)
        for (const member of grp.members) {
          if (member && member.id !== req.user!.id) {
            await notifyUser({
              userId: member.id,
              title: `${grp.name} • ${req.user!.name}`,
              message: msg.messageText,
              type: 'group_message',
              relatedGroupId: groupId,
              relatedRequestId: msg.sharedRequestId || null,
              url: `/?page=group-chat&id=${groupId}`,
            });
          }
        }

        res.status(201).json({ message: msg });
      } catch (error: any) {
        res
          .status(400)
          .json({ error: error.message || 'Failed to send message.' });
      }
    }
  );

  // 14. Notifications & Web Push Subscriptions
  app.get('/api/notifications', requireAuth, async (req: AuthRequest, res) => {
    try {
      const list = await listUserNotifications(req.user!.id);
      res.json({ notifications: list });
    } catch (error: any) {
      res
        .status(500)
        .json({ error: error.message || 'Failed to load notifications.' });
    }
  });

  app.post(
    '/api/notifications/:id/read',
    requireAuth,
    async (req: AuthRequest, res) => {
      try {
        await markNotificationRead(Number(req.params.id), req.user!.id);
        res.json({ success: true });
      } catch (error: any) {
        res
          .status(400)
          .json({ error: error.message || 'Failed to mark notification.' });
      }
    }
  );

  app.post(
    '/api/notifications/read-all',
    requireAuth,
    async (req: AuthRequest, res) => {
      try {
        await markAllNotificationsRead(req.user!.id);
        res.json({ success: true });
      } catch (error: any) {
        res
          .status(400)
          .json({ error: error.message || 'Failed to mark notifications.' });
      }
    }
  );

  app.get(
    '/api/push/vapid-public-key',
    requireAuth,
    async (_req: AuthRequest, res) => {
      try {
        const keys = await initVapidKeys();
        res.json({ publicKey: keys.publicKey });
      } catch (error: any) {
        res
          .status(500)
          .json({ error: error.message || 'Failed to get VAPID public key.' });
      }
    }
  );

  app.post(
    '/api/push/subscribe',
    requireAuth,
    async (req: AuthRequest, res) => {
      try {
        const { endpoint, keys } = req.body;
        if (!endpoint || !keys?.p256dh || !keys?.auth) {
          return res
            .status(400)
            .json({ error: 'Invalid push subscription payload.' });
        }
        const saved = await saveUserPushSubscription({
          userId: req.user!.id,
          endpoint: String(endpoint),
          p256dh: String(keys.p256dh),
          auth: String(keys.auth),
          userAgent: req.headers['user-agent'] || '',
        });
        res.json({ subscription: saved });
      } catch (error: any) {
        res
          .status(400)
          .json({ error: error.message || 'Failed to save subscription.' });
      }
    }
  );

  app.post('/api/push/test', requireAuth, async (req: AuthRequest, res) => {
    try {
      await notifyUser({
        userId: req.user!.id,
        title: 'APPROVAL Push Notification Active',
        message: `Hi ${req.user!.name}, real-time in-app and Web Push notifications are verified and working on your device.`,
        type: 'system',
        url: '/?page=notifications',
      });
      res.json({
        message:
          'Test notification dispatched to your in-app inbox and registered Web Push devices.',
      });
    } catch (error: any) {
      res
        .status(500)
        .json({ error: error.message || 'Failed to send test notification.' });
    }
  });

  // 15. Reports & Excel (.xlsx) Export
  app.get(
    '/api/reports/export',
    requireAuth,
    async (req: AuthRequest, res) => {
      try {
        const filtered = await listRequestsForUser(req.user!, {
          status:
            typeof req.query.status === 'string' ? req.query.status : undefined,
          category:
            typeof req.query.category === 'string'
              ? req.query.category
              : undefined,
          employeeId: req.query.employeeId
            ? Number(req.query.employeeId)
            : undefined,
          department:
            typeof req.query.department === 'string'
              ? req.query.department
              : undefined,
          assignedApproverId: req.query.assignedApproverId
            ? Number(req.query.assignedApproverId)
            : undefined,
          startDate:
            typeof req.query.startDate === 'string'
              ? req.query.startDate
              : undefined,
          endDate:
            typeof req.query.endDate === 'string'
              ? req.query.endDate
              : undefined,
        });

        const rows = filtered.map((r) => ({
          'Request ID': r.requestCode,
          'Employee Name': r.employeeName,
          'Employee Mobile': r.employeeMobile,
          Department: r.department,
          Category: r.categoryName,
          Subcategory: r.subcategory,
          Title: r.title,
          Description: r.description,
          Amount: r.amount ? Number(r.amount) : '',
          'Submission Date': new Date(r.createdAt)
            .toISOString()
            .replace('T', ' ')
            .slice(0, 19),
          'Assigned Approver': r.assignedApproverName,
          Status: r.status,
          'Decision Date': r.decisionDate
            ? new Date(r.decisionDate)
                .toISOString()
                .replace('T', ' ')
                .slice(0, 19)
            : '',
          'Rejection Reason':
            r.status === 'Rejected' ? r.remarks || '' : r.remarks || '',
        }));

        const worksheet = XLSX.utils.json_to_sheet(
          rows.length > 0
            ? rows
            : [
                {
                  'Request ID': '',
                  'Employee Name': '',
                  'Employee Mobile': '',
                  Department: '',
                  Category: '',
                  Subcategory: '',
                  Title: '',
                  Description: '',
                  Amount: '',
                  'Submission Date': '',
                  'Assigned Approver': '',
                  Status: '',
                  'Decision Date': '',
                  'Rejection Reason': '',
                },
              ]
        );

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Approval Requests');

        const buffer = XLSX.write(workbook, {
          type: 'buffer',
          bookType: 'xlsx',
        });

        const filename = `APPROVAL_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;
        res.setHeader(
          'Content-Type',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${filename}"`
        );
        return res.send(buffer);
      } catch (error: any) {
        console.error('Excel export failed:', error);
        res
          .status(500)
          .json({ error: error.message || 'Failed to generate Excel export.' });
      }
    }
  );

  // Multer / API Error Handler
  app.use(
    (
      err: any,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      console.error('Unhandled API Error:', err);
      res.status(400).json({
        error: err.message || 'An unexpected server error occurred.',
      });
    }
  );

  // Vite Dev Server or Production Static Build
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`APPROVAL Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
