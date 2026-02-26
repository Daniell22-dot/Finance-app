import sqlite3
import os

def check_database():
    # Connect to database
    conn = sqlite3.connect('finance.db')
    cursor = conn.cursor()
    
    # Get all tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    
    print("Database Tables:")
    print("-" * 30)
    
    for table in tables:
        table_name = table[0]
        print(f"\n Table: {table_name}")
        
        # Get table structure
        cursor.execute(f"PRAGMA table_info({table_name});")
        columns = cursor.fetchall()
        
        for column in columns:
            print(f"  └─ {column[1]} ({column[2]})")
        
        # Get row count
        cursor.execute(f"SELECT COUNT(*) FROM {table_name};")
        count = cursor.fetchone()[0]
        print(f"   Rows: {count}")
        
        # Show first few rows
        if count > 0:
            cursor.execute(f"SELECT * FROM {table_name} LIMIT 3;")
            rows = cursor.fetchall()
            print(f"   Sample data:")
            for row in rows:
                print(f"     {row}")
    
    conn.close()
    print("\n" + "=" * 50)
    print(" Database check complete!")

if __name__ == "__main__":
    check_database()