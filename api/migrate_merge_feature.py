"""
Database migration script for transaction merge feature.

This script adds the following changes to the database:
1. Add merge_count column to receipts table
2. Create receipt_hash_history table
"""

import os
from sqlalchemy import create_engine, text

password = os.getenv("POSTGRES_PASSWORD")
engine = create_engine(f"postgresql://postgres:{password}@db/postgres")


def migrate():
    """Run the migration."""
    with engine.connect() as conn:
        # Start transaction
        trans = conn.begin()
        
        try:
            # Check if merge_count column exists
            result = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='receipts' AND column_name='merge_count'
            """))
            
            if not result.fetchone():
                print("Adding merge_count column to receipts table...")
                conn.execute(text("""
                    ALTER TABLE receipts 
                    ADD COLUMN merge_count INTEGER NOT NULL DEFAULT 0
                """))
                print("✓ merge_count column added")
            else:
                print("✓ merge_count column already exists")
            
            # Check if receipt_hash_history table exists
            result = conn.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_name='receipt_hash_history'
            """))
            
            if not result.fetchone():
                print("Creating receipt_hash_history table...")
                conn.execute(text("""
                    CREATE TABLE receipt_hash_history (
                        id SERIAL PRIMARY KEY,
                        hash VARCHAR(64) NOT NULL UNIQUE,
                        original_receipt_id INTEGER REFERENCES receipts(id) ON DELETE SET NULL,
                        uploaded_at TIMESTAMP NOT NULL DEFAULT NOW(),
                        deleted_at TIMESTAMP NULL,
                        reason VARCHAR(50) NULL
                    )
                """))
                print("✓ receipt_hash_history table created")
                
                # Populate hash history with existing receipts
                print("Populating receipt_hash_history with existing receipts...")
                conn.execute(text("""
                    INSERT INTO receipt_hash_history (hash, original_receipt_id, uploaded_at)
                    SELECT content_hash, id, created_at
                    FROM receipts
                    ON CONFLICT (hash) DO NOTHING
                """))
                print("✓ receipt_hash_history populated")
            else:
                print("✓ receipt_hash_history table already exists")
            
            # Commit transaction
            trans.commit()
            print("\n✅ Migration completed successfully!")
            
        except Exception as e:
            # Rollback on error
            trans.rollback()
            print(f"\n❌ Migration failed: {str(e)}")
            raise


if __name__ == "__main__":
    migrate()
