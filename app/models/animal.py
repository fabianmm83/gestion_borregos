from app import db
from datetime import datetime

class Animal(db.Model):
    __tablename__ = 'animals'
    
    id = db.Column(db.Integer, primary_key=True)
    ear_tag = db.Column(db.String(20), unique=True, nullable=False)
    name = db.Column(db.String(100))
    breed = db.Column(db.String(50))
    birth_date = db.Column(db.Date)
    gender = db.Column(db.String(10))
    weight = db.Column(db.Float)
    status = db.Column(db.String(20), default='active')
    purchase_date = db.Column(db.Date)
    purchase_price = db.Column(db.Float)
    sale_date = db.Column(db.Date)
    sale_price = db.Column(db.Float)
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)