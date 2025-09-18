from . import feeds_bp
from flask import render_template, request, flash, redirect, url_for
from flask_login import login_required
from datetime import datetime

@feeds_bp.route('/')
@login_required
def list_feeds():
    from app.models.feed import Feed
    
    feeds = Feed.query.order_by(Feed.created_at.desc()).all()
    return render_template('feeds/list.html', feeds=feeds)

@feeds_bp.route('/create', methods=['GET', 'POST'])
@login_required
def create_feed():
    if request.method == 'POST':
        try:
            from app.models.feed import Feed
            from app import db
            
            name = request.form.get('name')
            description = request.form.get('description')
            quantity = float(request.form.get('quantity'))
            unit = request.form.get('unit')
            purchase_date_str = request.form.get('purchase_date')
            expiration_date_str = request.form.get('expiration_date')
            cost = float(request.form.get('cost')) if request.form.get('cost') else None
            supplier = request.form.get('supplier')
            
            purchase_date = datetime.strptime(purchase_date_str, '%Y-%m-%d').date() if purchase_date_str else None
            expiration_date = datetime.strptime(expiration_date_str, '%Y-%m-%d').date() if expiration_date_str else None
            
            feed = Feed(
                name=name,
                description=description,
                quantity=quantity,
                unit=unit,
                purchase_date=purchase_date,
                expiration_date=expiration_date,
                cost=cost,
                supplier=supplier
            )
            
            db.session.add(feed)
            db.session.commit()
            
            flash('Alimento agregado correctamente', 'success')
            return redirect(url_for('feeds.list_feeds'))
            
        except Exception as e:
            from app import db
            db.session.rollback()
            flash(f'Error al agregar alimento: {str(e)}', 'danger')
    
    return render_template('feeds/create.html')

@feeds_bp.route('/<int:id>/edit', methods=['GET', 'POST'])
@login_required
def edit_feed(id):
    from app.models.feed import Feed
    
    feed = Feed.query.get_or_404(id)
    
    if request.method == 'POST':
        try:
            from app import db
            
            feed.name = request.form.get('name')
            feed.description = request.form.get('description')
            feed.quantity = float(request.form.get('quantity'))
            feed.unit = request.form.get('unit')
            
            purchase_date_str = request.form.get('purchase_date')
            feed.purchase_date = datetime.strptime(purchase_date_str, '%Y-%m-%d').date() if purchase_date_str else None
            
            expiration_date_str = request.form.get('expiration_date')
            feed.expiration_date = datetime.strptime(expiration_date_str, '%Y-%m-%d').date() if expiration_date_str else None
            
            feed.cost = float(request.form.get('cost')) if request.form.get('cost') else None
            feed.supplier = request.form.get('supplier')
            
            db.session.commit()
            flash('Alimento actualizado correctamente', 'success')
            return redirect(url_for('feeds.list_feeds'))
            
        except Exception as e:
            from app import db
            db.session.rollback()
            flash(f'Error al actualizar alimento: {str(e)}', 'danger')
    
    return render_template('feeds/edit.html', feed=feed)

@feeds_bp.route('/<int:id>/delete', methods=['POST'])
@login_required
def delete_feed(id):
    from app.models.feed import Feed
    from app import db
    
    feed = Feed.query.get_or_404(id)
    
    try:
        db.session.delete(feed)
        db.session.commit()
        flash('Alimento eliminado correctamente', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'Error al eliminar alimento: {str(e)}', 'danger')
    
    return redirect(url_for('feeds.list_feeds'))