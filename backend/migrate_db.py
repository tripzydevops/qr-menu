import database
from sqlalchemy import text

def migrate():
    engine = database.engine
    with engine.connect() as conn:
        print("Creating new tables...")
        import models
        models.Base.metadata.create_all(bind=engine)
        
        print("Checking if registerSessionId column exists in Payment...")
        # Check if column exists
        res = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='Payment' AND column_name='registerSessionId';
        """)).fetchone()
        
        if not res:
            print("Adding registerSessionId column to Payment table...")
            conn.execute(text('ALTER TABLE "Payment" ADD COLUMN "registerSessionId" VARCHAR;'))
            conn.execute(text('ALTER TABLE "Payment" ADD CONSTRAINT fk_payment_registersession FOREIGN KEY ("registerSessionId") REFERENCES "RegisterSession"(id) ON DELETE SET NULL;'))
            conn.commit()
            print("Migration completed successfully!")
        else:
            print("registerSessionId column already exists.")

if __name__ == "__main__":
    migrate()
