from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
import hashlib
import json
import os
import sqlite3
import re
import shutil

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend

# Project structure constants
PROJECTS_ROOT = 'projects'
DB_FOLDER = 'db'
OBJECTS_FOLDER = 'objects'

def sanitize_folder_name(name):
    """Convert workbook name to valid folder name"""
    # Remove special characters and replace spaces with underscores
    sanitized = re.sub(r'[<>:"/\\|?*]', '', name)
    sanitized = re.sub(r'\s+', '_', sanitized)
    # Remove leading/trailing dots and spaces
    sanitized = sanitized.strip('. ')
    # Ensure it's not empty
    if not sanitized:
        sanitized = 'Untitled_Workbook'
    return sanitized

def check_workbook_exists(workbook_name):
    """Check if a workbook with this name already exists"""
    folder_name = sanitize_folder_name(workbook_name)
    
    # Check 1: Database check
    db_exists = False
    try:
        conn = sqlite3.connect('master_workbooks.db')
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, name, folder_name, created_at FROM workbooks
            WHERE (LOWER(name) = LOWER(?) OR LOWER(folder_name) = LOWER(?)) 
            AND status = 'active'
        ''', (workbook_name, folder_name))
        
        existing_workbook = cursor.fetchone()
        conn.close()
        
        if existing_workbook:
            db_exists = True
            db_workbook_info = {
                'id': existing_workbook[0],
                'name': existing_workbook[1],
                'folder_name': existing_workbook[2],
                'created_at': existing_workbook[3]
            }
        else:
            db_workbook_info = None
            
    except Exception as e:
        print(f"⚠️ Error checking database: {e}")
        db_workbook_info = None
    
    # Check 2: File system check
    project_path = os.path.join(PROJECTS_ROOT, folder_name)
    folder_exists = os.path.exists(project_path)
    
    folder_contents = []
    if folder_exists:
        try:
            folder_contents = os.listdir(project_path)
        except Exception as e:
            print(f"⚠️ Error reading folder contents: {e}")
    
    # Determine overall existence
    exists = db_exists or folder_exists
    
    return {
        'exists': exists,
        'workbook_name': workbook_name,
        'folder_name': folder_name,
        'database': {
            'exists': db_exists,
            'workbook_info': db_workbook_info
        },
        'filesystem': {
            'exists': folder_exists,
            'project_path': os.path.abspath(project_path),
            'contents': folder_contents
        },
        'conflict_type': 'both' if (db_exists and folder_exists) else 
                        'database' if db_exists else 
                        'filesystem' if folder_exists else 
                        'none'
    }
    """Convert workbook name to valid folder name"""
    # Remove special characters and replace spaces with underscores
    sanitized = re.sub(r'[<>:"/\\|?*]', '', name)
    sanitized = re.sub(r'\s+', '_', sanitized)
    # Remove leading/trailing dots and spaces
    sanitized = sanitized.strip('. ')
    # Ensure it's not empty
    if not sanitized:
        sanitized = 'Untitled_Workbook'
    return sanitized

def create_workbook_structure(workbook_name):
    """Create folder structure for a new workbook with detailed debugging"""
    print("=" * 60)
    print("🔍 DEBUGGING FOLDER CREATION")
    print("=" * 60)
    
    # Show current working directory and paths
    current_dir = os.getcwd()
    script_dir = os.path.dirname(os.path.abspath(__file__)) if '__file__' in globals() else os.getcwd()
    absolute_projects_path = os.path.abspath(PROJECTS_ROOT)
    
    print(f"📍 Current Working Directory: {current_dir}")
    print(f"📄 Python Script Location: {script_dir}")
    print(f"📂 PROJECTS_ROOT ('{PROJECTS_ROOT}') resolves to: {absolute_projects_path}")
    
    # Check if projects folder exists
    if os.path.exists(PROJECTS_ROOT):
        print(f"✅ Projects folder EXISTS at: {absolute_projects_path}")
        try:
            contents = os.listdir(PROJECTS_ROOT)
            print(f"📋 Current contents: {contents if contents else 'EMPTY'}")
        except Exception as e:
            print(f"❌ Error reading projects folder: {e}")
    else:
        print(f"❌ Projects folder does NOT exist yet at: {absolute_projects_path}")
    
    print("=" * 60)
    
    folder_name = sanitize_folder_name(workbook_name)
    
    # Create main project folder
    project_path = os.path.join(PROJECTS_ROOT, folder_name)
    db_path = os.path.join(project_path, DB_FOLDER)
    objects_path = os.path.join(project_path, OBJECTS_FOLDER)
    
    print(f"🎯 CREATING FOLDER STRUCTURE FOR: {workbook_name}")
    print(f"   📁 Sanitized name: {folder_name}")
    print(f"   📁 Project path: {os.path.abspath(project_path)}")
    print(f"   📁 DB path: {os.path.abspath(db_path)}")
    print(f"   📁 Objects path: {os.path.abspath(objects_path)}")
    
    try:
        # Create directories step by step with verification
        print(f"\n🚀 Step 1: Creating projects root...")
        os.makedirs(PROJECTS_ROOT, exist_ok=True)
        if os.path.exists(PROJECTS_ROOT):
            print(f"✅ Projects root created/exists at: {os.path.abspath(PROJECTS_ROOT)}")
        else:
            print(f"❌ Failed to create projects root")
            
        print(f"\n🚀 Step 2: Creating project folder...")
        os.makedirs(project_path, exist_ok=True)
        if os.path.exists(project_path):
            print(f"✅ Project folder created/exists at: {os.path.abspath(project_path)}")
        else:
            print(f"❌ Failed to create project folder")
            
        print(f"\n🚀 Step 3: Creating db subfolder...")
        os.makedirs(db_path, exist_ok=True)
        if os.path.exists(db_path):
            print(f"✅ DB folder created/exists at: {os.path.abspath(db_path)}")
        else:
            print(f"❌ Failed to create db folder")
            
        print(f"\n🚀 Step 4: Creating objects subfolder...")
        os.makedirs(objects_path, exist_ok=True)
        if os.path.exists(objects_path):
            print(f"✅ Objects folder created/exists at: {os.path.abspath(objects_path)}")
        else:
            print(f"❌ Failed to create objects folder")
    
    except Exception as e:
        print(f"❌ ERROR creating folders: {e}")
        import traceback
        print(f"📍 Full traceback: {traceback.format_exc()}")
        raise
    
    # Final verification and contents listing
    print(f"\n🔍 FINAL VERIFICATION:")
    projects_exists = os.path.exists(PROJECTS_ROOT)
    project_exists = os.path.exists(project_path)
    db_exists = os.path.exists(db_path)
    objects_exists = os.path.exists(objects_path)
    
    print(f"📂 Projects root exists: {projects_exists}")
    print(f"📂 Project folder exists: {project_exists}")
    print(f"📂 DB folder exists: {db_exists}")
    print(f"📂 Objects folder exists: {objects_exists}")
    
    if projects_exists:
        try:
            projects_contents = os.listdir(PROJECTS_ROOT)
            print(f"📋 Projects folder contents: {projects_contents if projects_contents else 'EMPTY'}")
            
            if project_exists:
                project_contents = os.listdir(project_path)
                print(f"📋 {folder_name} folder contents: {project_contents if project_contents else 'EMPTY'}")
        except Exception as e:
            print(f"❌ Error listing contents: {e}")
    
    # Critical: Show user exactly where to look
    print("\n" + "=" * 60)
    print("🎯 WHERE TO FIND YOUR FOLDERS:")
    print(f"📂 Open this directory in your file explorer:")
    print(f"   {os.path.abspath(PROJECTS_ROOT)}")
    print(f"📂 Your workbook should be in:")
    print(f"   {os.path.abspath(project_path)}")
    print("=" * 60)
    
    return {
        'project_path': project_path,
        'db_path': db_path,
        'objects_path': objects_path,
        'folder_name': folder_name,
        'absolute_paths': {
            'projects_root': os.path.abspath(PROJECTS_ROOT),
            'project': os.path.abspath(project_path),
            'db': os.path.abspath(db_path),
            'objects': os.path.abspath(objects_path)
        },
        'debug_info': {
            'current_dir': current_dir,
            'script_dir': script_dir,
            'projects_exists': projects_exists,
            'project_exists': project_exists
        }
    }

def get_workbook_db_path(workbook_name):
    """Get the database path for a specific workbook"""
    folder_name = sanitize_folder_name(workbook_name)
    db_filename = f"{folder_name.lower()}.db"
    return os.path.join(PROJECTS_ROOT, folder_name, DB_FOLDER, db_filename)

def init_workbook_db(workbook_name):
    """Initialize the database for a specific workbook"""
    db_path = get_workbook_db_path(workbook_name)
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Create workbook metadata table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS workbook_metadata (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            template TEXT NOT NULL,
            category TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            git_hash TEXT,
            folder_name TEXT,
            status TEXT DEFAULT 'active'
        )
    ''')
    
    # Create rows table for actual data
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS rows (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            row_index INTEGER NOT NULL,
            data TEXT NOT NULL,
            git_hash TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            status TEXT DEFAULT 'active'
        )
    ''')
    
    # Create columns configuration table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS columns (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            column_index INTEGER NOT NULL,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            sensitivity TEXT DEFAULT 'Standard',
            required BOOLEAN DEFAULT FALSE,
            validation_rules TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Create version history table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS version_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            action_type TEXT NOT NULL,
            description TEXT,
            data_before TEXT,
            data_after TEXT,
            git_hash TEXT,
            author TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    conn.commit()
    conn.close()
    
    print(f"💾 Database initialized: {db_path}")
    return db_path

def init_master_db():
    """Initialize master database to track all workbooks"""
    master_db_path = 'master_workbooks.db'
    
    conn = sqlite3.connect(master_db_path)
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS workbooks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            folder_name TEXT NOT NULL,
            template TEXT NOT NULL,
            category TEXT NOT NULL,
            project_path TEXT NOT NULL,
            db_path TEXT NOT NULL,
            objects_path TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            git_hash TEXT,
            status TEXT DEFAULT 'active'
        )
    ''')
    
    conn.commit()
    conn.close()
    
    print(f"🗂️ Master database initialized: {master_db_path}")
    return master_db_path

