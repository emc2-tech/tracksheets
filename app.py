from flask import Flask, jsonify, request
from flask_cors import CORS
import uuid
from datetime import datetime
import os
import json

app = Flask(__name__)
CORS(app, origins=['http://localhost:5173', 'http://127.0.0.1:5173'])

workbooks = []

@app.route('/')
def home():
    return "TrackSheets Backend is running! 🚀"

@app.route('/api/health')
def health():
    return jsonify({
        "status": "healthy",
        "message": "TrackSheets backend is running",
        "version": "1.0.0"
    })

@app.route('/api/templates')
def templates():
    templates_list = [
        {"name": "Blank workbook", "category": "General", "description": "Start with a clean slate"},
        {"name": "Personal Monthly Budget", "category": "Budget", "description": "Track expenses and income"},
        {"name": "Sales Report", "category": "Business", "description": "Analyze sales performance"},
        {"name": "Customer Database", "category": "Business", "description": "Manage customer data"},
        {"name": "Project Timeline", "category": "Project", "description": "Plan project milestones"},
        {"name": "Expense Tracker", "category": "Budget", "description": "Monitor spending by category"},
        {"name": "Inventory List", "category": "Business", "description": "Track products and stock"},
        {"name": "Task Planner", "category": "Planning", "description": "Organize tasks and deadlines"}
    ]
    return jsonify({"success": True, "templates": templates_list})

@app.route('/api/workbook/create', methods=['POST'])
def create_workbook():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        name = data.get('name')
        template = data.get('template')
        category = data.get('category')
        
        if not all([name, template, category]):
            return jsonify({'error': 'Missing required fields'}), 400
        
        # Create workbook
        workbook_id = str(uuid.uuid4())
        workbook = {
            'id': workbook_id,
            'name': name,
            'template': template,
            'category': category,
            'created_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat()
        }
        
        workbooks.append(workbook)
        
        # Create workbook folder
        os.makedirs('workbooks', exist_ok=True)
        safe_name = name.replace(' ', '_').replace('/', '_')[:50]
        workbook_folder = f"{workbook_id}_{safe_name}"
        workbook_path = os.path.join('workbooks', workbook_folder)
        os.makedirs(workbook_path, exist_ok=True)
        
        # Create metadata file
        metadata = {
            'workbook_id': workbook_id,
            'name': name,
            'template': template,
            'category': category,
            'created_at': datetime.utcnow().isoformat()
        }
        
        with open(os.path.join(workbook_path, 'metadata.json'), 'w') as f:
            json.dump(metadata, f, indent=2)
        
        print(f"✅ Created workbook: {name} (ID: {workbook_id[:8]}...)")
        
        return jsonify({
            'success': True,
            'message': 'Workbook created successfully',
            'workbook': workbook
        }), 201
        
    except Exception as e:
        print(f"❌ Error creating workbook: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to create workbook',
            'details': str(e)
        }), 500

@app.route('/api/workbooks')
def get_workbooks():
    return jsonify({
        'success': True,
        'workbooks': workbooks,
        'count': len(workbooks)
    })

if __name__ == '__main__':
    print("🚀 TrackSheets Backend Starting...")
    print("📍 Running on: http://127.0.0.1:5000")
    print("🌐 CORS enabled for React frontend")
    print("📁 Workbooks will be saved to: ./workbooks/")
    
    app.run(host='127.0.0.1', port=5000, debug=True)
