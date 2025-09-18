from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager

# Inicializar extensiones
db = SQLAlchemy()
login_manager = LoginManager()

def create_app():
    app = Flask(__name__)
    
    # Configuración básica
    app.config['SECRET_KEY'] = 'clave-secreta-borregos-muy-segura'
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///gestion_borregos.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # Inicializar extensiones con la app
    db.init_app(app)
    login_manager.init_app(app)
    login_manager.login_view = 'main.login'
    
    # Configurar user_loader
    from app.models.user import User
    
    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))
    
    # Importar y registrar blueprints
    from app.routes.main import main_bp
    from app.routes.animals import animals_bp
    from app.routes.sales import sales_bp
    from app.routes.feeds import feeds_bp
    from app.routes.inventory import inventory_bp
    
    app.register_blueprint(main_bp)
    app.register_blueprint(animals_bp)
    app.register_blueprint(sales_bp)
    app.register_blueprint(feeds_bp)
    app.register_blueprint(inventory_bp)
    
    # Importar modelos ANTES de crear las tablas
    from app.models.animal import Animal
    from app.models.feed import Feed
    from app.models.inventory import Inventory
    from app.models.sale import Sale
    from app.models.user import User
    
    # Crear tablas de la base de datos
    with app.app_context():
        db.create_all()
        print("Tablas de la base de datos creadas correctamente")
    
    return app