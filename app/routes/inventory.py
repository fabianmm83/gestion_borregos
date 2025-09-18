from . import inventory_bp
from flask import render_template, request, flash, redirect, url_for
from flask_login import login_required
from datetime import datetime

@inventory_bp.route('/')
@login_required
def list_inventory():
    from app.models.inventory import Inventory
    
    item_type = request.args.get('type', 'all')
    
    query = Inventory.query
    
    if item_type != 'all':
        query = query.filter_by(item_type=item_type)
    
    inventory = query.order_by(Inventory.created_at.desc()).all()
    
    # Obtener estadísticas de stock bajo
    low_stock_items = Inventory.query.filter(Inventory.quantity <= Inventory.min_stock).count()
    
    return render_template('inventory/list.html', 
                         inventory=inventory, 
                         item_type=item_type,
                         low_stock_items=low_stock_items)

@inventory_bp.route('/add', methods=['GET', 'POST'])
@login_required
def add_item():
    if request.method == 'POST':
        try:
            from app.models.inventory import Inventory
            from app import db
            
            item_type = request.form.get('item_type')
            name = request.form.get('name')
            description = request.form.get('description')
            quantity = int(request.form.get('quantity'))
            unit = request.form.get('unit')
            min_stock = int(request.form.get('min_stock'))
            cost = float(request.form.get('cost')) if request.form.get('cost') else None
            
            purchase_date_str = request.form.get('purchase_date')
            purchase_date = datetime.strptime(purchase_date_str, '%Y-%m-%d').date() if purchase_date_str else None
            
            expiration_date_str = request.form.get('expiration_date')
            expiration_date = datetime.strptime(expiration_date_str, '%Y-%m-%d').date() if expiration_date_str else None
            
            supplier = request.form.get('supplier')
            
            item = Inventory(
                item_type=item_type,
                name=name,
                description=description,
                quantity=quantity,
                unit=unit,
                min_stock=min_stock,
                cost=cost,
                purchase_date=purchase_date,
                expiration_date=expiration_date,
                supplier=supplier
            )
            
            db.session.add(item)
            db.session.commit()
            
            flash('Ítem agregado al inventario correctamente', 'success')
            return redirect(url_for('inventory.list_inventory'))
            
        except Exception as e:
            from app import db
            db.session.rollback()
            flash(f'Error al agregar ítem: {str(e)}', 'danger')
    
    return render_template('inventory/add.html')

@inventory_bp.route('/<int:id>/edit', methods=['GET', 'POST'])
@login_required
def edit_item(id):
    from app.models.inventory import Inventory
    
    item = Inventory.query.get_or_404(id)
    
    if request.method == 'POST':
        try:
            from app import db
            
            item.item_type = request.form.get('item_type')
            item.name = request.form.get('name')
            item.description = request.form.get('description')
            item.quantity = int(request.form.get('quantity'))
            item.unit = request.form.get('unit')
            item.min_stock = int(request.form.get('min_stock'))
            item.cost = float(request.form.get('cost')) if request.form.get('cost') else None
            
            purchase_date_str = request.form.get('purchase_date')
            item.purchase_date = datetime.strptime(purchase_date_str, '%Y-%m-%d').date() if purchase_date_str else None
            
            expiration_date_str = request.form.get('expiration_date')
            item.expiration_date = datetime.strptime(expiration_date_str, '%Y-%m-%d').date() if expiration_date_str else None
            
            item.supplier = request.form.get('supplier')
            
            db.session.commit()
            flash('Ítem actualizado correctamente', 'success')
            return redirect(url_for('inventory.list_inventory'))
            
        except Exception as e:
            from app import db
            db.session.rollback()
            flash(f'Error al actualizar ítem: {str(e)}', 'danger')
    
    return render_template('inventory/edit.html', item=item)

@inventory_bp.route('/<int:id>/delete', methods=['POST'])
@login_required
def delete_item(id):
    from app.models.inventory import Inventory
    from app import db
    
    item = Inventory.query.get_or_404(id)
    
    try:
        db.session.delete(item)
        db.session.commit()
        flash('Ítem eliminado correctamente', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'Error al eliminar ítem: {str(e)}', 'danger')
    
    return redirect(url_for('inventory.list_inventory'))

@inventory_bp.route('/low-stock')
@login_required
def low_stock():
    from app.models.inventory import Inventory
    
    low_stock_items = Inventory.query.filter(Inventory.quantity <= Inventory.min_stock).all()
    
    return render_template('inventory/low_stock.html', low_stock_items=low_stock_items)

@inventory_bp.route('/<int:id>/adjust', methods=['POST'])
@login_required
def adjust_stock(id):
    from app.models.inventory import Inventory
    from app import db
    
    item = Inventory.query.get_or_404(id)
    adjustment = int(request.form.get('adjustment'))
    notes = request.form.get('notes', '')
    
    try:
        # Ajustar el stock
        item.quantity += adjustment
        
        db.session.commit()
        
        if adjustment > 0:
            flash(f'Se agregaron {adjustment} unidades al stock', 'success')
        else:
            flash(f'Se retiraron {abs(adjustment)} unidades del stock', 'success')
            
    except Exception as e:
        db.session.rollback()
        flash(f'Error al ajustar stock: {str(e)}', 'danger')
    
    return redirect(url_for('inventory.list_inventory'))