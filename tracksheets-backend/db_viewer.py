#!/usr/bin/env python3
"""
TrackSheets Database Viewer
View and query SQLite databases for TrackSheets workbooks
"""

import os
import sqlite3
import json
from pathlib import Path
from datetime import datetime
import sys

class TrackSheetsDBViewer:
    def __init__(self, projects_dir="projects"):
        self.projects_dir = Path(projects_dir)
        if not self.projects_dir.exists():
            print(f"❌ Projects directory '{projects_dir}' not found!")
            sys.exit(1)
    
    def list_workbooks(self):
        """List all available workbooks and their databases"""
        print("🗂️  Available TrackSheets Workbooks:")
        print("=" * 60)
        
        workbooks = []
        for folder in self.projects_dir.iterdir():
            if folder.is_dir():
                db_path = folder / "db" / "workbook.db"
                metadata_path = folder / "workbook.json"
                
                if db_path.exists():
                    # Load metadata if available
                    metadata = {}
                    if metadata_path.exists():
                        try:
                            with open(metadata_path, 'r') as f:
                                metadata = json.load(f)
                        except:
                            pass
                    
                    workbook_info = {
                        'folder': folder.name,
                        'name': metadata.get('name', folder.name),
                        'template': metadata.get('template', 'Unknown'),
                        'created_at': metadata.get('created_at', 'Unknown'),
                        'db_path': str(db_path),
                        'db_size': self.get_file_size(db_path)
                    }
                    workbooks.append(workbook_info)
        
        if not workbooks:
            print("📭 No workbooks with databases found!")
            return []
        
        for i, wb in enumerate(workbooks, 1):
            print(f"{i:2}. 📊 {wb['name']}")
            print(f"    📁 Folder: {wb['folder']}")
            print(f"    📋 Template: {wb['template']}")
            print(f"    📅 Created: {wb['created_at']}")
            print(f"    💾 DB Size: {wb['db_size']}")
            print(f"    🔗 Path: {wb['db_path']}")
            print()
        
        return workbooks
    
    def get_file_size(self, file_path):
        """Get human-readable file size"""
        try:
            size = os.path.getsize(file_path)
            for unit in ['B', 'KB', 'MB', 'GB']:
                if size < 1024:
                    return f"{size:.1f} {unit}"
                size /= 1024
            return f"{size:.1f} TB"
        except:
            return "Unknown"
    
    def connect_to_workbook(self, workbook_name):
        """Connect to a specific workbook's database"""
        # Find workbook folder (handle both folder name and display name)
        workbook_path = None
        
        for folder in self.projects_dir.iterdir():
            if folder.is_dir():
                metadata_path = folder / "workbook.json"
                if metadata_path.exists():
                    try:
                        with open(metadata_path, 'r') as f:
                            metadata = json.load(f)
                        if (metadata.get('name', '').lower() == workbook_name.lower() or 
                            folder.name.lower() == workbook_name.lower()):
                            workbook_path = folder
                            break
                    except:
                        pass
                elif folder.name.lower() == workbook_name.lower():
                    workbook_path = folder
                    break
        
        if not workbook_path:
            print(f"❌ Workbook '{workbook_name}' not found!")
            return None
        
        db_path = workbook_path / "db" / "workbook.db"
        if not db_path.exists():
            print(f"❌ Database not found at {db_path}")
            return None
        
        try:
            conn = sqlite3.connect(str(db_path))
            print(f"✅ Connected to workbook: {workbook_name}")
            print(f"📁 Database: {db_path}")
            return conn
        except Exception as e:
            print(f"❌ Failed to connect to database: {e}")
            return None
    
    def show_tables(self, conn):
        """Show all tables in the database"""
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        
        print("\n📋 Available Tables:")
        print("-" * 40)
        for i, (table_name,) in enumerate(tables, 1):
            # Get row count
            cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
            count = cursor.fetchone()[0]
            print(f"{i:2}. {table_name:<25} ({count} rows)")
        
        return [table[0] for table in tables]
    
    def show_table_data(self, conn, table_name, limit=20):
        """Show data from a specific table"""
        cursor = conn.cursor()
        
        try:
            # Get column names
            cursor.execute(f"PRAGMA table_info({table_name})")
            columns = [col[1] for col in cursor.fetchall()]
            
            # Get data
            cursor.execute(f"SELECT * FROM {table_name} LIMIT {limit}")
            rows = cursor.fetchall()
            
            print(f"\n📊 Table: {table_name} (showing first {limit} rows)")
            print("=" * 80)
            
            if not rows:
                print("📭 No data in this table")
                return
            
            # Print headers
            header = " | ".join(f"{col:<15}" for col in columns)
            print(header)
            print("-" * len(header))
            
            # Print rows
            for row in rows:
                formatted_row = []
                for value in row:
                    if value is None:
                        formatted_row.append("NULL".ljust(15))
                    elif isinstance(value, str) and len(value) > 15:
                        formatted_row.append((value[:12] + "...").ljust(15))
                    else:
                        formatted_row.append(str(value).ljust(15))
                
                print(" | ".join(formatted_row))
            
            # Show total count
            cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
            total = cursor.fetchone()[0]
            if total > limit:
                print(f"\n... showing {limit} of {total} total rows")
        
        except Exception as e:
            print(f"❌ Error reading table {table_name}: {e}")
    
    def run_custom_query(self, conn, query):
        """Run a custom SQL query"""
        cursor = conn.cursor()
        
        try:
            cursor.execute(query)
            
            # If it's a SELECT query, show results
            if query.strip().upper().startswith('SELECT'):
                rows = cursor.fetchall()
                columns = [desc[0] for desc in cursor.description]
                
                print(f"\n📊 Query Results:")
                print("=" * 60)
                
                if not rows:
                    print("📭 No results")
                    return
                
                # Print headers
                header = " | ".join(f"{col:<20}" for col in columns)
                print(header)
                print("-" * len(header))
                
                # Print rows
                for row in rows:
                    formatted_row = []
                    for value in row:
                        if value is None:
                            formatted_row.append("NULL".ljust(20))
                        elif isinstance(value, str) and len(value) > 20:
                            formatted_row.append((value[:17] + "...").ljust(20))
                        else:
                            formatted_row.append(str(value).ljust(20))
                    
                    print(" | ".join(formatted_row))
                
                print(f"\nTotal rows: {len(rows)}")
            else:
                # For non-SELECT queries
                conn.commit()
                print(f"✅ Query executed successfully")
                print(f"Rows affected: {cursor.rowcount}")
        
        except Exception as e:
            print(f"❌ Query error: {e}")
    
    def interactive_mode(self):
        """Interactive database browser"""
        print("🚀 TrackSheets Database Viewer")
        print("=" * 50)
        
        while True:
            print("\n🔧 Main Menu:")
            print("1. List all workbooks")
            print("2. Connect to workbook")
            print("3. Exit")
            
            choice = input("\nEnter choice (1-3): ").strip()
            
            if choice == '1':
                self.list_workbooks()
            
            elif choice == '2':
                workbook_name = input("Enter workbook name or folder: ").strip()
                if not workbook_name:
                    continue
                
                conn = self.connect_to_workbook(workbook_name)
                if conn:
                    self.workbook_browser(conn, workbook_name)
                    conn.close()
            
            elif choice == '3':
                print("👋 Goodbye!")
                break
            
            else:
                print("❌ Invalid choice!")
    
    def workbook_browser(self, conn, workbook_name):
        """Browse a specific workbook's database"""
        while True:
            print(f"\n🗄️  Workbook: {workbook_name}")
            print("=" * 40)
            print("1. Show all tables")
            print("2. View table data")
            print("3. Run custom SQL query")
            print("4. Show recent changes")
            print("5. Show business actions")
            print("6. Back to main menu")
            
            choice = input("\nEnter choice (1-6): ").strip()
            
            if choice == '1':
                self.show_tables(conn)
            
            elif choice == '2':
                tables = self.show_tables(conn)
                if tables:
                    table_name = input(f"Enter table name ({', '.join(tables)}): ").strip()
                    if table_name in tables:
                        limit = input("Enter limit (default 20): ").strip()
                        limit = int(limit) if limit.isdigit() else 20
                        self.show_table_data(conn, table_name, limit)
                    else:
                        print("❌ Invalid table name!")
            
            elif choice == '3':
                print("💡 Example queries:")
                print("   SELECT * FROM change_log ORDER BY timestamp DESC LIMIT 10")
                print("   SELECT COUNT(*) FROM customer_validations")
                print("   SELECT action_type, COUNT(*) FROM business_actions GROUP BY action_type")
                
                query = input("\nEnter SQL query: ").strip()
                if query:
                    self.run_custom_query(conn, query)
            
            elif choice == '4':
                self.show_recent_changes(conn)
            
            elif choice == '5':
                self.show_business_actions(conn)
            
            elif choice == '6':
                break
            
            else:
                print("❌ Invalid choice!")
    
    def show_recent_changes(self, conn):
        """Show recent changes in a user-friendly format"""
        query = """
        SELECT user_email, change_type, row_index, timestamp, 
               full_row_data, git_hash
        FROM change_log 
        ORDER BY timestamp DESC 
        LIMIT 20
        """
        
        cursor = conn.cursor()
        cursor.execute(query)
        rows = cursor.fetchall()
        
        print(f"\n📝 Recent Changes (last 20):")
        print("=" * 80)
        
        if not rows:
            print("📭 No changes found")
            return
        
        for row in rows:
            user_email, change_type, row_index, timestamp, full_row_data, git_hash = row
            
            print(f"👤 {user_email} | 🔄 {change_type} | 📍 Row {row_index}")
            print(f"📅 {timestamp}")
            if git_hash:
                print(f"🔐 Git: {git_hash[:12]}...")
            
            if full_row_data:
                try:
                    data = json.loads(full_row_data)
                    print(f"📊 Data: {dict(list(data.items())[:3])}{'...' if len(data) > 3 else ''}")
                except:
                    print(f"📊 Data: {full_row_data[:50]}...")
            
            print("-" * 40)
    
    def show_business_actions(self, conn):
        """Show business actions summary"""
        cursor = conn.cursor()
        
        # Get action types summary
        cursor.execute("""
            SELECT action_type, status, COUNT(*) as count
            FROM business_actions 
            GROUP BY action_type, status
            ORDER BY action_type, status
        """)
        
        actions = cursor.fetchall()
        
        print(f"\n🏢 Business Actions Summary:")
        print("=" * 50)
        
        if not actions:
            print("📭 No business actions found")
            return
        
        current_type = None
        for action_type, status, count in actions:
            if action_type != current_type:
                print(f"\n📋 {action_type}:")
                current_type = action_type
            print(f"   {status}: {count}")
        
        # Show recent actions
        cursor.execute("""
            SELECT action_type, row_index, status, created_at, action_data
            FROM business_actions 
            ORDER BY created_at DESC 
            LIMIT 10
        """)
        
        recent = cursor.fetchall()
        
        if recent:
            print(f"\n🕒 Recent Business Actions:")
            print("-" * 40)
            for action_type, row_index, status, created_at, action_data in recent:
                print(f"📍 Row {row_index} | {action_type} | {status}")
                print(f"📅 {created_at}")
                if action_data:
                    try:
                        data = json.loads(action_data)
                        print(f"📊 {data}")
                    except:
                        print(f"📊 {action_data}")
                print()


def main():
    """Main function - you can also import this class"""
    if len(sys.argv) > 1:
        # Command line mode
        if sys.argv[1] == 'list':
            viewer = TrackSheetsDBViewer()
            viewer.list_workbooks()
        elif sys.argv[1] == 'connect' and len(sys.argv) > 2:
            viewer = TrackSheetsDBViewer()
            conn = viewer.connect_to_workbook(sys.argv[2])
            if conn:
                viewer.show_tables(conn)
                conn.close()
        else:
            print("Usage:")
            print("  python db_viewer.py list                    - List all workbooks")
            print("  python db_viewer.py connect <workbook_name> - Connect to workbook")
            print("  python db_viewer.py                         - Interactive mode")
    else:
        # Interactive mode
        viewer = TrackSheetsDBViewer()
        viewer.interactive_mode()


if __name__ == "__main__":
    main()
