import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

db_url = os.getenv("DIRECT_URL")
print(f"Connecting to database to check pgvector...")
try:
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    cur.execute("SELECT * FROM pg_extension WHERE extname = 'vector';")
    result = cur.fetchall()
    print("pgvector extension check result:", result)
    cur.close()
    conn.close()
except Exception as e:
    print("Error checking pgvector:", e)
