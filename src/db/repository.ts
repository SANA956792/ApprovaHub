import bcrypt from 'bcryptjs';
import { and, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { db, pool } from './index.ts';
import {
  approvalHistory,
  appSettings,
  groupMembers,
  groupMessages,
  groups,
  notifications,
  pushSubscriptions,
  requestAttachments,
  requestCategories,
  requests,
  users,
} from './schema.ts';

export const DEFAULT_CATEGORIES = [
  {
    name: 'Expense Reimbursement',
    icon: 'Receipt',
    description: 'Bills, vendor payments, and employee expense claims.',
    subcategories: [
      'Travel Expenses',
      'Client Meals',
      'Fuel Allowance',
      'Courier Charges',
      'General Expenses',
    ],
    requiresAmount: true,
    requiresDates: false,
  },
  {
    name: 'Equipment Purchase',
    icon: 'Laptop',
    description: 'Laptops, workstations, monitors, and hardware devices.',
    subcategories: [
      'Laptop',
      'Workstation',
      'Monitor',
      'Accessories',
      'Other Equipment',
    ],
    requiresAmount: true,
    requiresDates: false,
  },
  {
    name: 'Software Subscription',
    icon: 'Cpu',
    description: 'SaaS tools, cloud hosting, domains, and software licenses.',
    subcategories: [
      'SaaS Tools',
      'Cloud Hosting',
      'Domain and SSL',
      'Development Licenses',
      'Design Tools',
    ],
    requiresAmount: true,
    requiresDates: true,
  },
  {
    name: 'Stationery Purchase',
    icon: 'PenTool',
    description: 'Notebooks, pens, printer paper, and office stationery.',
    subcategories: [
      'Notebooks',
      'Pens',
      'Printer Paper',
      'Files and Folders',
      'Other Stationery',
    ],
    requiresAmount: true,
    requiresDates: false,
  },
  {
    name: 'Casual Leave',
    icon: 'Calendar',
    description: 'Personal work, urgent affairs, and family occasions.',
    subcategories: ['Personal Work', 'Urgent Affairs', 'Family Occasion'],
    requiresAmount: false,
    requiresDates: true,
  },
  {
    name: 'Sick Leave',
    icon: 'HeartPulse',
    description: 'Medical recovery, hospital visits, and prescribed rest.',
    subcategories: ['Medical Recovery', 'Hospital Visit', 'Prescribed Rest'],
    requiresAmount: false,
    requiresDates: true,
  },
  {
    name: 'Permission Request',
    icon: 'Clock',
    description: 'Short duration permissions for late arrival or midday exit.',
    subcategories: [
      'Late Coming',
      'Early Leaving',
      'Midday Permission',
      'Other Permission',
    ],
    requiresAmount: false,
    requiresDates: true,
  },
  {
    name: 'Meta Ads Budget',
    icon: 'Megaphone',
    description: 'Paid marketing budgets for Facebook and Instagram campaigns.',
    subcategories: [
      'Facebook Campaigns',
      'Instagram Ads',
      'Brand Awareness',
      'Lead Generation',
    ],
    requiresAmount: true,
    requiresDates: true,
  },
  {
    name: 'Office Maintenance',
    icon: 'Wrench',
    description: 'Facility upkeep, AC, plumbing, electrical, and cleaning.',
    subcategories: [
      'Air Conditioning',
      'Plumbing',
      'Electrical Repairs',
      'Cleaning',
      'Other Maintenance',
    ],
    requiresAmount: true,
    requiresDates: false,
  },
  {
    name: 'Travel Request',
    icon: 'Plane',
    description: 'Flight, train, hotel stay, and cab booking approvals.',
    subcategories: [
      'Flight Booking',
      'Train Booking',
      'Hotel Stay',
      'Cab Booking',
      'Other Travel',
    ],
    requiresAmount: true,
    requiresDates: true,
  },
  {
    name: 'Early Leaving Office Request',
    icon: 'LogOut',
    description: 'Authorization for leaving the office before standard hours.',
    subcategories: [
      'Family Emergency',
      'Personal Commitment',
      'Other Reasons',
    ],
    requiresAmount: false,
    requiresDates: true,
  },
  {
    name: 'Salary Increment Request',
    icon: 'TrendingUp',
    description: 'Annual appraisal, performance promotion, and contract revision.',
    subcategories: [
      'Annual Appraisal',
      'Performance Promotion',
      'Contract Revision',
    ],
    requiresAmount: true,
    requiresDates: false,
  },
];

let isSeeded = false;
export let salwaAccountNotice: string | null = null;

function isValidEnvSecret(val: string | undefined): val is string {
  return Boolean(val && val.trim().length > 0 && !val.startsWith('YOUR_'));
}

export async function ensureInitialSetup() {
  if (isSeeded) return;
  try {
    // 1. Seed the 12 default approval categories without overwriting existing customized categories
    for (const cat of DEFAULT_CATEGORIES) {
      await db
        .insert(requestCategories)
        .values({
          name: cat.name,
          icon: cat.icon,
          description: cat.description,
          subcategories: JSON.stringify(cat.subcategories),
          requiresAmount: cat.requiresAmount,
          requiresDates: cat.requiresDates,
          isDefault: true,
          isActive: true,
        })
        .onConflictDoNothing({ target: requestCategories.name });
    }

    // 2. Configure the 4 designated Super Admin accounts without duplicating or overwriting existing passwords
    const designatedAdmins = [
      {
        name: 'Salman',
        mobile: '8907269301',
        employeeId: 'ADM-001',
        email: 'salman@approval.ibat.in',
        envPassword: process.env.SALMAN_ADMIN_PASSWORD,
      },
      {
        name: 'Munavvar',
        mobile: '7559844140',
        employeeId: 'ADM-002',
        email: 'munavvar@approval.ibat.in',
        envPassword: process.env.MUNAVVAR_ADMIN_PASSWORD,
      },
      {
        name: 'Learning App',
        mobile: '7012267090',
        employeeId: 'ADM-003',
        email: 'ibatlearningapp@gmail.com',
        envPassword: process.env.LEARNING_APP_ADMIN_PASSWORD,
      },
    ];

    for (const admin of designatedAdmins) {
      const existingByMobile = await db
        .select()
        .from(users)
        .where(eq(users.mobile, admin.mobile));

      const envPassValid = isValidEnvSecret(admin.envPassword);

      if (existingByMobile.length > 0) {
        const current = existingByMobile[0];
        let nextPasswordHash = current.passwordHash;
        if (
          envPassValid &&
          (current.passwordHash === 'UNCONFIGURED' || !current.passwordHash)
        ) {
          nextPasswordHash = await bcrypt.hash(admin.envPassword!, 12);
        }

        await db
          .update(users)
          .set({
            name: admin.name,
            role: 'super_admin',
            status: 'active',
            passwordHash: nextPasswordHash,
            updatedAt: new Date(),
          })
          .where(eq(users.id, current.id));
      } else {
        const initialHash = envPassValid
          ? await bcrypt.hash(admin.envPassword!, 12)
          : 'UNCONFIGURED';

        await db.insert(users).values({
          uid: `admin:${admin.mobile}`,
          email: admin.email,
          name: admin.name,
          mobile: admin.mobile,
          employeeId: admin.employeeId,
          department: 'Executive Management',
          designation: 'Super Admin',
          passwordHash: initialHash,
          role: 'super_admin',
          status: 'active',
        });
      }
    }

    // Account 4: Salwa — check if an existing Salwa account exists by name or configured mobile
    const existingSalwa = await db
      .select()
      .from(users)
      .where(ilike(users.name, 'Salwa%'));

    if (existingSalwa.length > 0) {
      const salwaUser = existingSalwa[0];
      let nextHash = salwaUser.passwordHash;
      if (
        isValidEnvSecret(process.env.SALWA_ADMIN_PASSWORD) &&
        salwaUser.passwordHash === 'UNCONFIGURED'
      ) {
        nextHash = await bcrypt.hash(process.env.SALWA_ADMIN_PASSWORD!, 12);
      }
      await db
        .update(users)
        .set({
          role: 'super_admin',
          status: 'active',
          passwordHash: nextHash,
          updatedAt: new Date(),
        })
        .where(eq(users.id, salwaUser.id));
      salwaAccountNotice = null;
    } else if (isValidEnvSecret(process.env.SALWA_ADMIN_MOBILE)) {
      const salwaMobile = process.env.SALWA_ADMIN_MOBILE!.trim();
      const byMobile = await db
        .select()
        .from(users)
        .where(eq(users.mobile, salwaMobile));

      if (byMobile.length > 0) {
        await db
          .update(users)
          .set({
            name: 'Salwa',
            role: 'super_admin',
            status: 'active',
            updatedAt: new Date(),
          })
          .where(eq(users.id, byMobile[0].id));
      } else {
        const salwaHash = isValidEnvSecret(process.env.SALWA_ADMIN_PASSWORD)
          ? await bcrypt.hash(process.env.SALWA_ADMIN_PASSWORD!, 12)
          : 'UNCONFIGURED';
        await db.insert(users).values({
          uid: `admin:salwa:${salwaMobile}`,
          email: 'salwa@approval.ibat.in',
          name: 'Salwa',
          mobile: salwaMobile,
          employeeId: 'ADM-004',
          department: 'Executive Management',
          designation: 'Super Admin',
          passwordHash: salwaHash,
          role: 'super_admin',
          status: 'active',
        });
      }
      salwaAccountNotice = null;
    } else {
      salwaAccountNotice =
        'Existing Salwa account was not found in the fresh database. Set SALWA_ADMIN_MOBILE or configure Salwa via the Super Admin Identity panel without creating duplicate records.';
    }

    isSeeded = true;
  } catch (error) {
    console.error('Database initial setup error:', error);
    throw new Error('Failed to initialize application database state.', {
      cause: error,
    });
  }
}

export function sanitizeUser(user: typeof users.$inferSelect) {
  const { passwordHash, ...safe } = user;
  return {
    ...safe,
    hasPasswordConfigured:
      Boolean(passwordHash) && passwordHash !== 'UNCONFIGURED',
  };
}

export async function getSuperAdminAccountsStatus() {
  try {
    await ensureInitialSetup();
    const admins = await db
      .select()
      .from(users)
      .where(eq(users.role, 'super_admin'))
      .orderBy(users.id);

    return {
      admins: admins.map((a) => ({
        id: a.id,
        name: a.name,
        mobile: a.mobile,
        employeeId: a.employeeId,
        status: a.status,
        hasPasswordConfigured:
          Boolean(a.passwordHash) && a.passwordHash !== 'UNCONFIGURED',
      })),
      salwaAccountNotice,
    };
  } catch (error) {
    console.error('Failed to get super admin accounts status:', error);
    throw new Error('Database query failed.', { cause: error });
  }
}

export async function configureSalwaSuperAdmin(
  mobile: string,
  password: string
) {
  try {
    await ensureInitialSetup();
    const cleanMobile = mobile.replace(/\D/g, '');
    if (cleanMobile.length < 10) {
      throw new Error('Please provide a valid 10-digit mobile number for Salwa.');
    }
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }

    const hash = await bcrypt.hash(password, 12);
    const existingByName = await db
      .select()
      .from(users)
      .where(ilike(users.name, 'Salwa%'));

    if (existingByName.length > 0) {
      const updated = await db
        .update(users)
        .set({
          mobile: cleanMobile,
          passwordHash:
            existingByName[0].passwordHash === 'UNCONFIGURED'
              ? hash
              : existingByName[0].passwordHash,
          role: 'super_admin',
          status: 'active',
          updatedAt: new Date(),
        })
        .where(eq(users.id, existingByName[0].id))
        .returning();
      salwaAccountNotice = null;
      return sanitizeUser(updated[0]);
    }

    const existingByMobile = await db
      .select()
      .from(users)
      .where(eq(users.mobile, cleanMobile));

    if (existingByMobile.length > 0) {
      const updated = await db
        .update(users)
        .set({
          name: 'Salwa',
          role: 'super_admin',
          status: 'active',
          passwordHash:
            existingByMobile[0].passwordHash === 'UNCONFIGURED'
              ? hash
              : existingByMobile[0].passwordHash,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existingByMobile[0].id))
        .returning();
      salwaAccountNotice = null;
      return sanitizeUser(updated[0]);
    }

    const created = await db
      .insert(users)
      .values({
        uid: `admin:salwa:${cleanMobile}`,
        email: 'salwa@approval.ibat.in',
        name: 'Salwa',
        mobile: cleanMobile,
        employeeId: 'ADM-004',
        department: 'Executive Management',
        designation: 'Super Admin',
        passwordHash: hash,
        role: 'super_admin',
        status: 'active',
      })
      .returning();

    salwaAccountNotice = null;
    return sanitizeUser(created[0]);
  } catch (error: any) {
    console.error('Failed to configure Salwa account:', error);
    throw new Error(error.message || 'Failed to configure Salwa account.', {
      cause: error,
    });
  }
}

