import os
import csv
import sqlite3
from pathlib import Path
import time

# Configuration
REPO_CANDIDATES = [
    Path("leetcode-companywise-interview-questions"),
    Path("snehasishroy-leetcode-companywise-interview-questions")
]
DB_NAME = "prisma/leetcode_tracker.db" if Path("prisma").exists() else "leetcode_tracker.db"

def find_repo_dir():
    for candidate in REPO_CANDIDATES:
        if candidate.exists() and candidate.is_dir():
            return candidate
    raise FileNotFoundError(f"Could not find repo directory among {REPO_CANDIDATES}")

def setup_database(cursor):
    """Creates the necessary tables for our relational schema."""
    
    # Enable WAL mode for high performance
    cursor.execute("PRAGMA journal_mode = WAL;")
    cursor.execute("PRAGMA synchronous = NORMAL;")

    # Table for Questions (Unique to avoid duplication across companies)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS questions (
            id INTEGER PRIMARY KEY,
            title TEXT UNIQUE,
            url TEXT,
            difficulty TEXT,
            acceptance REAL
        )
    ''')
    
    # Table for Companies
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS companies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE
        )
    ''')
    
    # Many-to-Many Table linking Companies, Questions, and Timeframes
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS company_questions (
            company_id INTEGER,
            question_id INTEGER,
            timeframe TEXT,
            frequency REAL,
            PRIMARY KEY (company_id, question_id, timeframe),
            FOREIGN KEY (company_id) REFERENCES companies (id),
            FOREIGN KEY (question_id) REFERENCES questions (id)
        )
    ''')

    # Index for fast querying by timeframe and company
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_company_questions_company_timeframe
        ON company_questions (company_id, timeframe)
    ''')
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_company_questions_freq
        ON company_questions (frequency DESC)
    ''')

def clean_percentage(val):
    """Utility to clean strings like '45.5%' or '45.5' to 45.5"""
    if val is None:
        return 0.0
    try:
        val_str = str(val).strip().rstrip('%').strip()
        return float(val_str) if val_str else 0.0
    except (ValueError, TypeError):
        return 0.0

def process_data():
    start_time = time.time()
    root_path = find_repo_dir()
    print(f"Using repository folder: {root_path.resolve()}")

    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    setup_database(cursor)

    # In-memory company name -> id cache to avoid repetitive SELECT queries
    cursor.execute('SELECT name, id FROM companies')
    company_cache = {row[0]: row[1] for row in cursor.fetchall()}

    total_companies = 0
    total_csvs = 0
    total_links = 0

    company_dirs = sorted([d for d in root_path.iterdir() if d.is_dir() and d.name not in ['.git', 'src', '.github']])
    print(f"Found {len(company_dirs)} company directories to process.")

    cursor.execute('BEGIN TRANSACTION;')

    for company_dir in company_dirs:
        company_name = company_dir.name
        
        # Get or insert company
        if company_name not in company_cache:
            cursor.execute('INSERT OR IGNORE INTO companies (name) VALUES (?)', (company_name,))
            cursor.execute('SELECT id FROM companies WHERE name = ?', (company_name,))
            company_id = cursor.fetchone()[0]
            company_cache[company_name] = company_id
        else:
            company_id = company_cache[company_name]
        
        total_companies += 1

        csv_files = list(company_dir.glob('*.csv'))
        for csv_file in csv_files:
            total_csvs += 1
            timeframe = csv_file.stem  # e.g., 'thirty-days', 'six-months', 'all'
            
            with open(csv_file, mode='r', encoding='utf-8', errors='ignore') as file:
                reader = csv.DictReader(file)
                
                for row in reader:
                    try:
                        raw_id = row.get('ID') or row.get('id') or '0'
                        q_id = int(raw_id)
                        title = (row.get('Title') or row.get('title') or '').strip()
                        
                        if not title or q_id <= 0:
                            continue  # Skip invalid rows

                        url = (row.get('URL') or row.get('Leetcode Url') or row.get('url') or f"https://leetcode.com/problems/{title.lower().replace(' ', '-')}/").strip()
                        difficulty = (row.get('Difficulty') or row.get('difficulty') or 'Unknown').strip()
                        acceptance = clean_percentage(row.get('Acceptance %') or row.get('Acceptance') or row.get('acceptance') or '0%')
                        frequency = clean_percentage(row.get('Frequency %') or row.get('Frequency') or row.get('frequency') or '0%')

                        # 1. Insert Question (Ignore if question ID or unique title already exists)
                        cursor.execute('''
                            INSERT OR IGNORE INTO questions (id, title, url, difficulty, acceptance)
                            VALUES (?, ?, ?, ?, ?)
                        ''', (q_id, title, url, difficulty, acceptance))
                        
                        # 2. Link Question to Company
                        cursor.execute('''
                            INSERT OR REPLACE INTO company_questions (company_id, question_id, timeframe, frequency)
                            VALUES (?, ?, ?, ?)
                        ''', (company_id, q_id, timeframe, frequency))
                        
                        total_links += 1

                    except Exception as e:
                        print(f"Error processing row in {csv_file}: {e}")

    # Commit all changes
    conn.commit()

    # Query summary statistics
    cursor.execute('SELECT COUNT(*) FROM questions')
    q_count = cursor.fetchone()[0]
    cursor.execute('SELECT COUNT(*) FROM companies')
    c_count = cursor.fetchone()[0]
    cursor.execute('SELECT COUNT(*) FROM company_questions')
    cq_count = cursor.fetchone()[0]

    conn.close()

    elapsed = time.time() - start_time
    print(f"\nData ingestion complete in {elapsed:.2f}s!")
    print(f"Total Companies: {c_count}")
    print(f"Total Unique Questions: {q_count}")
    print(f"Total Company-Question-Timeframe Links: {cq_count}")
    print(f"Database saved as '{DB_NAME}'")

if __name__ == "__main__":
    process_data()
