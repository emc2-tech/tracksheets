#!/usr/bin/env python3
"""
TrackSheets Self-Contained Workbook Manager
Each workbook has its own database and object store
"""

import os
import json
import sqlite3
import hashlib
import shutil
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple

class WorkbookManager:
    """Manages self-contained workbooks with individual databases and object stores"""
    
    def __init__(self, projects_base_dir: str = "projects"):
        self.projects_dir = Path(projects_base_dir)
        self.projects_dir.mkdir(exist_ok=True)
    
    def create_workbook(self, name: str, template: str = "Blank", category: str = "General", 
                       created_by: str = "system") -> Dict:
        """Create a new self-contained workbook"""
        
        # Sanitize name for folder
        folder_name = self._sanitize_folder_name(name)
        workbook_path = self.projects_dir / folder_name
        
        # Check if workbook already exists
        if workbook_path.exists():
            return {
                'success': False,
                'error': 'workbook_already_exists',
                'message': f'Workbook "{name}" already exists',
                'details': {
                    'conflict_type': 'filesystem',
                    'existing_path': str(workbook_path)
                }
            }
        
        try:
            # Create workbook directory structure
            self._create_workbook_structure(workbook_path)
            
            # Initialize workbook database
            db_path = workbook_path / "db" / "workbook.db"
            self._initialize_workbook_database(db_path, name, template, created_by)
            
            # Create workbook.json metadata
            metadata = self._create_workbook_metadata(name, template, category, created_by)
            metadata_path = workbook_path / "workbook.json"
            
            with open(metadata_path, 'w') as f:
                json.dump(metadata, f, indent=2)
            
            # Initialize with template data if applicable
            if template != "Blank":
                self._apply_template(workbook_path, template)
            
            print(f"✅ Created workbook '{name}' at {workbook_path}")
            
            return {
                'success': True,
                'workbook_id': metadata['id'],
                'name': name,
                'path': str(workbook_path),
                'template': template,
                'created_at': metadata['created_at'],
                'message': f'Workbook "{name}" created successfully'
            }
            
        except Exception as e:
            # Cleanup on failure
            if workbook_path.exists():
                shutil.rmtree(workbook_path)
            
            return {
                'success': False,
                'error': 'creation_failed',
                'message': f'Failed to create workbook: {str(e)}'
            }
    
    def get_workbook(self, name: str) -> Optional[Dict]:
        """Get workbook information"""
        folder_name = self._sanitize_folder_name(name)
        workbook_path = self.projects_dir / folder_name
        
        if not workbook_path.exists():
            return None
        
        # Load metadata
        metadata_path = workbook_path / "workbook.json"
        if metadata_path.exists():
            with open(metadata_path, 'r') as f:
                metadata = json.load(f)
            
            # Add runtime information
            metadata['path'] = str(workbook_path)
            metadata['db_path'] = str(workbook_path / "db" / "workbook.db")
            metadata['objects_path'] = str(workbook_path / "objects")
            
            return metadata
        
        return None
    
    def list_workbooks(self) -> List[Dict]:
        """List all available workbooks"""
        workbooks = []
        
        for folder in self.projects_dir.iterdir():
            if folder.is_dir():
                metadata_path = folder / "workbook.json"
                if metadata_path.exists():
                    try:
                        with open(metadata_path, 'r') as f:
                            metadata = json.load(f)
                        
                        # Add folder info
                        metadata['folder_name'] = folder.name
                        metadata['path'] = str(folder)
                        
                        workbooks.append(metadata)
                    except json.JSONDecodeError:
                        print(f"⚠️  Corrupted metadata in {folder}")
        
        return sorted(workbooks, key=lambda x: x.get('created_at', ''))
    
    def get_workbook_database(self, name: str) -> Optional[sqlite3.Connection]:
        """Get database connection for specific workbook"""
        workbook = self.get_workbook(name)
        if not workbook:
            return None
        
        db_path = workbook['db_path']
        if not os.path.exists(db_path):
            return None
        
        return sqlite3.connect(db_path)
    
    def save_object(self, workbook_name: str, object_data: Dict, object_type: str = 'row', row_index: int = None) -> str:
        """Save object using Git-style storage in workbook's objects folder"""
        workbook = self.get_workbook(workbook_name)
        if not workbook:
            raise ValueError(f"Workbook '{workbook_name}' not found")
        
        # Include row_index in the object data for hashing
        if row_index is not None:
            hash_data = {**object_data, 'row_index': row_index}
        else:
            hash_data = object_data

        # Generate content hash (now includes row_index)
        content_json = json.dumps(hash_data, sort_keys=True)
        object_hash = hashlib.sha256(content_json.encode()).hexdigest()

        # Store the enhanced object data (with row_index)
        final_object_data = hash_data
        
        # Create object path (Git-style: first 2 chars = directory)
        hash_prefix = object_hash[:2]
        hash_suffix = object_hash[2:]
        
        objects_dir = Path(workbook['objects_path'])
        hash_dir = objects_dir / hash_prefix
        hash_dir.mkdir(exist_ok=True)
        
        # Save object file
        filename = f"{hash_suffix}.json"
        object_path = hash_dir / filename
        
        with open(object_path, 'w') as f:
            json.dump(final_object_data, f, indent=2)
        
        # Record in workbook database
        conn = self.get_workbook_database(workbook_name)
        if conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO git_objects 
                (object_hash, object_type, object_size, file_path, row_index, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                object_hash,
                object_type,
                len(content_json),
                str(object_path),
                row_index,
                datetime.now().isoformat()
            ))
            conn.commit()
            conn.close()
        
        return object_hash
    
    def get_object(self, workbook_name: str, object_hash: str) -> Optional[Dict]:
        """Retrieve object by hash"""
        workbook = self.get_workbook(workbook_name)
        if not workbook:
            return None
        
        # Find object using Git-style path
        hash_prefix = object_hash[:2]
        hash_suffix = object_hash[2:]
        
        objects_dir = Path(workbook['objects_path'])
        hash_dir = objects_dir / hash_prefix
        
        if not hash_dir.exists():
            return None
        
        # Look for file starting with hash suffix
        for file_path in hash_dir.iterdir():
            if file_path.name.startswith(hash_suffix):
                try:
                    with open(file_path, 'r') as f:
                        return json.load(f)
                except json.JSONDecodeError:
                    print(f"⚠️  Corrupted object: {file_path}")
        
        return None
    
    def delete_workbook(self, name: str) -> Dict:
        """Delete entire workbook (folder and all contents)"""
        folder_name = self._sanitize_folder_name(name)
        workbook_path = self.projects_dir / folder_name
        
        if not workbook_path.exists():
            return {
                'success': False,
                'error': 'workbook_not_found',
                'message': f'Workbook "{name}" not found'
            }
        
        try:
            shutil.rmtree(workbook_path)
            return {
                'success': True,
                'message': f'Workbook "{name}" deleted successfully'
            }
        except Exception as e:
            return {
                'success': False,
                'error': 'deletion_failed',
                'message': f'Failed to delete workbook: {str(e)}'
            }
    
    def _sanitize_folder_name(self, name: str) -> str:
        """Convert workbook name to safe folder name"""
        # Replace spaces and special characters
        safe_name = "".join(c if c.isalnum() or c in ('-', '_') else '_' for c in name)
        return safe_name.strip('_')
    
    def _create_workbook_structure(self, workbook_path: Path):
        """Create the folder structure for a new workbook"""
        workbook_path.mkdir(parents=True, exist_ok=True)
        
        # Create subdirectories
        (workbook_path / "objects").mkdir(exist_ok=True)
        (workbook_path / "db").mkdir(exist_ok=True)
        
        print(f"📁 Created workbook structure at {workbook_path}")
    
    def _initialize_workbook_database(self, db_path: Path, name: str, template: str, created_by: str):
        """Initialize SQLite database for the workbook"""
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Create workbook-specific schema
        cursor.executescript("""
            -- Workbook Users (who has access to THIS workbook)
            CREATE TABLE workbook_users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username VARCHAR(100) NOT NULL,
                email VARCHAR(255) NOT NULL,
                full_name VARCHAR(255),
                permission_level VARCHAR(20) DEFAULT 'viewer',
                added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                added_by VARCHAR(255),
                is_active BOOLEAN DEFAULT TRUE
            );
            
            -- Change Log (for THIS workbook only)
            CREATE TABLE change_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_email VARCHAR(255) NOT NULL,
                change_type VARCHAR(50) NOT NULL,
                row_index INTEGER,
                git_hash VARCHAR(64),
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                ip_address VARCHAR(45),
                user_agent TEXT,
                user_display_name TEXT   -- NEW: Friendly user name
            );
            
            -- Customer Validations (for THIS workbook only)
            CREATE TABLE customer_validations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                row_index INTEGER NOT NULL,
                customer_name VARCHAR(255),
                customer_email VARCHAR(255),
                validation_token VARCHAR(100) UNIQUE,
                changes_summary TEXT,
                sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                responded_at TIMESTAMP,
                customer_approved BOOLEAN,
                customer_feedback TEXT,
                expires_at TIMESTAMP
            );
            
            -- Business Actions (for THIS workbook only)
            CREATE TABLE business_actions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                row_index INTEGER NOT NULL,
                action_type VARCHAR(100),
                trigger_condition TEXT,
                action_data JSON,
                status VARCHAR(50) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP,
                result JSON
            );
            
            -- Git Objects (for THIS workbook only)
            CREATE TABLE git_objects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                object_hash VARCHAR(64) NOT NULL UNIQUE,
                object_type VARCHAR(50),
                object_size INTEGER,
                file_path VARCHAR(500),
                row_index INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            -- Email Log (for THIS workbook only)
            CREATE TABLE email_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                validation_id INTEGER,
                recipient_email VARCHAR(255) NOT NULL,
                subject VARCHAR(500),
                email_type VARCHAR(50),
                sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                delivery_status VARCHAR(50) DEFAULT 'sent',
                opened_at TIMESTAMP,
                clicked_at TIMESTAMP,
                FOREIGN KEY (validation_id) REFERENCES customer_validations(id)
            );
            
            -- Column Configurations (for THIS workbook only)
            CREATE TABLE column_configurations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                column_id VARCHAR(10),
                column_name VARCHAR(255),
                data_type VARCHAR(50),
                sensitivity_level VARCHAR(50),
                validation_rules JSON,
                is_required BOOLEAN DEFAULT FALSE,
                display_width INTEGER DEFAULT 150,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            -- Indexes
            CREATE INDEX idx_change_log_timestamp ON change_log(timestamp);
            CREATE INDEX idx_validations_token ON customer_validations(validation_token);
            CREATE INDEX idx_git_objects_hash ON git_objects(object_hash);
            CREATE INDEX idx_email_log_recipient ON email_log(recipient_email);
        """)
        
        # Insert creator as initial user
        cursor.execute("""
            INSERT INTO workbook_users (username, email, full_name, permission_level, added_by)
            VALUES (?, ?, ?, 'owner', 'system')
        """, (created_by.split('@')[0], created_by, created_by, ))
        
        conn.commit()
        conn.close()
        
        print(f"💾 Initialized database for workbook at {db_path}")
    
    def _create_workbook_metadata(self, name: str, template: str, category: str, created_by: str) -> Dict:
        """Create workbook metadata"""
        workbook_id = hashlib.md5(f"{name}_{datetime.now().isoformat()}".encode()).hexdigest()[:12]
        
        return {
            'id': workbook_id,
            'name': name,
            'template': template,
            'category': category,
            'version': '1.0',
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat(),
            'created_by': created_by,
            'settings': {
                'auto_backup': True,
                'validation_required': True,
                'git_tracking': True,
                'email_notifications': True
            },
            'schema_version': '1.0',
            'database_version': '1.0'
        }
    
    def _apply_template(self, workbook_path: Path, template: str):
        """Apply template-specific initial data"""
        templates = {
            'Customer Database': {
                'columns': [
                    'Name', 'Address', 'Postcode', 'Date of Birth', 'Telephone Number',
                    'Email', 'Original Loan Amount', 'Regular Payment Amount',
                    'Payment Frequency', 'Loan Amount Outstanding', 'Credit Card Number'
                ],
                'rows': []
            },
            'Personal Monthly Budget': {
                'columns': ['Category', 'Budgeted Amount', 'Actual Amount', 'Difference', 'Notes'],
                'rows': [
                    ['Housing', '1200', '1200', '0', 'Rent and utilities'],
                    ['Food', '400', '0', '400', 'Groceries and dining'],
                    ['Transportation', '300', '0', '300', 'Car payment and gas']
                ]
            },
            'Project Timeline': {
                'columns': ['Task', 'Start Date', 'End Date', 'Status', 'Assigned To', 'Priority'],
                'rows': []
            }
        }
        
        if template in templates:
            template_data = templates[template]
            
            # Save as initial object
            initial_data = {
                'type': 'template_initialization',
                'template': template,
                'columns': template_data['columns'],
                'rows': template_data['rows'],
                'created_at': datetime.now().isoformat()
            }
            
            # Save using the object store
            workbook_name = workbook_path.name
            self.save_object(workbook_name, initial_data, 'template_init')
            
            print(f"📋 Applied template '{template}' to workbook")


# Example usage and testing
if __name__ == "__main__":
    # Initialize workbook manager
    wm = WorkbookManager()
    
    # Create a test workbook
    result = wm.create_workbook("Test CRM", "Customer Database", "Business", "test@company.com")
    print("Creation result:", result)
    
    # List all workbooks
    workbooks = wm.list_workbooks()
    print("Available workbooks:", [w['name'] for w in workbooks])
    
    # Test object storage
    if result['success']:
        test_data = {'row': 0, 'data': ['John Doe', 'john@example.com']}
        hash_val = wm.save_object("Test CRM", test_data, 'test_row')
        print(f"Saved object with hash: {hash_val}")
        
        # Retrieve object
        retrieved = wm.get_object("Test CRM", hash_val)
        print("Retrieved object:", retrieved)