export async function getOrCreateFirebaseUser(
  uid: string,
  email: string,
  displayName?: string
) {
  try {
    await ensureInitialSetup();

    const byUid = await db.select().from(users).where(eq(users.uid, uid));
    if (byUid.length > 0) {
      return byUid[0];
    }

    if (email) {
      const byEmail = await db
        .select()
        .from(users)
        .where(ilike(users.email, email));
      if (byEmail.length > 0) {
        const updated = await db
          .update(users)
          .set({ uid, updatedAt: new Date() })
          .where(eq(users.id, byEmail[0].id))
          .returning();
        return updated[0];
      }
    }

    // Never automatically grant super_admin to regular users
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const result = await db
      .insert(users)
      .values({
        uid,
        email: email || `${uid}@approval.ibat.in`,
        name: displayName || (email ? email.split('@')[0] : 'Employee'),
        mobile: `9000${randomSuffix}`,
        employeeId: `EMP-${randomSuffix}`,
        department: 'General',
        designation: 'Employee',
        passwordHash: 'UNCONFIGURED',
        role: 'employee',
        status: 'active',
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: { email: email || `${uid}@approval.ibat.in` },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database error in getOrCreateFirebaseUser:', error);
    throw new Error('Failed to synchronize user account.', { cause: error });
  }
}

export async function findUserByMobile(mobile: string) {
  try {
    await ensureInitialSetup();
    const clean = mobile.trim();
    const rows = await db.select().from(users).where(eq(users.mobile, clean));
    return rows[0] || null;
  } catch (error) {
    console.error('Database query failed in findUserByMobile:', error);
    throw new Error('Database query failed. Please try again later.', {
      cause: error,
    });
  }
}

export async function findUserById(id: number) {
  try {
    await ensureInitialSetup();
    const rows = await db.select().from(users).where(eq(users.id, id));
    return rows[0] || null;
  } catch (error) {
    console.error('Database query failed in findUserById:', error);
    throw new Error('Database query failed. Please try again later.', {
      cause: error,
    });
  }
}

export async function setUserPasswordHash(userId: number, plainPassword: string) {
  try {
    const hash = await bcrypt.hash(plainPassword, 12);
    const updated = await db
      .update(users)
      .set({ passwordHash: hash, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return updated[0];
  } catch (error) {
    console.error('Failed to update user password:', error);
    throw new Error('Failed to update password.', { cause: error });
  }
}

export async function listAllUsers(filters?: {
  search?: string;
  department?: string;
  status?: string;
}) {
  try {
    await ensureInitialSetup();
    const all = await db.select().from(users).orderBy(desc(users.createdAt));

    return all
      .filter((u) => {
        if (filters?.department && filters.department !== 'All') {
          if (u.department.toLowerCase() !== filters.department.toLowerCase()) {
            return false;
          }
        }
        if (filters?.status && filters.status !== 'All') {
          if (u.status.toLowerCase() !== filters.status.toLowerCase()) {
            return false;
          }
        }
        if (filters?.search) {
          const q = filters.search.toLowerCase();
          const match =
            u.name.toLowerCase().includes(q) ||
            u.mobile.toLowerCase().includes(q) ||
            u.employeeId.toLowerCase().includes(q) ||
            u.department.toLowerCase().includes(q) ||
            u.designation.toLowerCase().includes(q);
          if (!match) return false;
        }
        return true;
      })
      .map(sanitizeUser);
  } catch (error) {
    console.error('Failed to list users:', error);
    throw new Error('Failed to load employees.', { cause: error });
  }
}

export async function listActiveApprovers() {
  try {
    await ensureInitialSetup();
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.status, 'active'))
      .orderBy(users.role, users.name);
    return rows.map(sanitizeUser);
  } catch (error) {
    console.error('Failed to list active approvers:', error);
    throw new Error('Failed to load approvers.', { cause: error });
  }
}

export async function createEmployeeRecord(input: {
  name: string;
  mobile: string;
  employeeId: string;
  department: string;
  designation: string;
  password: string;
  status?: string;
}) {
  try {
    await ensureInitialSetup();
    const cleanMobile = input.mobile.trim();
    const existingMobile = await db
      .select()
      .from(users)
      .where(eq(users.mobile, cleanMobile));
    if (existingMobile.length > 0) {
      throw new Error('An account with this mobile number already exists.');
    }

    const existingEmpId = await db
      .select()
      .from(users)
      .where(eq(users.employeeId, input.employeeId.trim()));
    if (existingEmpId.length > 0) {
      throw new Error('An employee with this Employee ID already exists.');
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const created = await db
      .insert(users)
      .values({
        uid: `emp:${cleanMobile}:${Date.now()}`,
        email: `${cleanMobile}@approval.ibat.in`,
        name: input.name.trim(),
        mobile: cleanMobile,
        employeeId: input.employeeId.trim(),
        department: input.department.trim() || 'General',
        designation: input.designation.trim() || 'Employee',
        passwordHash,
        // Regular employees must NEVER automatically receive super_admin role
        role: 'employee',
        status: input.status === 'inactive' ? 'inactive' : 'active',
      })
      .returning();

    return sanitizeUser(created[0]);
  } catch (error: any) {
    console.error('Failed to create employee:', error);
    throw new Error(error.message || 'Failed to create employee.', {
      cause: error,
    });
  }
}

export async function updateEmployeeRecord(
  id: number,
  input: {
    name?: string;
    mobile?: string;
    employeeId?: string;
    department?: string;
    designation?: string;
    status?: string;
  }
) {
  try {
    const existing = await findUserById(id);
    if (!existing) {
      throw new Error('Employee not found.');
    }

    if (input.mobile && input.mobile.trim() !== existing.mobile) {
      const dup = await db
        .select()
        .from(users)
        .where(eq(users.mobile, input.mobile.trim()));
      if (dup.length > 0 && dup[0].id !== id) {
        throw new Error('Another employee already uses this mobile number.');
      }
    }

    if (input.employeeId && input.employeeId.trim() !== existing.employeeId) {
      const dupEmp = await db
        .select()
        .from(users)
        .where(eq(users.employeeId, input.employeeId.trim()));
      if (dupEmp.length > 0 && dupEmp[0].id !== id) {
        throw new Error('Another employee already uses this Employee ID.');
      }
    }

    const updated = await db
      .update(users)
      .set({
        name: input.name !== undefined ? input.name.trim() : existing.name,
        mobile:
          input.mobile !== undefined ? input.mobile.trim() : existing.mobile,
        employeeId:
          input.employeeId !== undefined
            ? input.employeeId.trim()
            : existing.employeeId,
        department:
          input.department !== undefined
            ? input.department.trim()
            : existing.department,
        designation:
          input.designation !== undefined
            ? input.designation.trim()
            : existing.designation,
        status: input.status !== undefined ? input.status : existing.status,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();

    return sanitizeUser(updated[0]);
  } catch (error: any) {
    console.error('Failed to update employee:', error);
    throw new Error(error.message || 'Failed to update employee.', {
      cause: error,
    });
  }
}

// CATEGORIES
export async function listCategories(onlyActive = false) {
  try {
    await ensureInitialSetup();
    const rows = onlyActive
      ? await db
          .select()
          .from(requestCategories)
          .where(eq(requestCategories.isActive, true))
          .orderBy(requestCategories.id)
      : await db
          .select()
          .from(requestCategories)
          .orderBy(requestCategories.id);

    return rows.map((r) => ({
      ...r,
      subcategories: (() => {
        try {
          const parsed = JSON.parse(r.subcategories);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      })(),
    }));
  } catch (error) {
    console.error('Failed to list categories:', error);
    throw new Error('Failed to load approval categories.', { cause: error });
  }
}

export async function createCustomCategory(input: {
  name: string;
  icon: string;
  description: string;
  subcategories: string[];
  requiresAmount?: boolean;
  requiresDates?: boolean;
}) {
  try {
    await ensureInitialSetup();
    const cleanName = input.name.trim();
    if (!cleanName) {
      throw new Error('Category name is required.');
    }

    const existing = await db
      .select()
      .from(requestCategories)
      .where(ilike(requestCategories.name, cleanName));

    if (existing.length > 0) {
      throw new Error('A category with this name already exists.');
    }

    const uniqueSubs = Array.from(
      new Set(
        input.subcategories
          .map((s) => s.trim())
          .filter((s) => s.length > 0)
      )
    );

    if (uniqueSubs.length === 0) {
      throw new Error('At least one subcategory is required.');
    }

    const created = await db
      .insert(requestCategories)
      .values({
        name: cleanName,
        icon: input.icon || 'FileText',
        description: input.description?.trim() || '',
        subcategories: JSON.stringify(uniqueSubs),
        requiresAmount: input.requiresAmount ?? true,
        requiresDates: input.requiresDates ?? false,
        isDefault: false,
        isActive: true,
      })
      .returning();

    return {
      ...created[0],
      subcategories: uniqueSubs,
    };
  } catch (error: any) {
    console.error('Failed to create custom category:', error);
    throw new Error(error.message || 'Failed to create category.', {
      cause: error,
    });
  }
}

export async function updateCategoryRecord(
  id: number,
  input: {
    name?: string;
    icon?: string;
    description?: string;
    subcategories?: string[];
    requiresAmount?: boolean;
    requiresDates?: boolean;
    isActive?: boolean;
  }
) {
  try {
    const existingRows = await db
      .select()
      .from(requestCategories)
      .where(eq(requestCategories.id, id));
    if (existingRows.length === 0) {
      throw new Error('Category not found.');
    }
    const existing = existingRows[0];

    if (input.name && input.name.trim().toLowerCase() !== existing.name.toLowerCase()) {
      const dup = await db
        .select()
        .from(requestCategories)
        .where(ilike(requestCategories.name, input.name.trim()));
      if (dup.length > 0 && dup[0].id !== id) {
        throw new Error('Another category with this name already exists.');
      }
    }

    let nextSubs = existing.subcategories;
    if (input.subcategories) {
      const uniqueSubs = Array.from(
        new Set(
          input.subcategories
            .map((s) => s.trim())
            .filter((s) => s.length > 0)
        )
      );
      if (uniqueSubs.length === 0) {
        throw new Error('Category must have at least one subcategory.');
      }
      nextSubs = JSON.stringify(uniqueSubs);
    }

    const updated = await db
      .update(requestCategories)
      .set({
        name: input.name !== undefined ? input.name.trim() : existing.name,
        icon: input.icon !== undefined ? input.icon : existing.icon,
        description:
          input.description !== undefined
            ? input.description.trim()
            : existing.description,
        subcategories: nextSubs,
        requiresAmount:
          input.requiresAmount !== undefined
            ? input.requiresAmount
            : existing.requiresAmount,
        requiresDates:
          input.requiresDates !== undefined
            ? input.requiresDates
            : existing.requiresDates,
        isActive:
          input.isActive !== undefined ? input.isActive : existing.isActive,
      })
      .where(eq(requestCategories.id, id))
      .returning();

    return {
      ...updated[0],
      subcategories: JSON.parse(updated[0].subcategories),
    };
  } catch (error: any) {
    console.error('Failed to update category:', error);
    throw new Error(error.message || 'Failed to update category.', {
      cause: error,
    });
  }
}

export async function deleteCustomCategoryRecord(id: number) {
  try {
    const existingRows = await db
      .select()
      .from(requestCategories)
      .where(eq(requestCategories.id, id));
    if (existingRows.length === 0) {
      throw new Error('Category not found.');
    }
    const existing = existingRows[0];
    if (existing.isDefault) {
      throw new Error(
        'Default system categories cannot be permanently deleted; you can deactivate them instead.'
      );
    }

    // Preserve historical requests by unsetting foreign key while keeping categoryName and subcategory intact
    await db
      .update(requests)
      .set({ categoryId: null })
      .where(eq(requests.categoryId, id));

    await db.delete(requestCategories).where(eq(requestCategories.id, id));
    return true;
  } catch (error: any) {
    console.error('Failed to delete custom category:', error);
    throw new Error(error.message || 'Failed to delete category.', {
      cause: error,
    });
  }
}

// REQUESTS & WORKFLOW
export async function createApprovalRequest(input: {
  employeeId: number;
  employeeName: string;
  categoryId: number;
  categoryName: string;
  subcategory: string;
  title: string;
  description: string;
  amount?: string | null;
  vendor?: string | null;
  paymentDate?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  numDays?: number | null;
  assignedApproverId: number;
  visibility: 'private' | 'group';
  groupId?: number | null;
}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const year = new Date().getFullYear();
    const countRes = await client.query('SELECT COUNT(*)::int AS total FROM requests');
    const seq = (countRes.rows[0]?.total || 0) + 1001;
    const randomTag = Math.floor(10 + Math.random() * 89);
    const requestCode = `REQ-${year}-${seq}${randomTag}`;

    const insertReqSql = `
      INSERT INTO requests (
        request_code, employee_id, category_id, category_name, subcategory,
        title, description, amount, vendor, payment_date,
        start_date, end_date, num_days, assigned_approver_id,
        visibility, group_id, status, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13, $14,
        $15, $16, 'Pending', NOW(), NOW()
      ) RETURNING *
    `;

    const reqRes = await client.query(insertReqSql, [
      requestCode,
      input.employeeId,
      input.categoryId,
      input.categoryName,
      input.subcategory,
      input.title.trim(),
      input.description.trim(),
      input.amount || null,
      input.vendor || null,
      input.paymentDate || null,
      input.startDate || null,
      input.endDate || null,
      input.numDays ?? null,
      input.assignedApproverId,
      input.visibility,
      input.visibility === 'group' && input.groupId ? input.groupId : null,
    ]);

    const createdReq = reqRes.rows[0];

    const insertHistSql = `
      INSERT INTO approval_history (
        request_id, action_by_id, action_by_name, action,
        previous_status, new_status, remarks, created_at
      ) VALUES ($1, $2, $3, 'Submitted', NULL, 'Pending', $4, NOW())
    `;
    await client.query(insertHistSql, [
      createdReq.id,
      input.employeeId,
      input.employeeName,
      'Request submitted for approval.',
    ]);

    // If visibility is 'group' and groupId is provided, automatically share card to group chat
    if (input.visibility === 'group' && input.groupId) {
      await client.query(
        `INSERT INTO group_messages (group_id, sender_id, sender_name, sender_role, message_text, shared_request_id, created_at)
         VALUES ($1, $2, $3, 'employee', $4, $5, NOW())`,
        [
          input.groupId,
          input.employeeId,
          input.employeeName,
          `Shared approval request ${requestCode}: ${input.title.trim()}`,
          createdReq.id,
        ]
      );
    }

    await client.query('COMMIT');
    return createdReq;
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Transaction failed in createApprovalRequest:', error);
    throw new Error(error.message || 'Failed to submit approval request.', {
      cause: error,
    });
  } finally {
    client.release();
  }
}

export async function decideApprovalRequest(input: {
  requestId: number;
  decidedById: number;
  decidedByName: string;
  decidedByRole: string;
  decision: 'Approved' | 'Rejected';
  remarks: string;
}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const reqRows = await client.query(
      'SELECT * FROM requests WHERE id = $1 FOR UPDATE',
      [input.requestId]
    );
    if (reqRows.rows.length === 0) {
      throw new Error('Request not found.');
    }

    const req = reqRows.rows[0];

    // Prevent duplicate decisions
    if (req.status !== 'Pending') {
      throw new Error(
        `This request has already been ${req.status.toLowerCase()}. Duplicate decisions are not permitted.`
      );
    }

    // Only assigned approver or super_admin can decide
    const isAuthorized =
      input.decidedByRole === 'super_admin' ||
      req.assigned_approver_id === input.decidedById;

    if (!isAuthorized) {
      throw new Error(
        'Unauthorized: Only the assigned approver or a Super Admin can approve or reject this request.'
      );
    }

    const updatedRes = await client.query(
      `UPDATE requests
       SET status = $1,
           decided_by_id = $2,
           decision_date = NOW(),
           remarks = $3,
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [input.decision, input.decidedById, input.remarks.trim(), input.requestId]
    );

    await client.query(
      `INSERT INTO approval_history (
         request_id, action_by_id, action_by_name, action,
         previous_status, new_status, remarks, created_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        input.requestId,
        input.decidedById,
        input.decidedByName,
        input.decision,
        req.status,
        input.decision,
        input.remarks.trim() || `${input.decision} by ${input.decidedByName}`,
      ]
    );

    await client.query('COMMIT');
    return updatedRes.rows[0];
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Transaction failed in decideApprovalRequest:', error);
    throw new Error(error.message || 'Failed to process approval decision.', {
      cause: error,
    });
  } finally {
    client.release();
  }
}

export async function listRequestsForUser(
  currentUser: { id: number; role: string },
  filters?: {
    status?: string;
    category?: string;
    employeeId?: number;
    department?: string;
    assignedApproverId?: number;
    startDate?: string;
    endDate?: string;
    search?: string;
    scope?: 'all' | 'my' | 'assigned';
  }
) {
  try {
    await ensureInitialSetup();
    const allReqs = await db
      .select()
      .from(requests)
      .orderBy(desc(requests.createdAt));
    const allUsers = await db.select().from(users);
    const userMap = new Map(allUsers.map((u) => [u.id, u]));

    // Find groups the current user belongs to
    const memberRows = await db
      .select()
      .from(groupMembers)
      .where(eq(groupMembers.userId, currentUser.id));
    const myGroupIds = new Set(memberRows.map((m) => m.groupId));

    const enriched = allReqs.map((r) => {
      const emp = userMap.get(r.employeeId);
      const approver = userMap.get(r.assignedApproverId);
      const decider = r.decidedById ? userMap.get(r.decidedById) : null;
      return {
        ...r,
        employeeName: emp?.name || 'Unknown Employee',
        employeeMobile: emp?.mobile || '',
        employeeCode: emp?.employeeId || '',
        department: emp?.department || 'General',
        designation: emp?.designation || '',
        assignedApproverName: approver?.name || 'Super Admin',
        decidedByName: decider?.name || null,
      };
    });

    return enriched.filter((r) => {
      // Role-based access check
      if (currentUser.role !== 'super_admin') {
        const isOwner = r.employeeId === currentUser.id;
        const isApprover = r.assignedApproverId === currentUser.id;
        const isSharedInMyGroup =
          r.visibility === 'group' && r.groupId && myGroupIds.has(r.groupId);
        if (!isOwner && !isApprover && !isSharedInMyGroup) {
          return false;
        }
      }

      if (filters?.scope === 'my' && r.employeeId !== currentUser.id) {
        return false;
      }
      if (
        filters?.scope === 'assigned' &&
        r.assignedApproverId !== currentUser.id &&
        currentUser.role !== 'super_admin'
      ) {
        return false;
      }

      if (filters?.status && filters.status !== 'All') {
        if (r.status.toLowerCase() !== filters.status.toLowerCase()) {
          return false;
        }
      }
      if (filters?.category && filters.category !== 'All') {
        if (r.categoryName.toLowerCase() !== filters.category.toLowerCase()) {
          return false;
        }
      }
      if (filters?.employeeId) {
        if (r.employeeId !== Number(filters.employeeId)) {
          return false;
        }
      }
      if (filters?.assignedApproverId) {
        if (r.assignedApproverId !== Number(filters.assignedApproverId)) {
          return false;
        }
      }
      if (filters?.department && filters.department !== 'All') {
        if (r.department.toLowerCase() !== filters.department.toLowerCase()) {
          return false;
        }
      }
      if (filters?.startDate) {
        const createdDate = new Date(r.createdAt).toISOString().slice(0, 10);
        if (createdDate < filters.startDate) return false;
      }
      if (filters?.endDate) {
        const createdDate = new Date(r.createdAt).toISOString().slice(0, 10);
        if (createdDate > filters.endDate) return false;
      }
      if (filters?.search) {
        const q = filters.search.toLowerCase();
        const match =
          r.requestCode.toLowerCase().includes(q) ||
          r.title.toLowerCase().includes(q) ||
          r.categoryName.toLowerCase().includes(q) ||
          r.subcategory.toLowerCase().includes(q) ||
          r.employeeName.toLowerCase().includes(q) ||
          r.department.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  } catch (error) {
    console.error('Failed to list requests:', error);
    throw new Error('Failed to load approval requests.', { cause: error });
  }
}

export async function getRequestFullDetails(
  requestId: number,
  currentUser: { id: number; role: string }
) {
  try {
    await ensureInitialSetup();
    const reqRows = await db
      .select()
      .from(requests)
      .where(eq(requests.id, requestId));
    if (reqRows.length === 0) return null;
    const r = reqRows[0];

    // Check authorization
    if (currentUser.role !== 'super_admin') {
      const memberRows = await db
        .select()
        .from(groupMembers)
        .where(eq(groupMembers.userId, currentUser.id));
      const myGroupIds = new Set(memberRows.map((m) => m.groupId));
      const allowed =
        r.employeeId === currentUser.id ||
        r.assignedApproverId === currentUser.id ||
        (r.visibility === 'group' && r.groupId && myGroupIds.has(r.groupId));
      if (!allowed) {
        throw new Error('Unauthorized to view this request.');
      }
    }

    const emp = await findUserById(r.employeeId);
    const approver = await findUserById(r.assignedApproverId);
    const decider = r.decidedById ? await findUserById(r.decidedById) : null;

    const attachments = await db
      .select({
        id: requestAttachments.id,
        requestId: requestAttachments.requestId,
        fileName: requestAttachments.fileName,
        fileType: requestAttachments.fileType,
        fileSize: requestAttachments.fileSize,
        storageKey: requestAttachments.storageKey,
        storageProvider: requestAttachments.storageProvider,
        uploadedById: requestAttachments.uploadedById,
        createdAt: requestAttachments.createdAt,
      })
      .from(requestAttachments)
      .where(eq(requestAttachments.requestId, requestId))
      .orderBy(requestAttachments.id);

    const history = await db
      .select()
      .from(approvalHistory)
      .where(eq(approvalHistory.requestId, requestId))
      .orderBy(approvalHistory.createdAt);

    let groupInfo = null;
    if (r.groupId) {
      const grp = await db
        .select()
        .from(groups)
        .where(eq(groups.id, r.groupId));
      if (grp.length > 0) groupInfo = grp[0];
    }

    return {
      ...r,
      employeeName: emp?.name || 'Unknown Employee',
      employeeMobile: emp?.mobile || '',
      employeeCode: emp?.employeeId || '',
      department: emp?.department || 'General',
      designation: emp?.designation || '',
      assignedApproverName: approver?.name || 'Super Admin',
      assignedApproverMobile: approver?.mobile || '',
      decidedByName: decider?.name || null,
      groupName: groupInfo?.name || null,
      attachments,
      history,
    };
  } catch (error: any) {
    console.error('Failed to get request details:', error);
    throw new Error(error.message || 'Failed to load request details.', {
      cause: error,
    });
  }
}

export async function saveRequestAttachment(input: {
  requestId: number;
  fileName: string;
  fileType: string;
  fileSize: number;
  storageKey: string;
  storageProvider: 'supabase' | 'postgres' | 'r2';
  fileData: string | null;
  uploadedById: number;
}) {
  try {
    const inserted = await db
      .insert(requestAttachments)
      .values({
        requestId: input.requestId,
        fileName: input.fileName,
        fileType: input.fileType,
        fileSize: input.fileSize,
        storageKey: input.storageKey,
        storageProvider: input.storageProvider,
        fileData: input.fileData,
        uploadedById: input.uploadedById,
      })
      .returning({
        id: requestAttachments.id,
        requestId: requestAttachments.requestId,
        fileName: requestAttachments.fileName,
        fileType: requestAttachments.fileType,
        fileSize: requestAttachments.fileSize,
        storageKey: requestAttachments.storageKey,
        storageProvider: requestAttachments.storageProvider,
        createdAt: requestAttachments.createdAt,
      });
    return inserted[0];
  } catch (error) {
    console.error('Failed to save request attachment:', error);
    throw new Error('Failed to store attachment metadata.', { cause: error });
  }
}

export async function getAttachmentRecordById(attachmentId: number) {
  try {
    const rows = await db
      .select()
      .from(requestAttachments)
      .where(eq(requestAttachments.id, attachmentId));
    return rows[0] || null;
  } catch (error) {
    console.error('Failed to get attachment record:', error);
    throw new Error('Failed to load attachment.', { cause: error });
  }
}

// GROUPS & REAL-TIME CHAT
export async function listGroupsForUser(currentUser: {
  id: number;
  role: string;
}) {
  try {
    await ensureInitialSetup();
    const allGroups = await db
      .select()
      .from(groups)
      .orderBy(desc(groups.updatedAt));
    const allMembers = await db.select().from(groupMembers);
    const allMessages = await db
      .select()
      .from(groupMessages)
      .orderBy(desc(groupMessages.createdAt));

    return allGroups
      .filter((g) => {
        if (currentUser.role === 'super_admin') return true;
        return allMembers.some(
          (m) => m.groupId === g.id && m.userId === currentUser.id
        );
      })
      .map((g) => {
        const members = allMembers.filter((m) => m.groupId === g.id);
        const lastMsg = allMessages.find((m) => m.groupId === g.id);
        return {
          ...g,
          memberCount: members.length,
          lastMessage: lastMsg
            ? {
                senderName: lastMsg.senderName,
                messageText: lastMsg.messageText,
                createdAt: lastMsg.createdAt,
              }
            : null,
        };
      });
  } catch (error) {
    console.error('Failed to list groups:', error);
    throw new Error('Failed to load groups.', { cause: error });
  }
}

export async function createGroupRecord(input: {
  name: string;
  description: string;
  createdById: number;
  memberIds: number[];
}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const grpRes = await client.query(
      `INSERT INTO groups (name, description, created_by_id, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW()) RETURNING *`,
      [input.name.trim(), input.description.trim(), input.createdById]
    );
    const grp = grpRes.rows[0];

    const uniqueMemberIds = Array.from(
      new Set([input.createdById, ...input.memberIds])
    );

    for (const uid of uniqueMemberIds) {
      const role = uid === input.createdById ? 'admin' : 'member';
      await client.query(
        `INSERT INTO group_members (group_id, user_id, role, joined_at)
         VALUES ($1, $2, $3, NOW())`,
        [grp.id, uid, role]
      );
    }

    await client.query('COMMIT');
    return grp;
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Failed to create group:', error);
    throw new Error(error.message || 'Failed to create group.', {
      cause: error,
    });
  } finally {
    client.release();
  }
}

export async function updateGroupRecord(
  groupId: number,
  input: { name: string; description: string }
) {
  try {
    const updated = await db
      .update(groups)
      .set({
        name: input.name.trim(),
        description: input.description.trim(),
        updatedAt: new Date(),
      })
      .where(eq(groups.id, groupId))
      .returning();
    return updated[0];
  } catch (error) {
    console.error('Failed to update group:', error);
    throw new Error('Failed to update group details.', { cause: error });
  }
}

export async function getGroupFullDetails(
  groupId: number,
  currentUser: { id: number; role: string }
) {
  try {
    const grpRows = await db
      .select()
      .from(groups)
      .where(eq(groups.id, groupId));
    if (grpRows.length === 0) return null;
    const grp = grpRows[0];

    const memberRows = await db
      .select()
      .from(groupMembers)
      .where(eq(groupMembers.groupId, groupId));

    if (
      currentUser.role !== 'super_admin' &&
      !memberRows.some((m) => m.userId === currentUser.id)
    ) {
      throw new Error('You are not a member of this group.');
    }

    const allUsers = await db.select().from(users);
    const userMap = new Map(allUsers.map((u) => [u.id, sanitizeUser(u)]));

    const members = memberRows
      .map((m) => {
        const u = userMap.get(m.userId);
        if (!u) return null;
        return {
          ...u,
          groupRole: m.role,
          joinedAt: m.joinedAt,
        };
      })
      .filter(Boolean);

    const rawMessages = await db
      .select()
      .from(groupMessages)
      .where(eq(groupMessages.groupId, groupId))
      .orderBy(groupMessages.createdAt);

    const allRequests = await db.select().from(requests);
    const reqMap = new Map(allRequests.map((r) => [r.id, r]));

    const messages = rawMessages.map((msg) => {
      const sharedReq = msg.sharedRequestId
        ? reqMap.get(msg.sharedRequestId)
        : null;
      return {
        ...msg,
        sharedRequest: sharedReq
          ? {
              id: sharedReq.id,
              requestCode: sharedReq.requestCode,
              title: sharedReq.title,
              categoryName: sharedReq.categoryName,
              subcategory: sharedReq.subcategory,
              amount: sharedReq.amount,
              status: sharedReq.status,
              createdAt: sharedReq.createdAt,
            }
          : null,
      };
    });

    return {
      ...grp,
      members,
      messages,
    };
  } catch (error: any) {
    console.error('Failed to get group details:', error);
    throw new Error(error.message || 'Failed to load group details.', {
      cause: error,
    });
  }
}

export async function addGroupMemberRecord(groupId: number, userId: number) {
  try {
    const existing = await db
      .select()
      .from(groupMembers)
      .where(
        and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId))
      );
    if (existing.length > 0) {
      return existing[0];
    }
    const inserted = await db
      .insert(groupMembers)
      .values({
        groupId,
        userId,
        role: 'member',
      })
      .returning();

    await db
      .update(groups)
      .set({ updatedAt: new Date() })
      .where(eq(groups.id, groupId));

    return inserted[0];
  } catch (error) {
    console.error('Failed to add group member:', error);
    throw new Error('Failed to add member to group.', { cause: error });
  }
}

export async function removeGroupMemberRecord(groupId: number, userId: number) {
  try {
    await db
      .delete(groupMembers)
      .where(
        and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId))
      );
    return true;
  } catch (error) {
    console.error('Failed to remove group member:', error);
    throw new Error('Failed to remove member from group.', { cause: error });
  }
}

export async function createGroupMessageRecord(input: {
  groupId: number;
  senderId: number;
  senderName: string;
  senderRole: string;
  messageText: string;
  sharedRequestId?: number | null;
}) {
  try {
    const inserted = await db
      .insert(groupMessages)
      .values({
        groupId: input.groupId,
        senderId: input.senderId,
        senderName: input.senderName,
        senderRole: input.senderRole,
        messageText: input.messageText.trim(),
        sharedRequestId: input.sharedRequestId || null,
      })
      .returning();

    await db
      .update(groups)
      .set({ updatedAt: new Date() })
      .where(eq(groups.id, input.groupId));

    const msg = inserted[0];
    let sharedRequest = null;
    if (msg.sharedRequestId) {
      const reqRows = await db
        .select()
        .from(requests)
        .where(eq(requests.id, msg.sharedRequestId));
      if (reqRows.length > 0) {
        const r = reqRows[0];
        sharedRequest = {
          id: r.id,
          requestCode: r.requestCode,
          title: r.title,
          categoryName: r.categoryName,
          subcategory: r.subcategory,
          amount: r.amount,
          status: r.status,
          createdAt: r.createdAt,
        };
      }
    }

    return {
      ...msg,
      sharedRequest,
    };
  } catch (error) {
    console.error('Failed to create group message:', error);
    throw new Error('Failed to send message.', { cause: error });
  }
}

// NOTIFICATIONS
export async function createNotificationRecord(input: {
  userId: number;
  title: string;
  message: string;
  type: string;
  relatedRequestId?: number | null;
  relatedGroupId?: number | null;
}) {
  try {
    const inserted = await db
      .insert(notifications)
      .values({
        userId: input.userId,
        title: input.title,
        message: input.message,
        type: input.type,
        relatedRequestId: input.relatedRequestId || null,
        relatedGroupId: input.relatedGroupId || null,
        isRead: false,
      })
      .returning();
    return inserted[0];
  } catch (error) {
    console.error('Failed to create notification:', error);
    throw new Error('Failed to create notification.', { cause: error });
  }
}

export async function listUserNotifications(userId: number) {
  try {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(100);
  } catch (error) {
    console.error('Failed to list notifications:', error);
    throw new Error('Failed to load notifications.', { cause: error });
  }
}

export async function markNotificationRead(id: number, userId: number) {
  try {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
    return true;
  } catch (error) {
    console.error('Failed to mark notification read:', error);
    throw new Error('Failed to update notification.', { cause: error });
  }
}

export async function markAllNotificationsRead(userId: number) {
  try {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, userId));
    return true;
  } catch (error) {
    console.error('Failed to mark all notifications read:', error);
    throw new Error('Failed to update notifications.', { cause: error });
  }
}

