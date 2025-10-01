class SalesManager {
    constructor(app) {
        this.app = app;
        this.localSales = this.getLocalSales(); // Datos locales como respaldo
        this.init();
    }

    init() {
        console.log('💰 SalesManager inicializado');
        this.setupEventListeners();
    }

    setupEventListeners() {
        const saleForm = document.getElementById('sale-form');
        if (saleForm) {
            saleForm.addEventListener('submit', (e) => this.handleSaleSubmit(e));
        }

        // Filtro de búsqueda
        const searchInput = document.getElementById('animal-search');
        if (searchInput) {
            searchInput.addEventListener('input', () => this.filterSales());
        }
    }

    async loadSales() {
        try {
            this.app.showLoading(true);
            
            console.log('🔄 Cargando ventas...');
            let sales = [];
            
            // INTENTAR PRIMERO DESDE LOCALSTORAGE
            const localData = this.getLocalSales();
            if (localData.length > 0) {
                console.log('📊 Usando datos locales de ventas');
                sales = localData;
                this.renderSales(sales);
                this.updateStats(sales);
            }
            
            // LUEGO INTENTAR DESDE LA API (EN SEGUNDO PLANO)
            try {
                const apiSales = await this.app.apiCall('/sales');
                console.log('✅ Ventas cargadas desde API:', apiSales.length);
                
                if (apiSales && apiSales.length > 0) {
                    sales = apiSales;
                    // Guardar en localStorage como respaldo
                    this.saveLocalSales(sales);
                }
            } catch (apiError) {
                console.warn('⚠️ Error al cargar desde API, continuando con datos locales:', apiError.message);
                // No mostramos alerta para no molestar al usuario
            }
            
            this.renderSales(sales);
            this.updateStats(sales);
            
        } catch (error) {
            console.error('Error loading sales:', error);
            // Usar datos locales como último recurso
            const localData = this.getLocalSales();
            this.renderSales(localData);
            this.updateStats(localData);
        } finally {
            this.app.showLoading(false);
        }
    }

    // Manejar datos locales en localStorage
    getLocalSales() {
        try {
            const saved = localStorage.getItem('borregos_sales');
            return saved ? JSON.parse(saved) : this.getDemoSales();
        } catch (error) {
            console.error('Error loading local sales:', error);
            return this.getDemoSales();
        }
    }

    saveLocalSales(sales) {
        try {
            localStorage.setItem('borregos_sales', JSON.stringify(sales));
        } catch (error) {
            console.error('Error saving local sales:', error);
        }
    }

    // DATOS DEMO PARA PRUEBAS
    getDemoSales() {
        return [
            {
                id: 1,
                animalEarTag: "A001",
                animalName: "Borrego Blanco",
                salePrice: 2500.00,
                weightAtSale: 48.5,
                buyerName: "Juan Pérez",
                buyerContact: "555-1234",
                saleDate: "2024-01-10",
                notes: "Venta directa en granja",
                createdAt: new Date().toISOString()
            },
            {
                id: 2,
                animalEarTag: "A002",
                animalName: "Borrego Negro",
                salePrice: 2300.00,
                weightAtSale: 45.0,
                buyerName: "María García",
                buyerContact: "555-5678",
                saleDate: "2024-01-08",
                notes: "Venta por contrato",
                createdAt: new Date().toISOString()
            },
            {
                id: 3,
                animalEarTag: "A005",
                animalName: "Borrego Grande",
                salePrice: 2700.00,
                weightAtSale: 52.0,
                buyerName: "Carlos López",
                buyerContact: "555-9012",
                saleDate: "2024-01-12",
                notes: "Excelente condición",
                createdAt: new Date().toISOString()
            }
        ];
    }

    renderSales(sales) {
        const container = document.getElementById('sales-list');
        if (!container) {
            console.error('❌ No se encontró el contenedor sales-list');
            return;
        }

        if (!sales || sales.length === 0) {
            container.innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle me-2"></i>
                    No hay ventas registradas.
                    <button class="btn btn-primary btn-sm ms-2" onclick="salesManager.showSaleForm()">
                        <i class="fas fa-plus me-1"></i>Registrar Primera Venta
                    </button>
                </div>
            `;
            return;
        }

        // Ordenar por fecha más reciente primero
        const sortedSales = [...sales].sort((a, b) => new Date(b.saleDate) - new Date(a.saleDate));

        container.innerHTML = sortedSales.map(sale => `
            <div class="card mb-3">
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-8">
                            <h5 class="card-title text-success">
                                <i class="fas fa-dollar-sign me-2"></i>Venta - ${this.escapeHtml(sale.animalEarTag)}
                            </h5>
                            <p class="card-text mb-1">
                                <strong>Animal:</strong> ${this.escapeHtml(sale.animalName || 'N/A')} 
                                (Arete: ${this.escapeHtml(sale.animalEarTag)})
                            </p>
                            <p class="card-text mb-1">
                                <strong>Precio:</strong> 
                                <span class="text-success fw-bold">$${parseFloat(sale.salePrice || 0).toLocaleString()}</span>
                            </p>
                            <p class="card-text mb-1">
                                <strong>Peso al vender:</strong> ${sale.weightAtSale || 'N/A'} ${sale.weightAtSale ? 'kg' : ''}
                            </p>
                            <p class="card-text mb-1">
                                <strong>Comprador:</strong> ${this.escapeHtml(sale.buyerName || 'N/A')}
                            </p>
                            <p class="card-text mb-1">
                                <strong>Contacto:</strong> ${this.escapeHtml(sale.buyerContact || 'N/A')}
                            </p>
                            <p class="card-text mb-1">
                                <strong>Fecha:</strong> ${sale.saleDate ? new Date(sale.saleDate).toLocaleDateString() : 'N/A'}
                            </p>
                            ${sale.notes ? `
                                <p class="card-text">
                                    <strong>Notas:</strong> ${sale.notes}
                                </p>
                            ` : ''}
                        </div>
                        <div class="col-md-4 text-end">
                            <span class="badge bg-success">Completada</span>
                            <div class="mt-2">
                                <small class="text-muted d-block">
                                    ${sale.createdAt ? new Date(sale.createdAt).toLocaleDateString() : ''}
                                </small>
                                <button class="btn btn-sm btn-outline-danger delete-sale-btn mt-1" data-id="${sale.id}">
                                    <i class="fas fa-trash"></i> Eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        // Agregar event listeners a los botones
        this.attachSalesEventListeners();
    }

    attachSalesEventListeners() {
        document.querySelectorAll('.delete-sale-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const saleId = e.target.closest('button').dataset.id;
                this.deleteSale(saleId);
            });
        });
    }

    updateStats(sales) {
        const totalTransactions = document.getElementById('total-transactions');
        const totalIncome = document.getElementById('total-income');

        if (totalTransactions) {
            totalTransactions.textContent = sales.length;
        }

        if (totalIncome) {
            const total = sales.reduce((sum, sale) => sum + parseFloat(sale.salePrice || 0), 0);
            totalIncome.textContent = `$${total.toLocaleString()}`;
        }
    }

    async handleSaleSubmit(e) {
        e.preventDefault();
        const form = e.target;
        
        try {
            this.app.showLoading(true);
            const formData = new FormData(form);
            const data = Object.fromEntries(formData);

            // Validaciones
            if (!data.animalEarTag || !data.salePrice) {
                this.app.showAlert('Número de arete y precio de venta son obligatorios', 'warning');
                return;
            }

            if (parseFloat(data.salePrice) <= 0) {
                this.app.showAlert('El precio de venta debe ser mayor a 0', 'warning');
                return;
            }

            // Crear objeto de venta
            const newSale = {
                id: Date.now(), // ID temporal
                animalEarTag: data.animalEarTag,
                animalName: data.animalName || `Borrego ${data.animalEarTag}`,
                salePrice: parseFloat(data.salePrice),
                weightAtSale: data.weightAtSale ? parseFloat(data.weightAtSale) : null,
                buyerName: data.buyerName || '',
                buyerContact: data.buyerContact || '',
                saleDate: data.saleDate || new Date().toISOString().split('T')[0],
                notes: data.notes || '',
                createdAt: new Date().toISOString()
            };

            // INTENTAR GUARDAR EN API
            let savedInAPI = false;
            try {
                await this.app.apiCall('/sales', {
                    method: 'POST',
                    body: newSale
                });
                savedInAPI = true;
                console.log('✅ Venta guardada en API');
            } catch (apiError) {
                console.warn('⚠️ Error al guardar en API, guardando localmente:', apiError.message);
                savedInAPI = false;
            }

            // GUARDAR LOCALMENTE SIEMPRE
            const currentSales = this.getLocalSales();
            currentSales.push(newSale);
            this.saveLocalSales(currentSales);

            if (savedInAPI) {
                this.app.showAlert('Venta registrada exitosamente', 'success');
            } else {
                this.app.showAlert('Venta guardada localmente (servidor no disponible)', 'warning');
            }
            
            // Cerrar modal y recargar
            const modal = bootstrap.Modal.getInstance(document.getElementById('sale-form-modal'));
            modal.hide();
            form.reset();
            await this.loadSales();

        } catch (error) {
            console.error('Error saving sale:', error);
            this.app.showAlert('Error al registrar la venta', 'danger');
        } finally {
            this.app.showLoading(false);
        }
    }

    async deleteSale(saleId) {
        if (!confirm('¿Estás seguro de que quieres eliminar esta venta? Esta acción no se puede deshacer.')) {
            return;
        }

        try {
            this.app.showLoading(true);
            
            // INTENTAR ELIMINAR EN API
            try {
                await this.app.apiCall(`/sales/${saleId}`, {
                    method: 'DELETE'
                });
                console.log('✅ Venta eliminada de API');
            } catch (apiError) {
                console.warn('⚠️ Error al eliminar en API, eliminando localmente:', apiError.message);
            }
            
            // ELIMINAR LOCALMENTE SIEMPRE
            const currentSales = this.getLocalSales();
            const updatedSales = currentSales.filter(sale => sale.id != saleId);
            this.saveLocalSales(updatedSales);
            
            this.app.showAlert('Venta eliminada exitosamente', 'success');
            await this.loadSales();

        } catch (error) {
            console.error('Error deleting sale:', error);
            this.app.showAlert('Error al eliminar la venta', 'danger');
        } finally {
            this.app.showLoading(false);
        }
    }

    filterSales() {
        const searchTerm = document.getElementById('animal-search').value.toLowerCase();
        
        const cards = document.querySelectorAll('#sales-list .card');
        let visibleCount = 0;
        
        cards.forEach(card => {
            const text = card.textContent.toLowerCase();
            const matchesSearch = text.includes(searchTerm);
            card.style.display = matchesSearch ? 'block' : 'none';
            if (matchesSearch) visibleCount++;
        });

        // Mostrar mensaje si no hay resultados
        if (visibleCount === 0 && searchTerm) {
            const container = document.getElementById('sales-list');
            const noResults = document.createElement('div');
            noResults.className = 'alert alert-warning mt-3';
            noResults.innerHTML = `
                <i class="fas fa-search me-2"></i>
                No se encontraron ventas que coincidan con "${searchTerm}"
            `;
            container.appendChild(noResults);
        }
    }

    showSaleForm() {
        const form = document.getElementById('sale-form');
        form.reset();
        
        // Establecer fecha actual por defecto
        const today = new Date().toISOString().split('T')[0];
        const dateInput = form.querySelector('#sale-saleDate');
        if (dateInput && !dateInput.value) {
            dateInput.value = today;
        }
        
        const modal = new bootstrap.Modal(document.getElementById('sale-form-modal'));
        modal.show();
    }

    escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe.toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    if (window.app) {
        window.salesManager = new SalesManager(window.app);
    }
});