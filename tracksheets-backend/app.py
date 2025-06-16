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


from flask_cors import CORS
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
    """Create a new self-contained workbook"""
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
            # Add initial data for the template
            initial_data = get_template_initial_data(template)
            if initial_data:
                result['initialData'] = initial_data
            
            return jsonify({
            'success': True,
            'workbook_id': result['workbook_id'],
            'name': name,
            'template': template,
            'created_at': result['created_at'],
            'initialData': initial_data,  # ← Frontend expects this
            'message': result['message']
        }), 201
        else:
            # Handle specific error types
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
                'full_row_data': row_data,               # ← Retrieved via hash lookup
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
    

@app.route('/api/workbook/<workbook_name>/columns', methods=['POST'])
def save_column_configuration(workbook_name):
    """Save column configuration as git object"""
    try:
        data = request.get_json()
        
        columns = data.get('columns', [])
        user_email = data.get('user_id', 'anonymous@user.com')
        action_type = data.get('action_type', 'column_config_update')
        
        # Verify workbook exists
        workbook = wm.get_workbook(workbook_name)
        if not workbook:
            return jsonify({'success': False, 'error': 'workbook_not_found'}), 404
        
        # Save column config as git object
        column_object_data = {
            'type': 'column_configuration',
            'columns': columns,
            'action_type': action_type,
            'timestamp': datetime.now().isoformat(),
            'user_email': user_email
        }
        
        git_hash = wm.save_object(workbook_name, column_object_data, 'columns')
        
        # Log the change in workbook database
        conn = wm.get_workbook_database(workbook_name)
        if conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO change_log (
                    user_email, change_type, row_index, column_index,
                    old_value, new_value, git_hash, timestamp
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                user_email, 
                action_type, 
                None,  # No specific row for column config
                None,  # No specific column
                None,
                f"{len(columns)} columns configured",
                git_hash, 
                datetime.now().isoformat()
            ))
            conn.commit()
            conn.close()
        
        return jsonify({
            'success': True,
            'message': f'Column configuration saved',
            'git_hash': git_hash,
            'columns_count': len(columns)
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/workbook/<workbook_name>/current-data', methods=['GET'])
def get_current_workbook_data(workbook_name):
    """Get the current state of all rows and columns from git objects"""
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
        column_names = []
        column_load_error = None
        
        # 🆕 NEW: Try to get latest column configuration from git objects
        try:
            cursor.execute("""
                SELECT git_hash, timestamp
                FROM change_log 
                WHERE git_hash IS NOT NULL 
                  AND change_type = 'column_config_update'
                ORDER BY timestamp DESC
                LIMIT 1
            """)
            
            latest_column_config = cursor.fetchone()
            
            if latest_column_config:
                column_git_hash = latest_column_config[0]
                print(f"🏗️ Loading column config from git hash: {column_git_hash}")
                
                try:
                    column_object = wm.get_object(workbook_name, column_git_hash)
                    if column_object and 'columns' in column_object:
                        # Extract column names from git object
                        columns_data = column_object['columns']
                        column_names = [col.get('name', f'Column {i}') for i, col in enumerate(columns_data)]
                        print(f"✅ Loaded {len(column_names)} columns from git: {column_names}")
                    else:
                        raise Exception(f"Invalid column object structure")
                        
                except Exception as git_error:
                    column_load_error = f"Git object error: {git_error}"
                    print(f"❌ Could not load column config from git: {git_error}")
            else:
                column_load_error = "No column configuration found in git"
                print(f"⚠️ No column config found in git")
                
        except Exception as db_error:
            column_load_error = f"Database query error: {db_error}"
            print(f"❌ Database error loading column config: {db_error}")
        
        # 🔧 Fallback 1: Try template columns
        if not column_names:
            try:
                print(f"🔄 Fallback: Trying template columns")
                template_data = get_template_initial_data(workbook.get('template', 'Blank'))
                if template_data and template_data.get('columns'):
                    column_names = template_data['columns']
                    print(f"✅ Using template columns: {column_names}")
                else:
                    raise Exception("No template columns available")
            except Exception as template_error:
                print(f"❌ Template fallback failed: {template_error}")
        
        # 🔧 Fallback 2: Always ensure we have SOME column structure
        if not column_names:
            print(f"🔄 Final fallback: Using generic column names")
            column_names = ['Column A', 'Column B', 'Column C', 'Column D', 'Column E']
        
        print(f"📋 Final columns ({len(column_names)}): {column_names}")
        
        # 📊 ALWAYS try to load row data regardless of column issues
        current_rows = []
        git_hashes = {}
        row_load_errors = []
        
        try:
            # Get latest row data
            cursor.execute("""
                SELECT row_index, git_hash, timestamp
                FROM change_log 
                WHERE git_hash IS NOT NULL 
                  AND row_index IS NOT NULL
                  AND change_type != 'column_config_update'
                ORDER BY row_index, timestamp DESC
            """)
            
            all_changes = cursor.fetchall()
            print(f"📊 Found {len(all_changes)} row change records")
            
            # Find latest per row
            latest_per_row = {}
            for change in all_changes:
                row_index, git_hash, timestamp = change
                if row_index not in latest_per_row:
                    latest_per_row[row_index] = {'git_hash': git_hash}
            
            print(f"📈 Found latest hashes for {len(latest_per_row)} rows")
            
            # Build rows using git objects
            if latest_per_row:
                max_row = max(latest_per_row.keys())
                
                for row_index in range(max_row + 1):
                    if row_index in latest_per_row:
                        git_hash = latest_per_row[row_index]['git_hash']
                        
                        try:
                            object_data = wm.get_object(workbook_name, git_hash)
                            
                            if object_data:
                                git_hashes[str(row_index)] = git_hash
                                
                                # Extract data (handle different storage formats)
                                row_array = []
                                
                                if 'data' in object_data and isinstance(object_data['data'], dict):
                                    # Data stored as dictionary
                                    for col_index, col_name in enumerate(column_names):
                                        field_name = col_name.lower().replace(' ', '_').replace('-', '_')
                                        value = object_data['data'].get(field_name, '')
                                        row_array.append(value)
                                    print(f"✅ Row {row_index} (dict): {len(row_array)} cells")
                                    
                                elif 'data' in object_data and isinstance(object_data['data'], list):
                                    # Data stored as array
                                    row_data = object_data['data']
                                    row_array = row_data[:]  # Copy the array
                                    print(f"✅ Row {row_index} (array): {len(row_array)} cells")
                                    
                                else:
                                    # Try to extract from top-level object
                                    for col_index, col_name in enumerate(column_names):
                                        field_name = col_name.lower().replace(' ', '_').replace('-', '_')
                                        value = object_data.get(field_name, '')
                                        row_array.append(value)
                                    print(f"✅ Row {row_index} (top-level): {len(row_array)} cells")
                                
                                # Ensure row has correct number of columns
                                while len(row_array) < len(column_names):
                                    row_array.append('')
                                
                                # Trim if too many columns
                                row_array = row_array[:len(column_names)]
                                
                                current_rows.append(row_array)
                                
                            else:
                                # Object not found - create empty row
                                current_rows.append([''] * len(column_names))
                                row_load_errors.append(f"Row {row_index}: Object not found for hash {git_hash}")
                                
                        except Exception as row_error:
                            print(f"❌ Error loading row {row_index}: {row_error}")
                            current_rows.append([''] * len(column_names))
                            row_load_errors.append(f"Row {row_index}: {str(row_error)}")
                    else:
                        # Empty row
                        current_rows.append([''] * len(column_names))
            
        except Exception as row_query_error:
            print(f"❌ Error querying row data: {row_query_error}")
            row_load_errors.append(f"Row query failed: {str(row_query_error)}")
        
        conn.close()
        
        # 🎯 ALWAYS return a response with whatever data we could load
        result = {
            'success': True,
            'current_data': {
                'columns': column_names,
                'rows': current_rows,
                'has_data': len(current_rows) > 0 and any(any(cell for cell in row) for row in current_rows)
            },
            'git_hashes': git_hashes,
            'warnings': {
                'column_load_error': column_load_error,
                'row_load_errors': row_load_errors,
                'columns_source': 'git' if not column_load_error else 'fallback'
            }
        }
        
        print(f"✅ Returning {len(current_rows)} rows, {len(column_names)} columns")
        if column_load_error:
            print(f"⚠️ Column load warning: {column_load_error}")
        if row_load_errors:
            print(f"⚠️ Row load warnings: {len(row_load_errors)}")
            
        return jsonify(result)
        
    except Exception as e:
        print(f"❌ Critical error in current-data endpoint: {e}")
        
        # 🚨 Even on critical error, try to return SOMETHING
        try:
            fallback_columns = ['Column A', 'Column B', 'Column C', 'Column D', 'Column E']
            return jsonify({
                'success': True,
                'current_data': {
                    'columns': fallback_columns,
                    'rows': [],
                    'has_data': False
                },
                'git_hashes': {},
                'critical_error': str(e),
                'warnings': {
                    'column_load_error': f"Critical failure: {str(e)}",
                    'row_load_errors': [f"Critical failure prevented data loading"],
                    'columns_source': 'emergency_fallback'
                }
            })
        except Exception as fallback_error:
            # Absolute last resort
            return jsonify({'success': False, 'error': str(e)}), 500
# ===============================
# DATA MANIPULATION ENDPOINTS
# ===============================

@app.route('/api/workbook/<workbook_name>/row-updated', methods=['POST'])
def handle_row_update(workbook_name):
    """Handle row updates with business logic"""
    try:
        data = request.get_json()
        
        row_index = data.get('row_index')
        row_data = data.get('row_data', {})
        action_type = data.get('action_type', 'update')
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
        

        # Store ONLY the hash reference in change_log (not full data)
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
                action_type, 
                row_index,
                git_hash,                              # ← Only store hash!
                datetime.now().isoformat(),
                user_email.split('@')[0]
            ))
            conn.commit()
            conn.close()
        
        # Run custom business logic
        business_actions = run_custom_validation_logic(workbook_name, row_index, row_data)
        
        # Save business actions to database
        if business_actions and conn:
            conn = wm.get_workbook_database(workbook_name)
            cursor = conn.cursor()
            
            for action in business_actions:
                cursor.execute("""
                    INSERT INTO business_actions (
                        row_index, action_type, trigger_condition, action_data, status
                    ) VALUES (?, ?, ?, ?, ?)
                """, (
                    row_index,
                    action.get('type'),
                    action.get('trigger', ''),
                    json.dumps(action.get('data', {})),
                    action.get('status', 'completed')
                ))
            
            conn.commit()
            conn.close()
        
        return jsonify({
            'success': True,
            'message': f'Row {row_index} processed successfully',
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

@app.route('/api/workbook/<workbook_name>/send-validation', methods=['POST'])
def send_validation_email(workbook_name):
    """Send validation email to customer"""
    try:
        data = request.get_json()
        
        row_index = data.get('row_index')
        customer_email = data.get('customer_email')
        customer_name = data.get('customer_name')
        changes_summary = data.get('changes_summary', 'Data has been updated')
        
        # Generate validation token
        validation_token = hashlib.sha256(
            f"{workbook_name}_{row_index}_{datetime.now().isoformat()}".encode()
        ).hexdigest()[:16]
        
        # Save validation request to database
        conn = wm.get_workbook_database(workbook_name)
        if conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO customer_validations (
                    row_index, customer_name, customer_email, validation_token,
                    changes_summary, sent_at
                ) VALUES (?, ?, ?, ?, ?, ?)
            """, (
                row_index, customer_name, customer_email, validation_token,
                changes_summary, datetime.now().isoformat()
            ))
            conn.commit()
            conn.close()
        
        # Send email (implement your email service here)
        email_result = send_validation_email_service(
            customer_email, customer_name, validation_token, changes_summary
        )
        
        return jsonify({
            'success': True,
            'message': f'Validation email sent to {customer_email}',
            'validation_token': validation_token,
            'email_sent': email_result
        })
    
    except Exception as e:
        app.logger.error(f"Error sending validation email: {e}")
        return jsonify({
            'success': False,
            'error': 'email_failed',
            'message': str(e)
        }), 500

# ===============================
# BUSINESS LOGIC FUNCTIONS
# ===============================

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
        
        # Example: Credit score integration (mock)
        if 'credit_score' not in data and name:
            mock_credit_score = get_mock_credit_score(name)
            business_actions.append({
                'type': 'credit_check',
                'credit_score': mock_credit_score,
                'message': f'Credit score retrieved: {mock_credit_score}',
                'status': 'completed' if mock_credit_score > 600 else 'review_required'
            })
        
        return business_actions
        
    except Exception as e:
        app.logger.error(f"Error in business logic: {e}")
        return []

def get_mock_credit_score(name):
    """Mock credit score function - replace with real integration"""
    # Generate consistent mock score based on name
    score_hash = hashlib.md5(name.encode()).hexdigest()
    return 500 + (int(score_hash[:3], 16) % 300)  # Score between 500-800

def send_validation_email_service(email, name, token, changes):
    """Send validation email - implement with your email service"""
    # Mock email service - replace with SendGrid, AWS SES, etc.
    print(f"📧 MOCK EMAIL SENT:")
    print(f"   To: {email}")
    print(f"   Subject: Please validate your data changes")
    print(f"   Token: {token}")
    print(f"   Changes: {changes}")
    
    # Return mock success
    return True

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

@app.route('/api/system/migrate', methods=['POST'])
def trigger_migration():
    """Trigger migration from old to new architecture"""
    try:
        from migration_script import TrackSheetsMigration
        
        # Run migration
        migration = TrackSheetsMigration()
        
        # This would run in background in production
        old_workbooks = migration.read_old_database()
        migrated_count = 0
        
        for workbook_data in old_workbooks:
            if migration.migrate_workbook(workbook_data):
                migrated_count += 1
        
        return jsonify({
            'success': True,
            'message': f'Migration completed: {migrated_count}/{len(old_workbooks)} workbooks migrated',
            'migrated_count': migrated_count,
            'total_workbooks': len(old_workbooks)
        })
    
    except Exception as e:
        app.logger.error(f"Migration failed: {e}")
        return jsonify({
            'success': False,
            'error': 'migration_failed',
            'message': str(e)
        }), 500

# ===============================
# MAIN APPLICATION
# ===============================

if __name__ == '__main__':
    print("🚀 Starting TrackSheets Backend - Self-Contained Architecture")
    print(f"📁 Projects directory: {wm.projects_dir}")
    print(f"🗄️  Using per-workbook databases")
    print(f"🔗 Available at: http://localhost:5000")
    print("=" * 60)
    
    # List existing workbooks
    workbooks = wm.list_workbooks()
    if workbooks:
        print(f"📊 Found {len(workbooks)} existing workbooks:")
        for wb in workbooks[:5]:  # Show first 5
            print(f"   📁 {wb['name']} ({wb.get('template', 'Unknown')})")
        if len(workbooks) > 5:
            print(f"   ... and {len(workbooks) - 5} more")
    else:
        print("📋 No existing workbooks found - ready for new creations!")
    
    print("=" * 60)
    
    app.run(debug=True, port=5001)
