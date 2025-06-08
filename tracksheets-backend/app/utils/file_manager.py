
import os
import json
import uuid
from pathlib import Path
from datetime import datetime
from flask import current_app

class FileManager:
    
    @staticmethod
    def create_workbook_folder(workbook_id, workbook_name):
        """Create a folder structure for a new workbook"""
        try:
            workbooks_dir = current_app.config['WORKBOOKS_DIR']
            
            # Sanitize workbook name for filesystem
            safe_name = FileManager.sanitize_filename(workbook_name)
            workbook_folder = f"{workbook_id}_{safe_name}"
            workbook_path = os.path.join(workbooks_dir, workbook_folder)
            
            # Create main workbook directory
            os.makedirs(workbook_path, exist_ok=True)
            
            # Create subdirectories
            subdirs = ['data', 'exports', 'history', 'temp']
            for subdir in subdirs:
                os.makedirs(os.path.join(workbook_path, subdir), exist_ok=True)
            
            # Create metadata file
            metadata = {
                'workbook_id': workbook_id,
                'name': workbook_name,
                'created_at': datetime.utcnow().isoformat(),
                'version': '1.0',
                'structure': {
                    'data': 'Spreadsheet data and configurations',
                    'exports': 'Exported files (CSV, Excel, PDF)',
                    'history': 'Version history and audit trail',
                    'temp': 'Temporary files'
                }
            }
            
            metadata_path = os.path.join(workbook_path, 'metadata.json')
            with open(metadata_path, 'w') as f:
                json.dump(metadata, f, indent=2)
            
            return workbook_path
            
        except Exception as e:
            current_app.logger.error(f"Error creating workbook folder: {str(e)}")
            raise e
    
    @staticmethod
    def sanitize_filename(filename):
        """Sanitize filename for filesystem compatibility"""
        # Remove or replace invalid characters
        invalid_chars = '<>:"/\\|?*'
        for char in invalid_chars:
            filename = filename.replace(char, '_')
        
        # Limit length and remove extra spaces
        filename = filename.strip()[:100]
        return filename
    
    @staticmethod
    def get_template_data(template_name):
        """Get initial data structure for different templates"""
        templates = {
            'Blank workbook': {
                'columns': ['Column A', 'Column B', 'Column C'],
                'rows': [],
                'type': 'general'
            },
            'Personal Monthly Budget': {
                'columns': ['Category', 'Budgeted Amount', 'Actual Amount', 'Difference'],
                'rows': [
                    ['Income', '', '', ''],
                    ['Housing', '', '', ''],
                    ['Transportation', '', '', ''],
                    ['Food', '', '', ''],
                    ['Utilities', '', '', ''],
                    ['Entertainment', '', '', '']
                ],
                'type': 'budget'
            },
            'Sales Report': {
                'columns': ['Date', 'Product', 'Quantity', 'Unit Price', 'Total'],
                'rows': [],
                'type': 'sales'
            },
            'Customer Database': {
                'columns': ['Name', 'Email', 'Phone', 'Company', 'Status'],
                'rows': [],
                'type': 'database'
            },
            'Project Timeline': {
                'columns': ['Task', 'Start Date', 'End Date', 'Status', 'Assigned To'],
                'rows': [],
                'type': 'project'
            },
            'Expense Tracker': {
                'columns': ['Date', 'Description', 'Category', 'Amount', 'Payment Method'],
                'rows': [],
                'type': 'expense'
            },
            'Inventory List': {
                'columns': ['Item', 'SKU', 'Quantity', 'Unit Price', 'Total Value'],
                'rows': [],
                'type': 'inventory'
            },
            'Task Planner': {
                'columns': ['Task', 'Priority', 'Due Date', 'Status', 'Notes'],
                'rows': [],
                'type': 'tasks'
            }
        }
        
        return templates.get(template_name, templates['Blank workbook'])
    
    @staticmethod
    def create_workbook_data_file(workbook_path, template_name):
        """Create initial data file for the workbook"""
        try:
            template_data = FileManager.get_template_data(template_name)
            
            # Create data.json file
            data_file_path = os.path.join(workbook_path, 'data', 'data.json')
            
            workbook_data = {
                'metadata': {
                    'template': template_name,
                    'created_at': datetime.utcnow().isoformat(),
                    'last_modified': datetime.utcnow().isoformat(),
                    'version': 1
                },
                'spreadsheet': {
                    'columns': template_data['columns'],
                    'rows': template_data['rows'],
                    'type': template_data['type']
                },
                'settings': {
                    'auto_save': True,
                    'show_grid': True,
                    'theme': 'default'
                }
            }
            
            with open(data_file_path, 'w') as f:
                json.dump(workbook_data, f, indent=2)
            
            return data_file_path
            
        except Exception as e:
            current_app.logger.error(f"Error creating workbook data file: {str(e)}")
            raise e
    
    @staticmethod
    def get_workbook_data(workbook_path):
        """Load workbook data from file"""
        try:
            data_file_path = os.path.join(workbook_path, 'data', 'data.json')
            
            if os.path.exists(data_file_path):
                with open(data_file_path, 'r') as f:
                    return json.load(f)
            else:
                return None
                
        except Exception as e:
            current_app.logger.error(f"Error loading workbook data: {str(e)}")
            return None