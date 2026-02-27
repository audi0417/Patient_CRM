/**
 * Tenant Provisioning Service
 *
 * Handles the complete lifecycle of tenant provisioning:
 * 1. Create organization record
 * 2. Create default group ("全部病患")
 * 3. Create admin user with generated password
 * 4. Send welcome email (if SMTP configured)
 * 5. Log provisioning event to audit_logs
 */

const crypto = require('crypto');
const { queryOne, execute, transaction } = require('../database/helpers');
const { getDefaultModuleSettings } = require('../config/modules');
const { hashPassword } = require('../utils/password');
const EmailService = require('./emailService');

/**
 * Provision a new tenant (organization + admin + defaults)
 *
 * @param {Object} options
 * @param {string} options.name - Organization name
 * @param {string} options.slug - URL-safe identifier
 * @param {string} options.contactName - Contact person name
 * @param {string} options.contactEmail - Contact email
 * @param {string} [options.plan='basic'] - Subscription plan
 * @param {number} [options.maxUsers] - Max users (auto from plan if omitted)
 * @param {number} [options.maxPatients] - Max patients (auto from plan if omitted)
 * @param {string} [options.domain] - Organization domain
 * @param {string} [options.billingEmail] - Billing email
 * @param {string} [options.contactPhone] - Contact phone
 * @param {Object} [options.settings] - Custom settings
 * @param {string} [options.provisionedBy] - User ID who initiated provisioning
 * @returns {Promise<Object>} { organization, adminCredentials, provisioningDetails }
 */
async function provisionTenant({
  name,
  slug,
  contactName,
  contactEmail,
  plan = 'basic',
  maxUsers,
  maxPatients,
  domain,
  billingEmail,
  contactPhone,
  settings,
  provisionedBy
}) {
  // Validate required fields
  const missing = [];
  if (!name || !name.trim()) missing.push('name');
  if (!slug || !slug.trim()) missing.push('slug');
  if (!contactName || !contactName.trim()) missing.push('contactName');
  if (!contactEmail || !contactEmail.trim()) missing.push('contactEmail');

  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }

  // Validate slug format
  if (!/^[a-z0-9-]+$/.test(slug)) {
    throw new Error('Slug must contain only lowercase letters, numbers, and hyphens');
  }

  // Validate email format
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    throw new Error('Invalid email format');
  }

  // Check slug uniqueness
  const existing = await queryOne('SELECT id, name FROM organizations WHERE slug = ?', [slug]);
  if (existing) {
    throw new Error(`Slug "${slug}" is already in use by organization "${existing.name}"`);
  }

  // Plan limits
  const planLimits = {
    basic: { maxUsers: 10, maxPatients: 1000 },
    professional: { maxUsers: 50, maxPatients: 10000 },
    enterprise: { maxUsers: 9999, maxPatients: 99999 }
  };
  const limits = planLimits[plan] || planLimits.basic;

  const now = new Date().toISOString();
  const orgId = `org_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const adminId = `user_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const groupId = `grp_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const generatedPassword = crypto.randomBytes(8).toString('base64').slice(0, 12);

  const defaultSettings = {
    modules: getDefaultModuleSettings(),
    ...(settings || {})
  };

  await transaction(async () => {
    // Step 1: Create organization
    await execute(`
      INSERT INTO organizations (
        id, name, slug, domain, plan, "maxUsers", "maxPatients",
        "isActive", settings, "billingEmail", "contactName", "contactPhone", "contactEmail",
        "subscriptionStartDate", "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      orgId,
      name.trim(),
      slug.trim().toLowerCase(),
      domain || null,
      plan,
      maxUsers || limits.maxUsers,
      maxPatients || limits.maxPatients,
      1, // isActive
      JSON.stringify(defaultSettings),
      billingEmail || contactEmail.trim(),
      contactName.trim(),
      contactPhone || null,
      contactEmail.trim(),
      now,
      now,
      now
    ]);

    // Step 2: Create default group
    await execute(`
      INSERT INTO groups (
        id, name, description, "organizationId", "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [
      groupId,
      '全部病患',
      '系統預設群組 - 包含所有病患',
      orgId,
      now,
      now
    ]);

    // Step 3: Create admin user
    const adminUsername = slug.trim().toLowerCase();
    const hashedPassword = await hashPassword(generatedPassword);

    await execute(`
      INSERT INTO users (
        id, username, password, name, email, role,
        "organizationId", "isActive", "isFirstLogin", "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?)
    `, [
      adminId,
      adminUsername,
      hashedPassword,
      `${name.trim()} 管理員`,
      contactEmail.trim(),
      'admin',
      orgId,
      now,
      now
    ]);

    // Step 4: Audit log
    await execute(`
      INSERT INTO audit_logs (
        id, "userId", action, resource, "resourceId", details, "organizationId", "createdAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      `audit_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      provisionedBy || 'system',
      'create',
      'organization',
      orgId,
      JSON.stringify({ name, slug, plan, contactEmail }),
      orgId,
      now
    ]);
  });

  // Step 5: Send welcome email (non-blocking, don't fail provisioning if email fails)
  let emailSent = false;
  if (EmailService.isEnabled()) {
    try {
      await EmailService.sendUserCredentials({
        to: contactEmail.trim(),
        userName: contactName.trim(),
        username: slug.trim().toLowerCase(),
        password: generatedPassword,
        organizationName: name.trim()
      });
      emailSent = true;
    } catch (err) {
      console.warn(`[Provisioning] Welcome email failed: ${err.message}`);
    }
  }

  // Return result
  const organization = await queryOne('SELECT * FROM organizations WHERE id = ?', [orgId]);
  if (organization.settings) {
    try { organization.settings = JSON.parse(organization.settings); } catch { /* keep raw */ }
  }

  return {
    organization,
    adminCredentials: {
      username: slug.trim().toLowerCase(),
      password: generatedPassword,
      email: contactEmail.trim(),
      message: '請妥善保存此密碼，提供給客戶進行首次登入'
    },
    provisioningDetails: {
      orgId,
      adminId,
      groupId,
      emailSent,
      provisionedAt: now,
      provisionedBy: provisionedBy || 'system'
    }
  };
}

