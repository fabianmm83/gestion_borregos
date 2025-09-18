from . import sales_bp
from flask import render_template, request, flash, redirect, url_for
from flask_login import login_required
from datetime import datetime

@sales_bp.route('/')
@login_required
def list_sales():
    from app.models.sale import Sale
    from app import db
    
    year_filter = request.args.get('year', datetime.now().year, type=int)
    
    sales = Sale.query.filter(
        db.extract('year', Sale.sale_date) == year_filter
    ).order_by(Sale.sale_date.desc()).all()
    
    return render_template('sales/list.html', 
                         sales=sales, 
                         year_filter=year_filter)

@sales_bp.route('/register', methods=['GET', 'POST'])
@login_required
def register_sale():
    if request.method == 'POST':
        try:
            from app.models.sale import Sale
            from app.models.animal import Animal
            from app import db
            
            animal_id = request.form.get('animal_id')
            sale_date_str = request.form.get('sale_date')
            sale_price = request.form.get('sale_price')
            buyer_name = request.form.get('buyer_name')
            buyer_contact = request.form.get('buyer_contact')
            notes = request.form.get('notes')
            
            # Validar que el animal existe
            animal = Animal.query.get_or_404(animal_id)
            
            # Convertir fecha
            sale_date = datetime.strptime(sale_date_str, '%Y-%m-%d').date()
            
            # Crear nueva venta
            sale = Sale(
                animal_id=animal_id,
                sale_date=sale_date,
                sale_price=float(sale_price),
                buyer_name=buyer_name,
                buyer_contact=buyer_contact,
                notes=notes
            )
            
            # Actualizar estado del animal
            animal.status = 'sold'
            animal.sale_date = sale_date
            animal.sale_price = float(sale_price)
            
            db.session.add(sale)
            db.session.commit()
            
            flash('Venta registrada correctamente', 'success')
            return redirect(url_for('sales.list_sales'))
            
        except Exception as e:
            from app import db
            db.session.rollback()
            flash(f'Error al registrar venta: {str(e)}', 'danger')
    
    # Obtener animales disponibles para vender (solo activos)
    from app.models.animal import Animal
    available_animals = Animal.query.filter_by(status='active').all()
    return render_template('sales/register.html', animals=available_animals)

@sales_bp.route('/stats')
@login_required
def sales_stats():
    from app.models.sale import Sale
    from app import db
    
    year = request.args.get('year', datetime.now().year, type=int)
    
    # Estadísticas básicas
    total_sales = Sale.query.filter(
        db.extract('year', Sale.sale_date) == year
    ).count()
    
    total_revenue = db.session.query(
        db.func.sum(Sale.sale_price)
    ).filter(
        db.extract('year', Sale.sale_date) == year
    ).scalar() or 0
    
    return render_template('sales/stats.html',
                         total_sales=total_sales,
                         total_revenue=total_revenue,
                         year=year)