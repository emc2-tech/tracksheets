#!/usr/bin/env python3
"""
TrackSheets Flask Backend - Self-Contained Workbook Architecture
Each workbook has its own database and object store
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os
from datetime import datetime
import hashlib
import sqlite3
from workbook_manager import WorkbookManager
import socket
import json
import os

app = Flask(__name__)
CORS(app, resources={
    r"/*": {
        "origins": "*",
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type"]
    }
})

# Initialize workbook manager
wm = WorkbookManager(projects_base_dir="projects")

# ===============================
# WORKBOOK MANAGEMENT ENDPOINTS
# ===============================

@app.route('/api/workbook/create', methods=['POST'])
def create_workbook():
    """Create a new self-contained workbook with unified column storage"""
    try:
        data = request.get_json()
        
        name = data.get('name', '').strip()
        template = data.get('template', 'Blank')
        category = data.get('category', 'General')
        created_by = data.get('created_by', 'anonymous@user.com')
        
        if not name:
            return jsonify({
                'success': False,
                'error': 'invalid_name',
                'message': 'Workbook name is required'
            }), 400
        
        # Create workbook using WorkbookManager
        result = wm.create_workbook(name, template, category, created_by)
        
        if result['success']:
            # Get template data
            initial_data = get_template_initial_data(template)
            
            # Save initial column configuration using unified pattern
            if initial_data and initial_data.get('columns'):
                print(f"🔧 Setting up initial column configuration for template: {template}")
                
                # Create proper column objects
                columns = create_columns_from_template(template)
                
                # Save using unified pattern
                config_hash = save_column_config_unified(name, columns, f'system@{template.lower()}')
                print(f"✅ Saved initial column config with hash: {config_hash[:12]}...")
                
                # Update initial data
                initial_data['column_config_hash'] = config_hash
            
            return jsonify({
                'success': True,
                'workbook_id': result['workbook_id'],
                'name': name,
                'template': template,
                'created_at': result['created_at'],
                'initialData': initial_data,
                'message': result['message']
            }), 201
        else:
            if result.get('error') == 'workbook_already_exists':
                return jsonify(result), 409
            else:
                return jsonify(result), 500
    
    except Exception as e:
        app.logger.error(f"Error creating workbook: {e}")
        return jsonify({
            'success': False,
            'error': 'internal_error',
            'message': 'Internal server error'
        }), 500

@app.route('/api/workbook/check-name/<name>', methods=['GET'])
def check_workbook_name(name):
    """Check if workbook name is available"""
    try:
        workbook = wm.get_workbook(name)
        
        if workbook:
            return jsonify({
                'available': False,
                'exists': True,
                'workbook_info': {
                    'name': workbook['name'],
                    'template': workbook.get('template'),
                    'created_at': workbook.get('created_at')
                }
            })
        else:
            return jsonify({
                'available': True,
                'exists': False
            })
    
    except Exception as e:
        app.logger.error(f"Error checking workbook name: {e}")
        return jsonify({
            'available': False,
            'error': 'check_failed',
            'message': str(e)
        }), 500

@app.route('/api/workbooks', methods=['GET'])
def list_workbooks():
    """List all available workbooks"""
    try:
        workbooks = wm.list_workbooks()
        return jsonify({
            'success': True,
            'workbooks': workbooks,
            'count': len(workbooks)
        })
    
    except Exception as e:
        app.logger.error(f"Error listing workbooks: {e}")
        return jsonify({
            'success': False,
            'error': 'list_failed',
            'message': str(e)
        }), 500

@app.route('/api/workbook/<name>', methods=['GET'])
def get_workbook(name):
    """Get specific workbook information"""
    try:
        workbook = wm.get_workbook(name)
        
        if not workbook:
            return jsonify({
                'success': False,
                'error': 'workbook_not_found',
                'message': f'Workbook "{name}" not found'
            }), 404
        
        return jsonify({
            'success': True,
            'workbook': workbook
        })
    
    except Exception as e:
        app.logger.error(f"Error getting workbook: {e}")
        return jsonify({
            'success': False,
            'error': 'get_failed',
            'message': str(e)
        }), 500

@app.route('/api/workbook/<name>', methods=['DELETE'])
def delete_workbook(name):
    """Delete a workbook completely"""
    try:
        result = wm.delete_workbook(name)
        
        if result['success']:
            return jsonify(result)
        else:
            return jsonify(result), 404 if 'not_found' in result.get('error', '') else 500
    
    except Exception as e:
        app.logger.error(f"Error deleting workbook: {e}")
        return jsonify({
            'success': False,
            'error': 'delete_failed',
            'message': str(e)
        }), 500

@app.route('/api/workbook/<workbook_name>/current-data', methods=['GET'])
def get_current_workbook_data(workbook_name):
    """Get current workbook data using unified change_log → git_objects pattern"""
    print(f"🔍 DEBUG: current-data endpoint called for workbook: {workbook_name}")
    
    try:
        # Verify workbook exists
        workbook = wm.get_workbook(workbook_name)
        if not workbook:
            return jsonify({'success': False, 'error': 'workbook_not_found'}), 404

        conn = wm.get_workbook_database(workbook_name)
        if not conn:
            return jsonify({'success': False, 'error': 'database_error'}), 500

        cursor = conn.cursor()
        
        # Step 1: Get latest column configuration from change_log
        print("🏛️ Looking for column configuration in change_log...")
        cursor.execute("""
            SELECT git_hash, timestamp
            FROM change_log 
            WHERE change_type = 'column_update' 
              AND git_hash IS NOT NULL
            ORDER BY timestamp DESC 
            LIMIT 1
        """)
        
        column_result = cursor.fetchone()
        columns = None
        
        if column_result:
            column_git_hash, column_timestamp = column_result
            print(f"✅ Found column config: {column_git_hash[:12]}... from {column_timestamp}")
            
            # Load column configuration from git object
            column_obj = wm.get_object(workbook_name, column_git_hash)
            if column_obj and 'columns' in column_obj:
                columns = column_obj['columns']
                print(f"✅ Loaded {len(columns)} columns from git object")
            else:
                print(f"❌ Could not load column object data")
        else:
            print("⚠️ No column configuration found in change_log")
        
        # Fallback to template if no columns found
        if not columns:
            print("🔄 Using template fallback for columns")
            template = workbook.get('template', 'Blank')
            columns = create_columns_from_template(template)
            
            # Save this column config for future use
            if columns:
                save_column_config_unified(workbook_name, columns)
                print(f"💾 Saved template columns to unified storage")

        print(f"📋 Final columns ({len(columns)}): {[c['name'] for c in columns]}")

        # Step 2: Get latest row data from change_log
        print("📊 Looking for row data in change_log...")
        cursor.execute("""
            SELECT row_index, git_hash, timestamp
            FROM change_log 
            WHERE change_type IN ('cell_update', 'row_updated', 'send_validation') 
              AND git_hash IS NOT NULL 
              AND row_index IS NOT NULL
            ORDER BY row_index, timestamp DESC
        """)
        
        all_row_changes = cursor.fetchall()
        print(f"📊 Found {len(all_row_changes)} row change records")
        
        # Get latest hash per row
        latest_row_hashes = {}
        for row_index, git_hash, timestamp in all_row_changes:
            if row_index not in latest_row_hashes:
                latest_row_hashes[row_index] = git_hash

        print(f"📈 Found latest hashes for {len(latest_row_hashes)} rows")

        # Step 3: Build rows from git objects
        rows = []
        git_hashes = {}
        
        if latest_row_hashes:
            max_row = max(latest_row_hashes.keys())
            
            for row_index in range(max_row + 1):
                if row_index in latest_row_hashes:
                    git_hash = latest_row_hashes[row_index]
                    
                    # Get object data
                    object_data = wm.get_object(workbook_name, git_hash)
                    
                    if object_data and 'data' in object_data:
                        git_hashes[str(row_index)] = git_hash
                        
                        # Convert dict data to array format
                        row_array = convert_dict_to_row_array(object_data['data'], columns)
                        rows.append(row_array)
                        print(f"✅ Row {row_index}: {len(row_array)} cells loaded")
                    else:
                        rows.append([''] * len([c for c in columns if c['type'] not in ['action', 'status']]))
                        print(f"⚠️ Row {row_index}: Empty/missing data")
                else:
                    rows.append([''] * len([c for c in columns if c['type'] not in ['action', 'status']]))

        conn.close()

        # Return unified response
        result = {
            'success': True,
            'columns': columns,
            'rows': rows,
            'git_hashes': git_hashes
        }
        
        print(f"✅ Returning {len(rows)} rows, {len(columns)} columns (unified storage)")
        return jsonify(result)
        
    except Exception as e:
        print(f"❌ Critical error in unified current-data endpoint: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/workbook/<workbook_name>/row-history/<int:row_index>', methods=['GET'])
def get_row_history(workbook_name, row_index):
    try:
        conn = wm.get_workbook_database(workbook_name)
        if not conn:
            return jsonify({'success': False, 'error': 'Workbook not found'}), 404
        
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, user_email, user_display_name, timestamp, git_hash
            FROM change_log 
            WHERE row_index = ? 
            ORDER BY timestamp DESC
            LIMIT 20
        """, (row_index,))
        
        history = []
        for row in cursor.fetchall():
            git_hash = row[4]
            
            # Retrieve full row data using hash lookup
            full_row_data = wm.get_object(workbook_name, git_hash) if git_hash else {}
            
            # Extract the actual row data from the stored object
            row_data = full_row_data.get('data', {}) if full_row_data else {}
            
            history.append({
                'id': row[0],
                'user_email': row[1],
                'user_display_name': row[2] or row[1],
                'timestamp': row[3],
                'git_hash': git_hash,
                'full_row_data': row_data,
                'changed_fields': list(row_data.keys()) if row_data else []
            })
        
        conn.close()
        
        return jsonify({
            'success': True,
            'history': history,
            'row_index': row_index
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/workbook/<workbook_name>/row-updated', methods=['POST'])
def handle_row_update(workbook_name):
    """Handle row updates with unified storage pattern"""
    try:
        data = request.get_json()
        
        row_index = data.get('row_index')
        row_data = data.get('row_data', {})
        action_type = data.get('action_type', 'cell_update')
        user_email = data.get('user_id', 'anonymous@user.com')
        
        # Verify workbook exists
        workbook = wm.get_workbook(workbook_name)
        if not workbook:
            return jsonify({
                'success': False,
                'error': 'workbook_not_found',
                'message': f'Workbook "{workbook_name}" not found'
            }), 404
        
        # Save row data as object
        object_data = {
            'row_index': row_index,
            'data': row_data,
            'action_type': action_type,
            'timestamp': datetime.now().isoformat(),
            'user_email': user_email
        }
        
        git_hash = wm.save_object(workbook_name, object_data, 'row', row_index)
        
        # Store in change_log with unified pattern
        conn = wm.get_workbook_database(workbook_name)
        if conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO change_log (
                    user_email, change_type, row_index, 
                    git_hash, timestamp, user_display_name
                ) VALUES (?, ?, ?, ?, ?, ?)
            """, (
                user_email, 
                'cell_update',
                row_index,
                git_hash,
                datetime.now().isoformat(),
                user_email.split('@')[0]
            ))
            conn.commit()
            conn.close()
        
        # Run business logic
        business_actions = run_custom_validation_logic(workbook_name, row_index, row_data)
        
        return jsonify({
            'success': True,
            'message': f'Row {row_index} processed successfully (unified storage)',
            'git_hash': git_hash,
            'business_actions': business_actions or [],
            'workbook': workbook_name
        })
    
    except Exception as e:
        app.logger.error(f"Error processing row update: {e}")
        return jsonify({
            'success': False,
            'error': 'processing_failed',
            'message': str(e)
        }), 500

@app.route('/api/workbook/<workbook_name>/save-columns', methods=['POST'])
def save_columns_from_frontend(workbook_name):
    """Save column configuration when user modifies columns in frontend"""
    try:
        data = request.get_json()
        columns = data.get('columns', [])
        user_email = data.get('user_email', 'frontend@user.com')
        
        print(f"🏛️ Frontend requesting to save {len(columns)} columns for {workbook_name}")
        for i, col in enumerate(columns):
            print(f"   [{i}] {col.get('name')} (type: {col.get('type')})")
        
        if not columns:
            return jsonify({
                'success': False,
                'error': 'no_columns', 
                'message': 'No columns provided'
            }), 400
        
        # Verify workbook exists
        workbook = wm.get_workbook(workbook_name)
        if not workbook:
            return jsonify({
                'success': False,
                'error': 'workbook_not_found'
            }), 404
        
        # Save using unified pattern
        config_hash = save_column_config_unified(workbook_name, columns, user_email)
        
        if config_hash:
            print(f"✅ Saved column config from frontend: {config_hash[:12]}...")
            return jsonify({
                'success': True,
                'message': f'Saved {len(columns)} columns',
                'git_hash': config_hash,
                'change_type': 'column_update'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'save_failed'
            }), 500
            
    except Exception as e:
        print(f"❌ Error saving columns from frontend: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/workbook/<workbook_name>/object/<object_hash>', methods=['GET'])
def get_object(workbook_name, object_hash):
    """Retrieve object by hash"""
    try:
        obj = wm.get_object(workbook_name, object_hash)
        
        if obj:
            return jsonify({
                'success': True,
                'object': obj,
                'hash': object_hash
            })
        else:
            return jsonify({
                'success': False,
                'error': 'object_not_found',
                'message': f'Object {object_hash} not found in workbook {workbook_name}'
            }), 404
    
    except Exception as e:
        app.logger.error(f"Error retrieving object: {e}")
        return jsonify({
            'success': False,
            'error': 'retrieval_failed',
            'message': str(e)
        }), 500

@app.route('/api/workbook/<workbook_name>/history', methods=['GET'])
def get_workbook_history(workbook_name):
    """Get change history for workbook"""
    try:
        conn = wm.get_workbook_database(workbook_name)
        if not conn:
            return jsonify({
                'success': False,
                'error': 'workbook_not_found',
                'message': f'Workbook "{workbook_name}" not found'
            }), 404
        
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, user_email, change_type, row_index, column_index,
                   old_value, new_value, git_hash, timestamp
            FROM change_log
            ORDER BY timestamp DESC
            LIMIT 100
        """)
        
        changes = []
        for row in cursor.fetchall():
            changes.append({
                'id': row[0],
                'user_email': row[1],
                'change_type': row[2],
                'row_index': row[3],
                'column_index': row[4],
                'old_value': row[5],
                'new_value': row[6],
                'git_hash': row[7],
                'timestamp': row[8]
            })
        
        conn.close()
        
        return jsonify({
            'success': True,
            'changes': changes,
            'workbook': workbook_name
        })
    
    except Exception as e:
        app.logger.error(f"Error getting workbook history: {e}")
        return jsonify({
            'success': False,
            'error': 'history_failed',
            'message': str(e)
        }), 500

# ===============================
# HELPER FUNCTIONS
# ===============================

def save_column_config_unified(workbook_name, columns, user_email='system@tracksheets.com'):
    """Save column configuration using unified change_log → git_objects pattern"""
    try:
        print(f"💾 Saving column config for {workbook_name} with {len(columns)} columns")
        
        # Create column configuration object
        config_data = {
            'type': 'column_configuration',
            'columns': columns,
            'action_type': 'column_update',
            'timestamp': datetime.now().isoformat(),
            'user_email': user_email,
            'workbook_name': workbook_name
        }
        
        # Save to git objects
        config_hash = wm.save_object(workbook_name, config_data, 'column_config')
        print(f"🔐 Created git object: {config_hash[:12]}...")
        
        # Save to change_log
        conn = wm.get_workbook_database(workbook_name)
        if conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO change_log (
                    user_email, change_type, row_index, 
                    git_hash, timestamp, user_display_name
                ) VALUES (?, ?, ?, ?, ?, ?)
            """, (
                user_email,
                'column_update',
                None,
                config_hash,
                datetime.now().isoformat(),
                user_email.split('@')[0]
            ))
            conn.commit()
            conn.close()
            print(f"📝 Added column_update entry to change_log")
        else:
            print(f"❌ Could not get database connection for {workbook_name}")
            return None
        
        return config_hash
        
    except Exception as e:
        print(f"❌ Error saving column config (unified): {e}")
        import traceback
        traceback.print_exc()
        return None

def create_columns_from_template(template):
    """Create column configuration from template"""
    template_data = get_template_initial_data(template)
    
    if not template_data or not template_data.get('columns'):
        return [
            {'id': 'A', 'name': 'Column A', 'type': 'text', 'width': 150, 'sensitivity': 'Standard'},
            {'id': 'B', 'name': 'Column B', 'type': 'text', 'width': 150, 'sensitivity': 'Standard'},
            {'id': 'C', 'name': 'Column C', 'type': 'text', 'width': 150, 'sensitivity': 'Standard'}
        ]
    
    columns = []
    for i, col_name in enumerate(template_data['columns']):
        columns.append({
            'id': chr(65 + i),
            'name': col_name,
            'type': detect_column_type(col_name),
            'width': calculate_column_width(col_name),
            'sensitivity': detect_sensitivity(col_name),
            'required': i < 3,
            'validation': detect_validation_type(col_name)
        })
    
    if template == 'Customer Database':
        columns.extend([
            {'id': 'L', 'name': 'Send for Validation', 'type': 'action', 'width': 140, 'sensitivity': 'Standard'},
            {'id': 'M', 'name': 'Customer Validation', 'type': 'status', 'width': 140, 'sensitivity': 'Standard'}
        ])
    
    return columns

def convert_dict_to_row_array(row_dict, columns):
    """Convert row dictionary to array matching column order"""
    row_array = []
    for col in columns:
        if col['type'] in ['action', 'status']:
            continue
        field_name = col['name'].lower().replace(' ', '_').replace('/', '_')
        cell_value = row_dict.get(field_name, '')
        row_array.append(cell_value)
    return row_array

def detect_column_type(col_name):
    name = col_name.lower()
    if any(word in name for word in ['date', 'birth']): return 'date'
    if any(word in name for word in ['amount', 'price', 'cost', 'revenue']): return 'number'
    if any(word in name for word in ['quantity', 'stock', 'count']): return 'number'
    return 'text'

def calculate_column_width(col_name):
    name = col_name.lower()
    if any(word in name for word in ['address', 'description']): return 200
    if 'email' in name: return 180
    if any(word in name for word in ['amount', 'outstanding']): return 160
    if any(word in name for word in ['phone', 'telephone']): return 140
    if any(word in name for word in ['postcode', 'zip']): return 100
    return 150

def detect_sensitivity(col_name):
    name = col_name.lower()
    if any(word in name for word in ['credit card', 'card number']): return 'PCI'
    if any(word in name for word in ['name', 'address', 'phone', 'email', 'birth']): return 'PII'
    return 'Standard'

def detect_validation_type(col_name):
    name = col_name.lower()
    if 'email' in name: return 'email'
    if any(word in name for word in ['phone', 'telephone']): return 'phone'
    if any(word in name for word in ['postcode', 'zip']): return 'postcode'
    if any(word in name for word in ['date', 'birth']): return 'date'
    if any(word in name for word in ['amount', 'price', 'cost']): return 'currency'
    if any(word in name for word in ['credit card', 'card number']): return 'creditcard'
    if 'frequency' in name: return 'frequency'
    if 'name' in name: return 'name'
    return 'text'

def run_custom_validation_logic(workbook_name, row_index, data):
    """Run custom business logic when data is updated"""
    business_actions = []
    
    try:
        # Example: Loan amount validation
        loan_amount = float(data.get('loan_amount', 0))
        if loan_amount > 100000:
            business_actions.append({
                'type': 'manager_approval',
                'message': f'High loan amount detected: €{loan_amount:,}',
                'trigger': f'loan_amount > 100000',
                'data': {'loan_amount': loan_amount, 'requires_approval': True},
                'status': 'pending'
            })
        
        # Example: Duplicate detection
        name = data.get('name', '').strip()
        email = data.get('email', '').strip()
        
        if name and email:
            # Check for duplicates in this workbook
            conn = wm.get_workbook_database(workbook_name)
            if conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT COUNT(*) FROM change_log 
                    WHERE new_value = ? OR new_value = ?
                """, (name, email))
                
                duplicate_count = cursor.fetchone()[0]
                conn.close()
                
                if duplicate_count > 1:
                    business_actions.append({
                        'type': 'duplicate_warning',
                        'message': f'Potential duplicate detected for {name}',
                        'data': {'name': name, 'email': email, 'duplicate_count': duplicate_count},
                        'status': 'warning'
                    })
        
        return business_actions
        
    except Exception as e:
        app.logger.error(f"Error in business logic: {e}")
        return []

