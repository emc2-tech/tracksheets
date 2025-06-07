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
            workbooks_dir = 'workbooks'
            os.makedirs(workbooks_dir, exist_ok=True)
            
            # Sanitize workbook name for filesystem
            safe_name = FileManager.sanitize_filename(workbook_name)
            workbook_folder = f"{workbook_id}_{safe_name}"
            workbook_path = os.path.join(workbooks_dir, workbook_folder)
            
            # Create main workbook directory
            os.makedirs(workbook_path, exist_ok=True)
            
            # Create metadata file
            metadata = {
                'workbook_id': workbook_id,
                'name': workbook_name,
                'created_at': datetime.utcnow().isoformat(),
                'version': '1.0'
            }
            
            metadata_path = os.path.join(workbook_path, 'metadata.json')
            with open(metadata_path, 'w') as f:
                json.dump(metadata, f, indent=2)
            
            return workbook_path
            
        except Exception as e:
            print(f"Error creating workbook folder: {str(e)}")
            raise e
    
    @staticmethod
    def sanitize_filename(filename):
        """Sanitize filename for filesystem compatibility"""
        invalid_chars = '<>:"/\\|?*'
        for char in invalid_chars:
            filename = filename.replace(char, '_')
        filename = filename.strip()[:100]
        return filename
