from . import main_bp
from flask import render_template, request, flash, redirect, url_for
from flask_login import login_user, logout_user, current_user, login_required
from app.models.user import User
from app import db

@main_bp.route('/')
@main_bp.route('/index')
@login_required
def index():
    from app.models.animal import Animal
    from app.models.inventory import Inventory
    
    # Obtener estadísticas básicas
    total_animals = Animal.query.count() or 0
    active_animals = Animal.query.filter_by(status='active').count() or 0
    low_stock_items = Inventory.query.filter(Inventory.quantity <= Inventory.min_stock).count() or 0
    
    return render_template('index.html', 
                         total_animals=total_animals,
                         active_animals=active_animals,
                         low_stock_items=low_stock_items)

@main_bp.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        user = User.query.filter_by(username=username).first()
        
        if user and user.check_password(password):
            login_user(user)
            flash('Inicio de sesión exitoso', 'success')
            next_page = request.args.get('next')
            return redirect(next_page or url_for('main.index'))
        else:
            flash('Usuario o contraseña incorrectos', 'danger')
    
    return render_template('login.html')

@main_bp.route('/logout')
@login_required
def logout():
    logout_user()
    flash('Sesión cerrada correctamente', 'success')
    return redirect(url_for('main.login'))

@main_bp.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')
        confirm_password = request.form.get('confirm_password')
        
        # Validar que las contraseñas coincidan
        if password != confirm_password:
            flash('Las contraseñas no coinciden', 'danger')
            return redirect(url_for('main.register'))
        
        # Verificar si el usuario ya existe
        if User.query.filter_by(username=username).first():
            flash('El usuario ya existe', 'danger')
            return redirect(url_for('main.register'))
        
        if User.query.filter_by(email=email).first():
            flash('El email ya está registrado', 'danger')
            return redirect(url_for('main.register'))
        
        # Crear nuevo usuario
        user = User(username=username, email=email)
        user.set_password(password)
        
        db.session.add(user)
        db.session.commit()
        
        flash('Usuario registrado correctamente. Ahora puedes iniciar sesión.', 'success')
        return redirect(url_for('main.login'))
    
    return render_template('register.html')

@main_bp.route('/profile')
@login_required
def profile():
    return render_template('profile.html', user=current_user)