export async function saveUserPushSubscription(input: {
  userId: number;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
}) {
  try {
    const inserted = await db
      .insert(pushSubscriptions)
      .values({
        userId: input.userId,
        endpoint: input.endpoint,
        p256dh: input.p256dh,
        auth: input.auth,
        userAgent: input.userAgent || null,
      })
      .onConflictDoUpdate({
        target: pushSubscriptions.endpoint,
        set: {
          userId: input.userId,
          p256dh: input.p256dh,
          auth: input.auth,
          userAgent: input.userAgent || null,
        },
      })
      .returning();
    return inserted[0];
  } catch (error) {
    console.error('Failed to save push subscription:', error);
    throw new Error('Failed to save push subscription.', { cause: error });
  }
}

export async function getRecentActivities(limit = 15) {
  try {
    const rows = await db
      .select()
      .from(approvalHistory)
      .orderBy(desc(approvalHistory.createdAt))
      .limit(limit);
    const allReqs = await db.select().from(requests);
    const reqMap = new Map(allReqs.map((r) => [r.id, r]));

    return rows.map((h) => {
      const req = reqMap.get(h.requestId);
      return {
        ...h,
        requestCode: req?.requestCode || `#${h.requestId}`,
        requestTitle: req?.title || 'Request',
        categoryName: req?.categoryName || '',
      };
    });
  } catch (error) {
    console.error('Failed to get recent activities:', error);
    throw new Error('Failed to load recent activities.', { cause: error });
  }
}