/**
 * Suspend a tenant
 * @param {string} orgId - Organization ID
 * @param {string} [suspendedBy] - User ID who initiated suspension
 * @returns {Promise<Object>} Updated organization
 */
async function suspendTenant(orgId, suspendedBy) {
  const org = await queryOne('SELECT * FROM organizations WHERE id = ?', [orgId]);
  if (!org) {
    throw new Error('Organization not found');
  }

  const now = new Date().toISOString();

  await execute(
    'UPDATE organizations SET "isActive" = 0, "updatedAt" = ? WHERE id = ?',
    [now, orgId]
  );

  // Audit log
  await execute(`
    INSERT INTO audit_logs (
      id, "userId", action, resource, "resourceId", details, "organizationId", "createdAt"
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    `audit_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    suspendedBy || 'system',
    'update',
    'organization',
    orgId,
    JSON.stringify({ action: 'suspend', name: org.name }),
    orgId,
    now
  ]);

  return await queryOne('SELECT * FROM organizations WHERE id = ?', [orgId]);
}

/**
 * Reactivate a suspended tenant
 * @param {string} orgId - Organization ID
 * @param {string} [reactivatedBy] - User ID who initiated reactivation
 * @returns {Promise<Object>} Updated organization
 */
async function reactivateTenant(orgId, reactivatedBy) {
  const org = await queryOne('SELECT * FROM organizations WHERE id = ?', [orgId]);
  if (!org) {
    throw new Error('Organization not found');
  }

  const now = new Date().toISOString();

  await execute(
    'UPDATE organizations SET "isActive" = 1, "updatedAt" = ? WHERE id = ?',
    [now, orgId]
  );

  // Audit log
  await execute(`
    INSERT INTO audit_logs (
      id, "userId", action, resource, "resourceId", details, "organizationId", "createdAt"
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    `audit_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    reactivatedBy || 'system',
    'update',
    'organization',
    orgId,
    JSON.stringify({ action: 'reactivate', name: org.name }),
    orgId,
    now
  ]);

  return await queryOne('SELECT * FROM organizations WHERE id = ?', [orgId]);
}

module.exports = {
  provisionTenant,
  suspendTenant,
  reactivateTenant
};