def get_template_initial_data(template):
    """Get initial data for template"""
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
        }
    }
    
    return templates.get(template, {'columns': [], 'rows': []})

# ===============================
# SYSTEM ENDPOINTS
# ===============================

@app.route('/api/system/status', methods=['GET'])
def system_status():
    """Get system status"""
    try:
        workbooks = wm.list_workbooks()
        
        return jsonify({
            'status': 'running',
            'architecture': 'self_contained_workbooks',
            'workbook_count': len(workbooks),
            'projects_directory': str(wm.projects_dir),
            'version': '2.0.0-self-contained'
        })
    
    except Exception as e:
        return jsonify({
            'status': 'error',
            'error': str(e)
        }), 500



def find_available_port(start_port=5000, max_attempts=10):
    """Find an available port starting from start_port"""
    for port in range(start_port, start_port + max_attempts):
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.bind(('localhost', port))
            sock.close()
            return port
        except OSError:
            continue
    raise RuntimeError(f"No available ports found in range {start_port}-{start_port + max_attempts}")

def write_backend_config(port):
    """Write backend configuration for frontend to discover"""
    config = {
        'backend_url': f'http://localhost:{port}',
        'port': port,
        'status': 'running',
        'timestamp': datetime.now().isoformat(),
        'version': '2.0.0-self-contained'
    }
    
    # Write to public directory so frontend can access it
    os.makedirs('public', exist_ok=True)
    with open('public/backend-config.json', 'w') as f:
        json.dump(config, f, indent=2)
    
    print(f"📝 Backend config written to public/backend-config.json")
    return config