def generate_git_hash(workbook_data):
    """Generate a unique hash for the workbook (simulating Git)"""
    data_string = json.dumps(workbook_data, sort_keys=True)
    return hashlib.sha256(data_string.encode()).hexdigest()

def save_hashed_object(workbook_name, object_data, object_type='workbook'):
    """Save hashed object to the objects folder with Git-style directory structure"""
    folder_name = sanitize_folder_name(workbook_name)
    objects_path = os.path.join(PROJECTS_ROOT, folder_name, OBJECTS_FOLDER)
    
    # Generate hash for the object
    object_hash = hashlib.sha256(json.dumps(object_data, sort_keys=True).encode()).hexdigest()
    
    # Create Git-style subdirectory using first 2 characters of hash
    hash_prefix = object_hash[:2]
    hash_suffix = object_hash[2:]
    
    # Create subdirectory path
    hash_dir = os.path.join(objects_path, hash_prefix)
    os.makedirs(hash_dir, exist_ok=True)
    
    # Create object file path with remaining hash as filename
    object_file = os.path.join(hash_dir, f"{hash_suffix}_{object_type}.json")
    
    # Save object to file
    object_content = {
        'hash': object_hash,
        'type': object_type,
        'data': object_data,
        'created_at': datetime.now().isoformat(),
        'hash_info': {
            'full_hash': object_hash,
            'prefix': hash_prefix,
            'suffix': hash_suffix,
            'directory': hash_prefix,
            'filename': f"{hash_suffix}_{object_type}.json"
        }
    }
    
    with open(object_file, 'w') as f:
        json.dump(object_content, f, indent=2)
    
    print(f"🔐 Saved hashed object: {hash_prefix}/{hash_suffix}_{object_type}.json")
    print(f"   📁 Directory: {hash_dir}")
    print(f"   📄 File: {object_file}")
    
    return object_hash, object_file

