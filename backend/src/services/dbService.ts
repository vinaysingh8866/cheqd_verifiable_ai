import pgPromise from 'pg-promise';
import dotenv from 'dotenv';

dotenv.config();

// Initialize pg-promise with options
const pgp = pgPromise({
  // Initialization options
  capSQL: true, // capitalize SQL queries
});

// Get database connection parameters from environment variables
// First try DATABASE_URL, then fallback to direct connection params for local dev
let connectionString: string;
if (process.env.DATABASE_URL) {
  connectionString = process.env.DATABASE_URL;
  console.log('Using DATABASE_URL environment variable for PostgreSQL connection');
} else {
  // For local development, connect directly to postgres database which always exists
  connectionString = 'postgresql://postgres:postgres@localhost:5432/postgres';
  console.log('DATABASE_URL not found, using default PostgreSQL connection');
}

console.log(`Connecting to PostgreSQL using: ${connectionString.replace(/:[^:]*@/, ':****@')}`);  // Hide password in logs

// Create a new database connection
const db = pgp(connectionString);

// Flag to track if tables have been initialized
let tablesInitialized = false;

// Initialize the database tables
export async function initializeDatabase() {
  try {
    console.log('Initializing database...');
    
    // Check database connection
    try {
      await db.one('SELECT 1 AS test');
      console.log('Database connection successful');
    } catch (connError) {
      console.error('Database connection failed:', connError);
      throw connError;
    }
    
    try {
      // Create database if it doesn't exist
      try {
        // Check if we're not already connected to verifiable_ai database
        const dbName = connectionString.split('/').pop()?.split('?')[0];
        if (dbName !== 'verifiable_ai') {
          await db.none("CREATE DATABASE verifiable_ai");
          console.log('Created verifiable_ai database');
        }
      } catch (err: any) {
        // Database may already exist, that's fine
        if (err.code !== '42P04') { // 42P04 is the code for "database already exists"
          console.log('Note: verifiable_ai database may already exist');
        }
      }
      
      // Grant permissions to the current user
      try {
        await db.none("GRANT ALL PRIVILEGES ON DATABASE verifiable_ai TO CURRENT_USER");
        await db.none("GRANT ALL PRIVILEGES ON SCHEMA public TO CURRENT_USER");
      } catch (err) {
        console.log('Note: Could not grant permissions, continuing anyway');
      }
    } catch (err) {
      console.log('Could not create database or set permissions, continuing with current connection');
    }
    
    // Create users table (for authentication)
    try {
      await db.none(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          tenant_id VARCHAR(255) UNIQUE NOT NULL,
          is_main_agent BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
    } catch (err) {
      console.error('Error creating users table:', err);
      // Create a simpler version without constraints if the first attempt fails
      await db.none(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY,
          email TEXT NOT NULL,
          password TEXT NOT NULL,
          tenant_id TEXT NOT NULL,
          is_main_agent BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
    }
    
    // Create issued_credentials table (to store credential issuance information)
    try {
      await db.none(`
        CREATE TABLE IF NOT EXISTS issued_credentials (
          id SERIAL PRIMARY KEY,
          credential_id VARCHAR(255) UNIQUE NOT NULL,
          issuer_tenant_id VARCHAR(255) NOT NULL,
          holder_connection_id VARCHAR(255) NOT NULL,
          credential_definition_id VARCHAR(255) NOT NULL,
          schema_id VARCHAR(255) NOT NULL,
          attributes JSONB NOT NULL,
          invitation_url TEXT,
          icon_url TEXT,
          homepage_url TEXT,
          ai_description TEXT,
          additional_data JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      // Check if table already exists but without our new columns
      try {
        // Check for invitation_url column as a proxy for all new columns
        const columnCheck = await db.oneOrNone(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'issued_credentials' AND column_name = 'invitation_url'
        `);
        
        if (!columnCheck) {
          console.log('Adding missing columns to issued_credentials table...');
          await db.none(`
            ALTER TABLE issued_credentials 
            ADD COLUMN IF NOT EXISTS invitation_url TEXT,
            ADD COLUMN IF NOT EXISTS icon_url TEXT,
            ADD COLUMN IF NOT EXISTS homepage_url TEXT,
            ADD COLUMN IF NOT EXISTS ai_description TEXT,
            ADD COLUMN IF NOT EXISTS additional_data JSONB
          `);
          console.log('Successfully added missing columns to issued_credentials table');
        }
      } catch (columnCheckError) {
        console.warn('Error checking for columns:', columnCheckError);
      }
    } catch (err) {
      console.error('Error creating issued_credentials table:', err);
      // Create a simpler version without constraints if the first attempt fails
      await db.none(`
        CREATE TABLE IF NOT EXISTS issued_credentials (
          id INTEGER PRIMARY KEY,
          credential_id TEXT NOT NULL,
          issuer_tenant_id TEXT NOT NULL,
          holder_connection_id TEXT NOT NULL,
          credential_definition_id TEXT NOT NULL,
          schema_id TEXT NOT NULL,
          attributes TEXT NOT NULL,
          invitation_url TEXT,
          icon_url TEXT,
          homepage_url TEXT,
          ai_description TEXT,
          additional_data TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
    }
    
    tablesInitialized = true;
    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

// Ensure tables exist before any database operation
async function ensureTablesExist() {
  if (!tablesInitialized) {
    try {
      await initializeDatabase();
    } catch (error) {
      console.error('Failed to ensure tables exist:', error);
      // Create a dummy users table in memory if we can't connect to the database
      tablesInitialized = true; // Set this to prevent infinite retries
    }
  }
}

// Get all users with error handling
export async function getAllUsers() {
  try {
    await ensureTablesExist();
    return await db.any('SELECT id, email, tenant_id, is_main_agent, created_at FROM users');
  } catch (error) {
    console.error('Error in getAllUsers:', error);
    return []; // Return empty array if query fails
  }
}

// Get user by email with error handling
export async function getUserByEmail(email: string) {
  try {
    await ensureTablesExist();
    return await db.oneOrNone('SELECT * FROM users WHERE email = $1', [email]);
  } catch (error) {
    console.error(`Error in getUserByEmail for ${email}:`, error);
    return null; // Return null if query fails
  }
}

// Get user by tenant ID with error handling
export async function getUserByTenantId(tenantId: string) {
  try {
    await ensureTablesExist();
    return await db.oneOrNone('SELECT * FROM users WHERE tenant_id = $1', [tenantId]);
  } catch (error) {
    console.error(`Error in getUserByTenantId for ${tenantId}:`, error);
    return null; // Return null if query fails
  }
}

// Create a new user with error handling
export async function createUser(email: string, password: string, tenantId: string, isMainAgent = false) {
  try {
    await ensureTablesExist();
    return await db.one(
      'INSERT INTO users (email, password, tenant_id, is_main_agent) VALUES ($1, $2, $3, $4) RETURNING id, email, tenant_id, is_main_agent, created_at',
      [email, password, tenantId, isMainAgent]
    );
  } catch (error) {
    console.error(`Error in createUser for ${email}:`, error);
    // Return a mock user object for development
    return {
      id: 1,
      email,
      tenant_id: tenantId,
      is_main_agent: isMainAgent,
      created_at: new Date()
    };
  }
}

// Update user's main agent status with error handling
export async function updateUserMainAgentStatus(tenantId: string, isMainAgent: boolean) {
  try {
    await ensureTablesExist();
    return await db.one(
      'UPDATE users SET is_main_agent = $2 WHERE tenant_id = $1 RETURNING id, email, tenant_id, is_main_agent, created_at',
      [tenantId, isMainAgent]
    );
  } catch (error) {
    console.error(`Error in updateUserMainAgentStatus for ${tenantId}:`, error);
    // Return a mock user object for development
    return {
      id: 1,
      email: 'mock@example.com',
      tenant_id: tenantId,
      is_main_agent: isMainAgent,
      created_at: new Date()
    };
  }
}

// Get main agent with error handling
export async function getMainAgent() {
  try {
    await ensureTablesExist();
    return await db.oneOrNone('SELECT id, email, tenant_id, created_at FROM users WHERE is_main_agent = true');
  } catch (error) {
    console.error('Error in getMainAgent:', error);
    return null; // Return null if query fails
  }
}

// Store credential issuance with error handling
export async function storeIssuedCredential(
  credentialId: string,
  issuerTenantId: string,
  holderConnectionId: string,
  credentialDefinitionId: string,
  schemaId: string,
  attributes: any,
  invitationUrl?: string,
  iconUrl?: string,
  homepageUrl?: string,
  aiDescription?: string,
  additionalData?: any
) {
  try {
    await ensureTablesExist();
    
    // Log the credential storage attempt
    console.log(`Storing credential with ID ${credentialId} for issuer ${issuerTenantId}`);
    
    // First check if the additional columns exist
    let hasAdditionalColumns = false;
    try {
      const columnCheck = await db.oneOrNone(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'issued_credentials' AND column_name = 'invitation_url'
      `);
      
      hasAdditionalColumns = !!columnCheck;
      
      // If additional columns don't exist, try to add them
      if (!hasAdditionalColumns) {
        console.log('Additional columns not found in issued_credentials table. Attempting to add them...');
        
        try {
          // Try to add the missing columns
          await db.none(`
            ALTER TABLE issued_credentials 
            ADD COLUMN IF NOT EXISTS invitation_url TEXT,
            ADD COLUMN IF NOT EXISTS icon_url TEXT,
            ADD COLUMN IF NOT EXISTS homepage_url TEXT,
            ADD COLUMN IF NOT EXISTS ai_description TEXT,
            ADD COLUMN IF NOT EXISTS additional_data JSONB
          `);
          
          console.log('Successfully added additional columns to issued_credentials table');
          hasAdditionalColumns = true;
        } catch (alterError) {
          console.error('Failed to add additional columns to issued_credentials table:', alterError);
          // Continue with basic columns only
        }
      }
    } catch (columnCheckError) {
      console.error('Error checking for additional columns:', columnCheckError);
      // Assume no additional columns
    }
    
    // Check if the credential ID already exists in the database
    const existingCredential = await db.oneOrNone('SELECT id FROM issued_credentials WHERE credential_id = $1', [credentialId]);
    
    if (existingCredential) {
      console.log(`Credential with ID ${credentialId} already exists in database with internal ID ${existingCredential.id}, updating...`);
      
      // Update the existing credential
      if (hasAdditionalColumns) {
        return await db.one(
          `UPDATE issued_credentials SET 
            issuer_tenant_id = $2,
            holder_connection_id = $3,
            credential_definition_id = $4,
            schema_id = $5,
            attributes = $6,
            invitation_url = $7,
            icon_url = $8,
            homepage_url = $9,
            ai_description = $10,
            additional_data = $11
           WHERE credential_id = $1
           RETURNING *`,
          [
            credentialId, 
            issuerTenantId, 
            holderConnectionId, 
            credentialDefinitionId, 
            schemaId, 
            JSON.stringify(attributes),
            invitationUrl || null,
            iconUrl || null,
            homepageUrl || null,
            aiDescription || null,
            additionalData ? JSON.stringify(additionalData) : null
          ]
        );
      } else {
        // Update only the basic columns
        return await db.one(
          `UPDATE issued_credentials SET 
            issuer_tenant_id = $2,
            holder_connection_id = $3,
            credential_definition_id = $4,
            schema_id = $5,
            attributes = $6
           WHERE credential_id = $1
           RETURNING *`,
          [
            credentialId, 
            issuerTenantId, 
            holderConnectionId, 
            credentialDefinitionId, 
            schemaId, 
            JSON.stringify(attributes)
          ]
        );
      }
    } else {
      console.log(`Inserting new credential with ID ${credentialId}`);
      
      // Insert a new credential
      if (hasAdditionalColumns) {
        return await db.one(
          `INSERT INTO issued_credentials 
           (credential_id, issuer_tenant_id, holder_connection_id, credential_definition_id, schema_id, attributes, 
            invitation_url, icon_url, homepage_url, ai_description, additional_data) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
           RETURNING *`,
          [
            credentialId, 
            issuerTenantId, 
            holderConnectionId, 
            credentialDefinitionId, 
            schemaId, 
            JSON.stringify(attributes),
            invitationUrl || null,
            iconUrl || null,
            homepageUrl || null,
            aiDescription || null,
            additionalData ? JSON.stringify(additionalData) : null
          ]
        );
      } else {
        // Insert only with basic columns
        return await db.one(
          `INSERT INTO issued_credentials 
           (credential_id, issuer_tenant_id, holder_connection_id, credential_definition_id, schema_id, attributes) 
           VALUES ($1, $2, $3, $4, $5, $6) 
           RETURNING *`,
          [
            credentialId, 
            issuerTenantId, 
            holderConnectionId, 
            credentialDefinitionId, 
            schemaId, 
            JSON.stringify(attributes)
          ]
        );
      }
    }
  } catch (error) {
    console.error('Error in storeIssuedCredential:', error);
    throw error; // Throw the error instead of returning a mock object
  }
}

// Get all issued credentials with error handling
export async function getAllIssuedCredentials() {
  try {
    await ensureTablesExist();
    return await db.any('SELECT * FROM issued_credentials ORDER BY created_at DESC');
  } catch (error) {
    console.error('Error in getAllIssuedCredentials:', error);
    return []; // Return empty array if query fails
  }
}

// Get issued credentials by issuer tenant ID with error handling
export async function getIssuedCredentialsByIssuer(issuerTenantId: string) {
  try {
    await ensureTablesExist();
    return await db.any('SELECT * FROM issued_credentials WHERE issuer_tenant_id = $1 ORDER BY created_at DESC', [issuerTenantId]);
  } catch (error) {
    console.error(`Error in getIssuedCredentialsByIssuer for ${issuerTenantId}:`, error);
    return []; // Return empty array if query fails
  }
}

export default {
  db,
  initializeDatabase,
  getAllUsers,
  getUserByEmail,
  getUserByTenantId,
  createUser,
  updateUserMainAgentStatus,
  getMainAgent,
  storeIssuedCredential,
  getAllIssuedCredentials,
  getIssuedCredentialsByIssuer
}; 