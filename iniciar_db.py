from app import create_app, db
from app.models.animal import Animal
from app.models.feed import Feed
from app.models.inventory import Inventory
from app.models.sale import Sale
from app.models.user import User

app = create_app()

with app.app_context():
    # Crear todas las tablas
    db.create_all()
    print("Base de datos inicializada correctamente")
    
    # Agregar usuario administrador por defecto
    if not User.query.filter_by(username='admin').first():
        admin_user = User(username='admin', email='admin@borregos.com')
        admin_user.set_password('admin123')
        db.session.add(admin_user)
        print("Usuario administrador creado: admin / admin123")
    
    # Agregar datos de ejemplo
    try:
        # Crear un animal de ejemplo
        animal = Animal(
            ear_tag="B001",
            name="Ovejita",
            breed="Merino",
            gender="Hembra",
            status="active"
        )
        db.session.add(animal)
        
        # Crear un alimento de ejemplo
        feed = Feed(
            name="Alfalfa",
            quantity=100,
            unit="kg",
            description="Alfalfa de alta calidad"
        )
        db.session.add(feed)
        
        # Crear un item de inventario de ejemplo
        inventory = Inventory(
            item_type="medicine",
            name="Antibiótico",
            quantity=50,
            unit="ml",
            min_stock=10,
            description="Antibiótico para borregos"
        )
        db.session.add(inventory)
        
        db.session.commit()
        print("Datos de ejemplo agregados correctamente")
        
    except Exception as e:
        db.session.rollback()
        print(f"Error al agregar datos de ejemplo: {e}")