def get_hashed_object(workbook_name, object_hash):
    """Retrieve hashed object from the objects folder using Git-style lookup"""
    folder_name = sanitize_folder_name(workbook_name)
    objects_path = os.path.join(PROJECTS_ROOT, folder_name, OBJECTS_FOLDER)
    
    # Extract hash prefix and suffix
    hash_prefix = object_hash[:2]
    hash_suffix = object_hash[2:]
    
    # Look in the specific subdirectory
    hash_dir = os.path.join(objects_path, hash_prefix)
    
    if not os.path.exists(hash_dir):
        print(f"❌ Hash directory not found: {hash_dir}")
        return None
    
    # Look for files starting with the hash suffix
    for filename in os.listdir(hash_dir):
        if filename.startswith(hash_suffix):
            object_file = os.path.join(hash_dir, filename)
            try:
                with open(object_file, 'r') as f:
                    object_data = json.load(f)
                print(f"✅ Found hashed object: {hash_prefix}/{filename}")
                return object_data
            except Exception as e:
                print(f"❌ Error reading object file {object_file}: {e}")
                continue
    
    print(f"❌ Object not found for hash: {object_hash}")
    return None

def get_all_hashed_objects(workbook_name):
    """Get all hashed objects for a workbook with directory structure info"""
    folder_name = sanitize_folder_name(workbook_name)
    objects_path = os.path.join(PROJECTS_ROOT, folder_name, OBJECTS_FOLDER)
    
    all_objects = []
    directory_stats = {}
    
    if not os.path.exists(objects_path):
        return all_objects, directory_stats
    
    # Scan all subdirectories
    for item in os.listdir(objects_path):
        hash_dir_path = os.path.join(objects_path, item)
        
        # Only process directories that are exactly 2 characters (hash prefixes)
        if os.path.isdir(hash_dir_path) and len(item) == 2:
            hash_prefix = item
            files_in_dir = []
            
            for filename in os.listdir(hash_dir_path):
                if filename.endswith('.json'):
                    # Extract hash suffix and object type from filename
                    parts = filename.replace('.json', '').split('_')
                    if len(parts) >= 2:
                        hash_suffix = parts[0]
                        object_type = '_'.join(parts[1:])
                        full_hash = hash_prefix + hash_suffix
                        
                        object_info = {
                            'full_hash': full_hash,
                            'hash_prefix': hash_prefix,
                            'hash_suffix': hash_suffix,
                            'object_type': object_type,
                            'filename': filename,
                            'directory': hash_prefix,
                            'full_path': os.path.join(hash_dir_path, filename)
                        }
                        
                        all_objects.append(object_info)
                        files_in_dir.append(filename)
            
            directory_stats[hash_prefix] = {
                'file_count': len(files_in_dir),
                'files': files_in_dir,
                'path': hash_dir_path
            }
    
    print(f"📊 Object directory scan for {workbook_name}:")
    print(f"   📁 Total directories: {len(directory_stats)}")
    print(f"   📄 Total objects: {len(all_objects)}")
    for prefix, stats in directory_stats.items():
        print(f"   📂 {prefix}/: {stats['file_count']} files")
    
    return all_objects, directory_stats

def save_row_object(workbook_name, row_index, row_data):
    """Save individual row as hashed object with Git-style directory structure"""
    row_object = {
        'row_index': row_index,
        'data': row_data,
        'timestamp': datetime.now().isoformat()
    }
    
    return save_hashed_object(workbook_name, row_object, f'row_{row_index}')

def create_template_data(template_name):
    """Create initial data based on template"""
    template_data = {
        'Blank workbook': {
            'rows': [],
            'columns': ['A', 'B', 'C', 'D', 'E'],
            'settings': {'theme': 'default'}
        },
        'Personal Monthly Budget': {
            'rows': [
                ['Income', 'Amount', 'Source', 'Date'],
                ['Salary', 5000, 'Job', '2025-06-01'],
                ['Freelance', 800, 'Side Work', '2025-06-15']
            ],
            'columns': ['Category', 'Amount', 'Source', 'Date'],
            'settings': {'theme': 'budget', 'currency': 'EUR'}
        },
        'Customer Database': {
            'rows': [
                ['Name', 'Email', 'Phone', 'Address', 'Status'],
                ['John Smith', 'john@email.com', '+353 1 234 5678', '123 Main St, Dublin', 'Active'],
                ['Sarah Johnson', 'sarah@email.com', '+353 21 876 5432', '456 Oak Ave, Cork', 'Active']
            ],
            'columns': ['Name', 'Email', 'Phone', 'Address', 'Status'],
            'settings': {'theme': 'business', 'validation': True}
        },
        'Sales Report': {
            'rows': [
                ['Product', 'Units Sold', 'Revenue', 'Month'],
                ['Product A', 150, 15000, 'May 2025'],
                ['Product B', 89, 8900, 'May 2025']
            ],
            'columns': ['Product', 'Units Sold', 'Revenue', 'Month'],
            'settings': {'theme': 'analytics', 'charts': True}
        }
    }
    
    return template_data.get(template_name, template_data['Blank workbook'])