# ADD this endpoint anywhere with your other routes:

@app.route('/api/config', methods=['GET'])
def get_backend_config():
    """Return backend configuration"""
    return jsonify({
        'backend_url': request.host_url.rstrip('/'),
        'status': 'running',
        'timestamp': datetime.now().isoformat(),
        'version': '2.0.0-self-contained'
    })



# ===============================
# MAIN APPLICATION
# ===============================

if __name__ == '__main__':
    print("🚀 Starting TrackSheets Backend - Self-Contained Architecture")
    print(f"📁 Projects directory: {wm.projects_dir}")
    print(f"🗄️  Using per-workbook databases")
    
    # Find available port automatically
    try:
        port = find_available_port(5000, 10)  # Try ports 5000-5009
        print(f"🔗 Found available port: {port}")
        
        # Write config for frontend discovery
        config = write_backend_config(port)
        print(f"🔗 Available at: {config['backend_url']}")
        
    except RuntimeError as e:
        print(f"❌ Error: {e}")
        print("💡 Try closing other applications or restart your computer")
        exit(1)
    
    print("=" * 60)
    
    # List existing workbooks
    workbooks = wm.list_workbooks()
    if workbooks:
        print(f"📊 Found {len(workbooks)} existing workbooks:")
        for wb in workbooks[:5]:
            print(f"   📁 {wb['name']} ({wb.get('template', 'Unknown')})")
        if len(workbooks) > 5:
            print(f"   ... and {len(workbooks) - 5} more")
    else:
        print("📋 No existing workbooks found - ready for new creations!")
    
    print("=" * 60)
    print(f"🎯 Frontend should connect to: {config['backend_url']}")
    print("=" * 60)
    
    # Start Flask app on discovered port
    app.run(debug=True, port=port, host='localhost')