from flask import Blueprint

main_bp = Blueprint('main', __name__)
animals_bp = Blueprint('animals', __name__, url_prefix='/animals')
feeds_bp = Blueprint('feeds', __name__, url_prefix='/feeds')
inventory_bp = Blueprint('inventory', __name__, url_prefix='/inventory')
sales_bp = Blueprint('sales', __name__, url_prefix='/sales')

# Importar las rutas aquí para que se registren
from . import main, animals, feeds, inventory, sales