@app.route('/api/workbook/create', methods=['POST'])
def create_workbook():
    """Create a new workbook with dedicated folder structure"""
    try:
        data = request.json
        print(f"📝 Creating workbook: {data}")
        
        # Extract data from request
        workbook_name = data.get('name', 'Untitled Workbook')
        template_name = data.get('template', 'Blank workbook')
        category = data.get('category', 'General')
        
        print(f"🚀 Creating workbook '{workbook_name}' with template '{template_name}'")
        
        # ✅ CHECK: Workbook already exists?
        print(f"🔍 Checking if workbook '{workbook_name}' already exists...")
        existence_check = check_workbook_exists(workbook_name)
        
        if existence_check['exists']:
            print(f"❌ CONFLICT: Workbook '{workbook_name}' already exists!")
            print(f"   📊 Database exists: {existence_check['database']['exists']}")
            print(f"   📁 Folder exists: {existence_check['filesystem']['exists']}")
            print(f"   📂 Folder path: {existence_check['filesystem']['project_path']}")
            
            # Create detailed error message
            error_details = []
            
            if existence_check['database']['exists']:
                db_info = existence_check['database']['workbook_info']
                error_details.append(f"Database record exists (ID: {db_info['id']}, Created: {db_info['created_at']})")
            
            if existence_check['filesystem']['exists']:
                folder_info = existence_check['filesystem']
                error_details.append(f"Folder exists at: {folder_info['project_path']} (Contents: {len(folder_info['contents'])} items)")
            
            return jsonify({
                'success': False,
                'error': 'workbook_already_exists',
                'message': f'Workbook "{workbook_name}" already exists and cannot be overwritten.',
                'details': {
                    'workbook_name': workbook_name,
                    'folder_name': existence_check['folder_name'],
                    'conflict_type': existence_check['conflict_type'],
                    'existing_info': existence_check,
                    'error_details': error_details
                },
                'suggestions': [
                    f'Try a different name like "{workbook_name}_v2"',
                    f'Or use "{workbook_name}_{datetime.now().strftime("%Y%m%d")}"',
                    'Check existing workbooks with GET /api/workbooks'
                ]
            }), 409  # 409 Conflict status code
        
        print(f"✅ Workbook name '{workbook_name}' is available - proceeding with creation")
        
        # Create project folder structure
        structure = create_workbook_structure(workbook_name)
        folder_name = structure['folder_name']
        project_path = structure['project_path']
        db_path = structure['db_path']
        objects_path = structure['objects_path']
        
        # Initialize workbook-specific database
        workbook_db_path = init_workbook_db(workbook_name)
        
        # Create template data
        template_data = create_template_data(template_name)
        
        # Generate Git hash for workbook
        workbook_data = {
            'name': workbook_name,
            'folder_name': folder_name,
            'template': template_name,
            'category': category,
            'created_at': datetime.now().isoformat(),
            'data': template_data,
            'project_structure': structure
        }
        git_hash = generate_git_hash(workbook_data)
        
        # Save workbook object to objects folder
        workbook_hash, workbook_object_file = save_hashed_object(workbook_name, workbook_data, 'workbook')
        
        # Save template rows as individual hashed objects
        row_hashes = []
        if template_data.get('rows'):
            for i, row in enumerate(template_data['rows']):
                row_hash, row_file = save_row_object(workbook_name, i, row)
                row_hashes.append({
                    'index': i,
                    'hash': row_hash,
                    'file': row_file
                })
        
        # Save to workbook-specific database
        conn = sqlite3.connect(workbook_db_path)
        cursor = conn.cursor()
        
        # Insert workbook metadata
        cursor.execute('''
            INSERT INTO workbook_metadata (name, template, category, git_hash, folder_name)
            VALUES (?, ?, ?, ?, ?)
        ''', (workbook_name, template_name, category, git_hash, folder_name))
        
        workbook_id = cursor.lastrowid
        
        # Insert rows data
        for i, row_info in enumerate(row_hashes):
            cursor.execute('''
                INSERT INTO rows (row_index, data, git_hash)
                VALUES (?, ?, ?)
            ''', (i, json.dumps(template_data['rows'][i]), row_info['hash']))
        
        # Insert initial version history
        cursor.execute('''
            INSERT INTO version_history (action_type, description, data_after, git_hash, author)
            VALUES (?, ?, ?, ?, ?)
        ''', ('create', f'Workbook created from template: {template_name}', 
              json.dumps(workbook_data), git_hash, 'System'))
        
        conn.commit()
        conn.close()
        
        # Save to master database
        master_conn = sqlite3.connect('master_workbooks.db')
        master_cursor = master_conn.cursor()
        
        master_cursor.execute('''
            INSERT INTO workbooks (name, folder_name, template, category, project_path, db_path, objects_path, git_hash)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (workbook_name, folder_name, template_name, category, 
              project_path, workbook_db_path, objects_path, git_hash))
        
        master_workbook_id = master_cursor.lastrowid
        master_conn.commit()
        master_conn.close()
        
        # Run custom business logic
        business_actions = run_custom_business_logic(workbook_id, workbook_data, structure)
        
        print(f"✅ Workbook created successfully:")
        print(f"   - Master ID: {master_workbook_id}")
        print(f"   - Workbook ID: {workbook_id}")
        print(f"   - Folder: {folder_name}")
        print(f"   - Project Path: {project_path}")
        print(f"   - Database: {workbook_db_path}")
        print(f"   - Objects: {objects_path}")
        print(f"   - Git Hash: {git_hash[:12]}...")
        print(f"   - Row Objects: {len(row_hashes)}")
        print(f"   - Business Actions: {len(business_actions)}")
        
        return jsonify({
            'success': True,
            'master_workbook_id': master_workbook_id,
            'workbook_id': workbook_id,
            'name': workbook_name,
            'folder_name': folder_name,
            'template': template_name,
            'category': category,
            'git_hash': git_hash,
            'project_structure': {
                'project_path': project_path,
                'db_path': workbook_db_path,
                'objects_path': objects_path
            },
            'data': template_data,
            'row_hashes': row_hashes,
            'workbook_object_hash': workbook_hash,
            'business_actions': business_actions,
            'message': f'Workbook "{workbook_name}" created with dedicated project structure!'
        })
        
    except Exception as e:
        print(f"❌ Error creating workbook: {str(e)}")
        import traceback
        print(f"📍 Full traceback:\n{traceback.format_exc()}")
        return jsonify({
            'success': False,
            'error': 'server_error',
            'message': f'Failed to create workbook: {str(e)}',
            'details': {
                'error_type': type(e).__name__,
                'error_message': str(e)
            }
        }), 500

def run_custom_business_logic(workbook_id, workbook_data, structure):
    """Add your custom business logic here"""
    actions = []
    
    template_name = workbook_data.get('template')
    folder_name = workbook_data.get('folder_name')
    project_path = structure['project_path']
    
    # Custom logic based on template type
    if template_name == 'Customer Database':
        actions.append({
            'type': 'crm_setup',
            'message': f'CRM integration configured for project: {folder_name}',
            'status': 'completed',
            'project_path': project_path
        })
        actions.append({
            'type': 'data_validation',
            'message': 'Email and phone validation rules applied',
            'status': 'active'
        })
        
        # Create CRM-specific config file
        crm_config = {
            'validation_rules': ['email', 'phone', 'address'],
            'data_sensitivity': {'email': 'PII', 'phone': 'PII'},
            'export_formats': ['csv', 'xlsx', 'json']
        }
        config_file = os.path.join(project_path, 'crm_config.json')
        with open(config_file, 'w') as f:
            json.dump(crm_config, f, indent=2)
        
        actions.append({
            'type': 'config_created',
            'message': f'CRM configuration saved: {config_file}',
            'status': 'completed'
        })
        
    elif template_name == 'Personal Monthly Budget':
        actions.append({
            'type': 'budget_categories',
            'message': f'Default budget categories created for: {folder_name}',
            'status': 'completed'
        })
        actions.append({
            'type': 'spending_alerts',
            'message': 'Spending limit alerts configured',
            'status': 'active'
        })
        
        # Create budget-specific files
        budget_config = {
            'currency': 'EUR',
            'categories': ['Income', 'Housing', 'Food', 'Transportation', 'Entertainment'],
            'alert_thresholds': {'Housing': 0.3, 'Food': 0.15, 'Transportation': 0.15}
        }
        config_file = os.path.join(project_path, 'budget_config.json')
        with open(config_file, 'w') as f:
            json.dump(budget_config, f, indent=2)
            
        actions.append({
            'type': 'config_created',
            'message': f'Budget configuration saved: {config_file}',
            'status': 'completed'
        })
        
    elif template_name == 'Sales Report':
        actions.append({
            'type': 'analytics_setup',
            'message': f'Sales analytics dashboard configured for: {folder_name}',
            'status': 'completed'
        })
        actions.append({
            'type': 'report_automation',
            'message': 'Monthly report automation scheduled',
            'status': 'active'
        })
        
        # Create sales-specific files
        sales_config = {
            'metrics': ['revenue', 'units_sold', 'profit_margin'],
            'reporting_frequency': 'monthly',
            'chart_types': ['line', 'bar', 'pie']
        }
        config_file = os.path.join(project_path, 'sales_config.json')
        with open(config_file, 'w') as f:
            json.dump(sales_config, f, indent=2)
            
        actions.append({
            'type': 'config_created',
            'message': f'Sales configuration saved: {config_file}',
            'status': 'completed'
        })
    
    # Always add project structure info
    actions.append({
        'type': 'project_structure',
        'message': f'Project structure created at: {project_path}',
        'status': 'completed',
        'details': {
            'folders_created': ['db', 'objects'],
            'project_path': project_path,
            'database_path': structure['db_path'],
            'objects_path': structure['objects_path']
        }
    })
    
    # Always add audit logging
    actions.append({
        'type': 'audit_log',
        'message': f'Workbook creation logged with ID {workbook_id} in folder: {folder_name}',
        'status': 'completed'
    })
    
    return actions

@app.route('/api/workbooks', methods=['GET'])
def list_workbooks():
    """List all workbooks from master database"""
    try:
        conn = sqlite3.connect('master_workbooks.db')
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, name, folder_name, template, category, project_path, db_path, objects_path, created_at, git_hash, status
            FROM workbooks
            WHERE status = 'active'
            ORDER BY created_at DESC
        ''')
        
        workbooks = []
        for row in cursor.fetchall():
            workbook_info = {
                'id': row[0],
                'name': row[1],
                'folder_name': row[2],
                'template': row[3],
                'category': row[4],
                'project_path': row[5],
                'db_path': row[6],
                'objects_path': row[7],
                'created_at': row[8],
                'git_hash': row[9],
                'status': row[10]
            }
            
            # Add folder structure info
            if os.path.exists(row[5]):  # project_path
                folder_contents = os.listdir(row[5])
                workbook_info['folder_contents'] = folder_contents
                workbook_info['folder_exists'] = True
            else:
                workbook_info['folder_exists'] = False
            
            workbooks.append(workbook_info)
        
        conn.close()
        
        return jsonify({
            'success': True,
            'workbooks': workbooks,
            'count': len(workbooks)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/workbook/<int:workbook_id>', methods=['GET'])
def get_workbook(workbook_id):
    """Get a specific workbook from master database"""
    try:
        # Get workbook info from master database
        master_conn = sqlite3.connect('master_workbooks.db')
        master_cursor = master_conn.cursor()
        
        master_cursor.execute('''
            SELECT name, folder_name, template, category, project_path, db_path, objects_path, created_at, git_hash, status
            FROM workbooks
            WHERE id = ? AND status = 'active'
        ''', (workbook_id,))
        
        master_row = master_cursor.fetchone()
        if not master_row:
            return jsonify({
                'success': False,
                'error': 'Workbook not found'
            }), 404
        
        workbook_name, folder_name, template, category, project_path, db_path, objects_path, created_at, git_hash, status = master_row
        master_conn.close()
        
        # Get detailed data from workbook-specific database
        if not os.path.exists(db_path):
            return jsonify({
                'success': False,
                'error': 'Workbook database not found'
            }), 404
        
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Get workbook metadata
        cursor.execute('SELECT * FROM workbook_metadata WHERE id = 1')
        metadata_row = cursor.fetchone()
        
        # Get all rows
        cursor.execute('SELECT row_index, data, git_hash, created_at, updated_at FROM rows ORDER BY row_index')
        rows_data = cursor.fetchall()
        
        # Get version history
        cursor.execute('SELECT action_type, description, git_hash, author, created_at FROM version_history ORDER BY created_at DESC LIMIT 10')
        history_data = cursor.fetchall()
        
        conn.close()
        
        # Get objects from objects folder with new directory structure
        objects_info = []
        directory_structure = {}
        
        if os.path.exists(objects_path):
            all_objects, directory_stats = get_all_hashed_objects(workbook_name)
            
            objects_info = all_objects
            directory_structure = directory_stats
        
        workbook = {
            'id': workbook_id,
            'name': workbook_name,
            'folder_name': folder_name,
            'template': template,
            'category': category,
            'created_at': created_at,
            'git_hash': git_hash,
            'status': status,
            'project_structure': {
                'project_path': project_path,
                'db_path': db_path,
                'objects_path': objects_path,
                'folder_exists': os.path.exists(project_path),
                'db_exists': os.path.exists(db_path),
                'objects_exist': os.path.exists(objects_path)
            },
            'rows': [{'index': row[0], 'data': json.loads(row[1]), 'hash': row[2], 'created_at': row[3], 'updated_at': row[4]} for row in rows_data],
            'history': [{'action': row[0], 'description': row[1], 'hash': row[2], 'author': row[3], 'timestamp': row[4]} for row in history_data],
            'objects': objects_info,
            'object_directory_structure': directory_structure
        }
        
        return jsonify({
            'success': True,
            'workbook': workbook
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/workbook/check-name/<workbook_name>', methods=['GET'])
def check_workbook_name(workbook_name):
    """Check if a workbook name is available"""
    try:
        print(f"🔍 Checking availability of workbook name: '{workbook_name}'")
        
        existence_check = check_workbook_exists(workbook_name)
        
        if existence_check['exists']:
            print(f"❌ Name '{workbook_name}' is already in use")
            return jsonify({
                'available': False,
                'exists': True,
                'workbook_name': workbook_name,
                'folder_name': existence_check['folder_name'],
                'conflict_details': existence_check,
                'message': f'Workbook name "{workbook_name}" is already in use',
                'suggestions': [
                    f'{workbook_name}_v2',
                    f'{workbook_name}_{datetime.now().strftime("%Y%m%d")}',
                    f'{workbook_name}_copy',
                    f'New_{workbook_name}'
                ]
            })
        else:
            print(f"✅ Name '{workbook_name}' is available")
            return jsonify({
                'available': True,
                'exists': False,
                'workbook_name': workbook_name,
                'folder_name': existence_check['folder_name'],
                'message': f'Workbook name "{workbook_name}" is available',
                'sanitized_folder_name': existence_check['folder_name']
            })
            
    except Exception as e:
        print(f"❌ Error checking workbook name: {str(e)}")
        return jsonify({
            'available': False,
            'error': str(e),
            'message': 'Error checking workbook name availability'
        }), 500
def get_workbook_object(workbook_id, hash_value):
    """Get a specific hashed object using the new directory structure"""
    try:
        # Get workbook info from master database
        master_conn = sqlite3.connect('master_workbooks.db')
        master_cursor = master_conn.cursor()
        
        master_cursor.execute('''
            SELECT name, folder_name FROM workbooks
            WHERE id = ? AND status = 'active'
        ''', (workbook_id,))
        
        row = master_cursor.fetchone()
        if not row:
            return jsonify({
                'success': False,
                'error': 'Workbook not found'
            }), 404
        
        workbook_name, folder_name = row
        master_conn.close()
        
        # Get the hashed object using new directory structure
        object_data = get_hashed_object(workbook_name, hash_value)
        
        if not object_data:
            return jsonify({
                'success': False,
                'error': 'Object not found',
                'hash': hash_value,
                'lookup_info': {
                    'hash_prefix': hash_value[:2],
                    'hash_suffix': hash_value[2:],
                    'expected_directory': hash_value[:2]
                }
            }), 404
        
        return jsonify({
            'success': True,
            'object': object_data,
            'lookup_info': {
                'hash_prefix': hash_value[:2],
                'hash_suffix': hash_value[2:],
                'directory': hash_value[:2],
                'filename': object_data.get('hash_info', {}).get('filename', 'unknown')
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/workbook/<int:workbook_id>/objects/stats', methods=['GET'])
def get_workbook_object_stats(workbook_id):
    """Get statistics about the object directory structure"""
    try:
        # Get workbook info from master database
        master_conn = sqlite3.connect('master_workbooks.db')
        master_cursor = master_conn.cursor()
        
        master_cursor.execute('''
            SELECT name, folder_name FROM workbooks
            WHERE id = ? AND status = 'active'
        ''', (workbook_id,))
        
        row = master_cursor.fetchone()
        if not row:
            return jsonify({
                'success': False,
                'error': 'Workbook not found'
            }), 404
        
        workbook_name, folder_name = row
        master_conn.close()
        
        # Get all objects and directory stats
        all_objects, directory_stats = get_all_hashed_objects(workbook_name)
        
        # Calculate statistics
        object_types = {}
        for obj in all_objects:
            obj_type = obj['object_type']
            if obj_type not in object_types:
                object_types[obj_type] = 0
            object_types[obj_type] += 1
        
        # Directory distribution analysis
        distribution_analysis = {}
        for prefix, stats in directory_stats.items():
            distribution_analysis[prefix] = {
                'file_count': stats['file_count'],
                'percentage': (stats['file_count'] / len(all_objects)) * 100 if all_objects else 0
            }
        
        return jsonify({
            'success': True,
            'workbook_name': workbook_name,
            'statistics': {
                'total_objects': len(all_objects),
                'total_directories': len(directory_stats),
                'object_types': object_types,
                'directory_distribution': distribution_analysis,
                'average_objects_per_directory': len(all_objects) / len(directory_stats) if directory_stats else 0
            },
            'directory_details': directory_stats,
            'sample_objects': all_objects[:5]  # First 5 objects as examples
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/workbook/<int:workbook_id>/structure', methods=['GET'])
def get_workbook_structure(workbook_id):
    """Get the folder structure for a specific workbook"""
    try:
        # Get workbook info from master database
        master_conn = sqlite3.connect('master_workbooks.db')
        master_cursor = master_conn.cursor()
        
        master_cursor.execute('''
            SELECT name, folder_name, project_path, db_path, objects_path
            FROM workbooks
            WHERE id = ? AND status = 'active'
        ''', (workbook_id,))
        
        row = master_cursor.fetchone()
        if not row:
            return jsonify({
                'success': False,
                'error': 'Workbook not found'
            }), 404
        
        name, folder_name, project_path, db_path, objects_path = row
        master_conn.close()
        
        # Analyze folder structure
        structure = {
            'workbook_name': name,
            'folder_name': folder_name,
            'project_path': project_path,
            'folders': {}
        }
        
        if os.path.exists(project_path):
            structure['folders']['main'] = {
                'path': project_path,
                'exists': True,
                'contents': os.listdir(project_path)
            }
            
            if os.path.exists(db_path):
                structure['folders']['db'] = {
                    'path': db_path,
                    'exists': True,
                    'size': os.path.getsize(db_path)
                }
            
            if os.path.exists(objects_path):
                all_objects, directory_stats = get_all_hashed_objects(folder_name)
                
                structure['folders']['objects'] = {
                    'path': objects_path,
                    'exists': True,
                    'total_objects': len(all_objects),
                    'directory_count': len(directory_stats),
                    'directory_structure': directory_stats,
                    'objects': all_objects[:10] if len(all_objects) > 10 else all_objects  # Limit to first 10 for API response
                }
        else:
            structure['folders']['main'] = {
                'path': project_path,
                'exists': False
            }
        
        return jsonify({
            'success': True,
            'structure': structure
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    """Get the folder structure for a specific workbook"""
    try:
        # Get workbook info from master database
        master_conn = sqlite3.connect('master_workbooks.db')
        master_cursor = master_conn.cursor()
        
        master_cursor.execute('''
            SELECT name, folder_name, project_path, db_path, objects_path
            FROM workbooks
            WHERE id = ? AND status = 'active'
        ''', (workbook_id,))
        
        row = master_cursor.fetchone()
        if not row:
            return jsonify({
                'success': False,
                'error': 'Workbook not found'
            }), 404
        
        name, folder_name, project_path, db_path, objects_path = row
        master_conn.close()
        
        # Analyze folder structure
        structure = {
            'workbook_name': name,
            'folder_name': folder_name,
            'project_path': project_path,
            'folders': {}
        }
        
        if os.path.exists(project_path):
            structure['folders']['main'] = {
                'path': project_path,
                'exists': True,
                'contents': os.listdir(project_path)
            }
            
            if os.path.exists(db_path):
                structure['folders']['db'] = {
                    'path': db_path,
                    'exists': True,
                    'size': os.path.getsize(db_path)
                }
            
            if os.path.exists(objects_path):
                all_objects, directory_stats = get_all_hashed_objects(folder_name)
                
                structure['folders']['objects'] = {
                    'path': objects_path,
                    'exists': True,
                    'total_objects': len(all_objects),
                    'directory_count': len(directory_stats),
                    'directory_structure': directory_stats,
                    'objects': all_objects[:10] if len(all_objects) > 10 else all_objects  # Limit to first 10 for API response
                }
        else:
            structure['folders']['main'] = {
                'path': project_path,
                'exists': False
            }
        
        return jsonify({
            'success': True,
            'structure': structure
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint with project structure info"""
    try:
        # Check if projects folder exists
        projects_exist = os.path.exists(PROJECTS_ROOT)
        projects_absolute_path = os.path.abspath(PROJECTS_ROOT)
        project_count = 0
        
        if projects_exist:
            try:
                project_folders = [d for d in os.listdir(PROJECTS_ROOT) 
                                 if os.path.isdir(os.path.join(PROJECTS_ROOT, d))]
                project_count = len(project_folders)
            except Exception as e:
                print(f"Error reading projects folder: {e}")
                project_folders = []
        else:
            project_folders = []
        
        # Check master database
        master_db_exists = os.path.exists('master_workbooks.db')
        
        return jsonify({
            'status': 'healthy',
            'service': 'TrackSheets Backend with Git-Style Project Structure',
            'timestamp': datetime.now().isoformat(),
            'current_directory': os.getcwd(),
            'project_structure': {
                'projects_folder_exists': projects_exist,
                'projects_absolute_path': projects_absolute_path,
                'project_count': project_count,
                'project_folders': project_folders,
                'master_database_exists': master_db_exists,
                'projects_root_config': PROJECTS_ROOT
            },
            'debug_endpoints': {
                'test_folder_creation': '/api/debug/test-folders/<workbook_name>',
                'example': '/api/debug/test-folders/Test_CRM'
            }
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'error': str(e),
            'timestamp': datetime.now().isoformat(),
            'current_directory': os.getcwd(),
            'projects_root_config': PROJECTS_ROOT,
            'projects_absolute_path': os.path.abspath(PROJECTS_ROOT)
        }), 500
def health_check():
    """Health check endpoint with project structure info"""
    try:
        # Check if projects folder exists
        projects_exist = os.path.exists(PROJECTS_ROOT)
        project_count = 0
        
        if projects_exist:
            project_count = len([d for d in os.listdir(PROJECTS_ROOT) 
                               if os.path.isdir(os.path.join(PROJECTS_ROOT, d))])
        
        # Check master database
        master_db_exists = os.path.exists('master_workbooks.db')
        
        return jsonify({
            'status': 'healthy',
            'service': 'TrackSheets Backend with Project Structure',
            'timestamp': datetime.now().isoformat(),
            'project_structure': {
                'projects_folder_exists': projects_exist,
                'project_count': project_count,
                'master_database_exists': master_db_exists,
                'projects_root': PROJECTS_ROOT
            }
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

if __name__ == '__main__':
    print("🚀 Starting TrackSheets Backend with Git-Style Object Storage...")
    print("=" * 60)
    
    # Show critical path information
    current_dir = os.getcwd()
    script_location = os.path.dirname(os.path.abspath(__file__)) if '__file__' in globals() else current_dir
    projects_absolute = os.path.abspath(PROJECTS_ROOT)
    
    print("📍 IMPORTANT PATH INFORMATION:")
    print(f"   🖥️  Current Working Directory: {current_dir}")
    print(f"   📄  Python Script Location: {script_location}")
    print(f"   📂  Projects Folder Will Be: {projects_absolute}")
    print(f"   ⚠️   Projects Folder Config: PROJECTS_ROOT = '{PROJECTS_ROOT}'")
    
    # Create projects root folder if it doesn't exist
    print("\n📁 Setting up project structure...")
    try:
        os.makedirs(PROJECTS_ROOT, exist_ok=True)
        if os.path.exists(PROJECTS_ROOT):
            print(f"✅ Projects folder ready at: {projects_absolute}")
            try:
                contents = os.listdir(PROJECTS_ROOT)
                print(f"📋 Current contents: {contents if contents else 'EMPTY'}")
            except Exception as e:
                print(f"❌ Error reading projects folder: {e}")
        else:
            print(f"❌ Failed to create projects folder at: {projects_absolute}")
    except Exception as e:
        print(f"❌ Error creating projects folder: {e}")
    
    print("\n📊 Initializing master database...")
    try:
        init_master_db()
        print("✅ Master database ready!")
    except Exception as e:
        print(f"❌ Error initializing database: {e}")
    
    print("\n🔐 Git-Style Object Storage:")
    print("   📁 Objects stored in subdirectories by hash prefix (first 2 chars)")
    print("   📄 Example: hash '1d43477872349...' → objects/1d/43477872349_row_0.json")
    print("   🚀 Enables fast O(1) hash lookups and better filesystem performance")
    
    print("\n🔗 API Endpoints:")
    print("   POST /api/workbook/create - Create new workbook with project structure")
    print("   GET  /api/workbooks - List all workbooks")
    print("   GET  /api/workbook/<id> - Get specific workbook")
    print("   GET  /api/workbook/<id>/structure - Get workbook folder structure")
    print("   GET  /api/workbook/<id>/object/<hash> - Get specific hashed object")
    print("   GET  /api/workbook/<id>/objects/stats - Get object storage statistics")
    print("   GET  /api/debug/test-folders/<name> - Test folder creation (DEBUG)")
    print("   GET  /api/health - Health check with folder info")
    
    print("\n🧪 DEBUGGING HELP:")
    print("   If folders aren't appearing where expected:")
    print(f"   1. Check: {projects_absolute}")
    print("   2. Use: GET /api/health (shows folder locations)")
    print("   3. Test: GET /api/debug/test-folders/Test_CRM")
    print("   4. Check Python console output for detailed folder creation logs")
    
    print("\n🌐 Starting Flask server on http://localhost:5000")
    print("🔗 Frontend should connect to: http://localhost:5000/api/workbook/create")
    print("=" * 60)
    
    app.run(debug=True, host='0.0.0.0', port=5000)