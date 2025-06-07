
from app import db
from datetime import datetime
import uuid

class Workbook(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(255), nullable=False)
    template = db.Column(db.String(100), nullable=False)
    category = db.Column(db.String(50), nullable=False)
    file_path = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    user_id = db.Column(db.String(100), nullable=True)  # For future user management
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'template': self.template,
            'category': self.category,
            'file_path': self.file_path,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'user_id': self.user_id
        }
    
    def __repr__(self):
        return f'<Workbook {self.name}>'
