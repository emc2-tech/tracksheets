
from flask import Blueprint, request, jsonify, current_app
from app import db
from app.models.workbook import Workbook
from app.utils.file_manager import FileManager
import logging

workbook_bp = Blueprint('workbook', __name__)

@workbook_bp.route('/workbook/create', methods=['POST'])
def create_workbook():
    """Create a new workbook"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Validate required fields
        name = data.get('name')
        template = data.get('template')
        category = data.get('category')
        
        if not all([name, template, category]):
            return jsonify({'error': 'Missing required fields: name, template, category'}), 400
        
        # Create workbook record in database
        workbook = Workbook(
            name=name,
            template=template,
            category=category,
            user_id=data.get('user_id', 'default_user')  # For future user management
        )
        
        db.session.add(workbook)
        db.session.commit()
        
        # Create workbook folder structure
        workbook_path = FileManager.create_workbook_folder(workbook.id, name)
        
        # Create initial data file based on template
        data_file_path = FileManager.create_workbook_data_file(workbook_path, template)
        
        # Update workbook record with file path
        workbook.file_path = workbook_path
        db.session.commit()
        
        current_app.logger.info(f"Created workbook: {name} (ID: {workbook.id})")
        
        return jsonify({
            'success': True,
            'message': 'Workbook created successfully',
            'workbook': workbook.to_dict(),
            'data_file': data_file_path
        }), 201
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error creating workbook: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to create workbook',
            'details': str(e)
        }), 500

@workbook_bp.route('/workbooks', methods=['GET'])
def get_workbooks():
    """Get all workbooks for a user"""
    try:
        user_id = request.args.get('user_id', 'default_user')
        workbooks = Workbook.query.filter_by(user_id=user_id).order_by(Workbook.updated_at.desc()).all()
        
        return jsonify({
            'success': True,
            'workbooks': [wb.to_dict() for wb in workbooks],
            'count': len(workbooks)
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error fetching workbooks: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to fetch workbooks'
        }), 500

@workbook_bp.route('/workbook/<workbook_id>', methods=['GET'])
def get_workbook(workbook_id):
    """Get specific workbook data"""
    try:
        workbook = Workbook.query.get(workbook_id)
        
        if not workbook:
            return jsonify({'error': 'Workbook not found'}), 404
        
        # Load workbook data from file
        workbook_data = FileManager.get_workbook_data(workbook.file_path)
        
        return jsonify({
            'success': True,
            'workbook': workbook.to_dict(),
            'data': workbook_data
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error fetching workbook {workbook_id}: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to fetch workbook'
        }), 500

@workbook_bp.route('/workbook/<workbook_id>', methods=['PUT'])
def update_workbook(workbook_id):
    """Update workbook data"""
    try:
        workbook = Workbook.query.get(workbook_id)
        
        if not workbook:
            return jsonify({'error': 'Workbook not found'}), 404
        
        data = request.get_json()
        
        # Update workbook metadata if provided
        if 'name' in data:
            workbook.name = data['name']
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Workbook updated successfully',
            'workbook': workbook.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error updating workbook {workbook_id}: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to update workbook'
        }), 500

@workbook_bp.route('/workbook/<workbook_id>', methods=['DELETE'])
def delete_workbook(workbook_id):
    """Delete a workbook"""
    try:
        workbook = Workbook.query.get(workbook_id)
        
        if not workbook:
            return jsonify({'error': 'Workbook not found'}), 404
        
        # TODO: Delete workbook folder and files
        # FileManager.delete_workbook_folder(workbook.file_path)
        
        db.session.delete(workbook)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Workbook deleted successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error deleting workbook {workbook_id}: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to delete workbook'
        }), 500

@workbook_bp.route('/templates', methods=['GET'])
def get_templates():
    """Get available templates"""
    templates = [
        {
            'name': 'Blank workbook',
            'category': 'General',
            'description': 'Start with a clean slate'
        },
        {
            'name': 'Personal Monthly Budget',
            'category': 'Budget',
            'description': 'Track your personal expenses and income'
        },
        {
            'name': 'Sales Report',
            'category': 'Business',
            'description': 'Analyze sales performance and trends'
        },
        {
            'name': 'Customer Database',
            'category': 'Business',
            'description': 'Manage customer information and data'
        },
        {
            'name': 'Project Timeline',
            'category': 'Project',
            'description': 'Plan and track project milestones'
        },
        {
            'name': 'Expense Tracker',
            'category': 'Budget',
            'description': 'Monitor spending by category'
        },
        {
            'name': 'Inventory List',
            'category': 'Business',
            'description': 'Track products and stock levels'
        },
        {
            'name': 'Task Planner',
            'category': 'Planning',
            'description': 'Organize tasks and deadlines'
        }
    ]
    
    return jsonify({
        'success': True,
        'templates': templates
    }), 200

@workbook_bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'message': 'TrackSheets backend is running',
        'version': '1.0.0'
    }), 200