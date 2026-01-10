import mysql from 'mysql2/promise';

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'fleet_db',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 60000,
  ssl: (process.env.DB_HOST && process.env.DB_HOST !== 'localhost')
    ? { rejectUnauthorized: false }
    : false
};

const pool = mysql.createPool(dbConfig);

export const auditLogger = {
  async log({ tenantId, userId, action, entity, entityId, metadata, req }) {
    try {
      const ip = req?.ip || req?.connection?.remoteAddress || null;
      const userAgent = req?.headers?.['user-agent'] || null;

      const query = `
        INSERT INTO audit_logs (
          tenant_id,
          user_id,
          action,
          entity,
          entity_id,
          metadata,
          ip,
          user_agent
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        tenantId || null,
        userId || null,
        action,
        entity,
        entityId || null,
        metadata ? JSON.stringify(metadata) : null,
        ip,
        userAgent
      ];

      await pool.execute(query, params);
      return true;
    } catch (error) {
      console.error('Audit log error:', error);
      return false;
    }
  },

  async getLogs({ tenantId, userId, entity, action, limit = 100, offset = 0 }) {
    try {
      let query = `
        SELECT
          id,
          tenant_id,
          user_id,
          action,
          entity,
          entity_id,
          metadata,
          ip,
          user_agent,
          created_at
        FROM audit_logs
        WHERE 1=1
      `;
      let params = [];

      if (tenantId) {
        query += ' AND tenant_id = ?';
        params.push(tenantId);
      }

      if (userId) {
        query += ' AND user_id = ?';
        params.push(userId);
      }

      if (entity) {
        query += ' AND entity = ?';
        params.push(entity);
      }

      if (action) {
        query += ' AND action = ?';
        params.push(action);
      }

      query += ` ORDER BY created_at DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;

      const [rows] = await pool.execute(query, params);
      return rows;
    } catch (error) {
      console.error('Get audit logs error:', error);
      throw new Error('DB_ERROR');
    }
  },

  async getLogById(logId) {
    try {
      const query = `
        SELECT
          id,
          tenant_id,
          user_id,
          action,
          entity,
          entity_id,
          metadata,
          ip,
          user_agent,
          created_at
        FROM audit_logs
        WHERE id = ?
      `;
      const [rows] = await pool.execute(query, [logId]);
      return rows[0] || null;
    } catch (error) {
      console.error('Get audit log by ID error:', error);
      throw new Error('DB_ERROR');
    }
  }
};

export default auditLogger;
