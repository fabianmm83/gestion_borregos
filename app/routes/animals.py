from . import animals_bp
from flask import render_template, request, flash, redirect, url_for
from flask_login import login_required
from datetime import datetime

@animals_bp.route('/')
@login_required
def list_animals():
    from app.models.animal import Animal
    
    animals = Animal.query.order_by(Animal.created_at.desc()).all()
    return render_template('animals/list.html', animals=animals)

@animals_bp.route('/add', methods=['GET', 'POST'])
@login_required
def add_animal():
    if request.method == 'POST':
        try:
            from app.models.animal import Animal
            from app import db
            
            ear_tag = request.form.get('ear_tag')
            name = request.form.get('name')
            breed = request.form.get('breed')
            birth_date_str = request.form.get('birth_date')
            gender = request.form.get('gender')
            weight = request.form.get('weight')
            
            # Convertir fecha
            birth_date = datetime.strptime(birth_date_str, '%Y-%m-%d').date() if birth_date_str else None
            
            # Crear nuevo animal
            animal = Animal(
                ear_tag=ear_tag,
                name=name,
                breed=breed,
                birth_date=birth_date,
                gender=gender,
                weight=float(weight) if weight else None,
                status='active'
            )
            
            db.session.add(animal)
            db.session.commit()
            
            flash('Animal agregado correctamente', 'success')
            return redirect(url_for('animals.list_animals'))
            
        except Exception as e:
            from app import db
            db.session.rollback()
            flash(f'Error al agregar animal: {str(e)}', 'danger')
    
    return render_template('animals/add.html')

@animals_bp.route('/<int:id>')
@login_required
def animal_detail(id):
    from app.models.animal import Animal
    animal = Animal.query.get_or_404(id)
    return render_template('animals/detail.html', animal=animal)