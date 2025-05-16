require('dotenv').config();
const pgPromise = require('pg-promise')();

// Use the same connection string as the application
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres';
console.log(`Connecting to PostgreSQL using: ${connectionString.replace(/:[^:]*@/, ':****@')}`);

// Connect to the database
const db = pgPromise(connectionString);

async function fixDatabase() {
  try {
    console.log('Fixing database issues...');
    
    // 1. Add missing columns
    console.log('Adding missing columns...');
    try {
      await db.none(`
        ALTER TABLE IF EXISTS issued_credentials 
        ADD COLUMN IF NOT EXISTS invitation_url TEXT,
        ADD COLUMN IF NOT EXISTS icon_url TEXT,
        ADD COLUMN IF NOT EXISTS homepage_url TEXT,
        ADD COLUMN IF NOT EXISTS ai_description TEXT,
        ADD COLUMN IF NOT EXISTS additional_data TEXT
      `);
      console.log('Successfully added missing columns');
    } catch (err) {
      console.error('Error adding columns:', err);
    }
    
    // 2. List all records in the table
    try {
      const credentials = await db.any('SELECT * FROM issued_credentials');
      console.log(`Found ${credentials.length} records in issued_credentials table`);
      
      credentials.forEach((cred, index) => {
        console.log(`Record ${index + 1}:`);
        console.log(`  ID: ${cred.id}`);
        console.log(`  Credential ID: ${cred.credential_id}`);
        console.log(`  Issuer Tenant ID: ${cred.issuer_tenant_id}`);
      });
    } catch (err) {
      console.error('Error listing credentials:', err);
    }
    
    console.log('Database fix complete!');
  } catch (error) {
    console.error('Database fix failed:', error);
  } finally {
    pgPromise.end(); // Close database connection
  }
}

fixDatabase().catch(console.error); 