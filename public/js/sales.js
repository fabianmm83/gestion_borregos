class SalesManager {
    constructor() {
        this.currentEditId = null;
        this.init();
    }

    init() {
        console.log('💰 SalesManager inicializado');
        this.setupEventListeners();
        document.addEventListener('salesViewLoaded', () => this.loadSales());
    }

    setupEventListeners() {
        // Formulario de venta
        const saleForm = document.getElementById('sale-form');
        if (saleForm) {
            saleForm.addEventListener('submit', (e) => this.handleSaleSubmit(e));
        }

        // Botones de acción
        document.addEventListener('click', (e) => {
            if (e.target.matches('.view-sale-btn')) {
                this.viewSale(e.target.dataset.id);
            }
            if (e.target.matches('.delete-sale-btn')) {
                this.deleteSale(e.target.dataset.id);
            }
        });

        // Filtros
        const filterForm = document.getElementById('filter-sales-form');
        if (filterForm) {
            filterForm.addEventListener('submit', (e) => this.filterSales(e));
        }

        // Botón limpiar filtros
        const clearFiltersBtn = document.getElementById('clear-sales-filters');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => this.clearFilters());
        }

        // Cargar animales cuando se muestre el modal
        document.getElementById('addSaleModal')?.addEventListener('show.bs.modal', () => {
            this.loadAnimalsSelect();
        });
    }

    async loadSales() {
        try {
            window.app.showLoading(true);
            const sales = await window.app.apiCall('/sales');
            this.renderSales(sales);
            this.updateStats(sales);
        } catch (error) {
            console.error('Error loading sales:', error);
            window.app.showAlert('Error al cargar las ventas', 'danger');
        } finally {
            window.app.showLoading(false);
        }
    }

    renderSales(sales) {
        const tbody = document.getElementById('sales-tbody');
        if (!tbody) return;

        if (sales.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center py-4">
                        <i class="fas fa-receipt fa-2x text-muted mb-2"></i>
                        <p class="text-muted">No hay ventas registradas</p>
                        <button class="btn btn-primary" onclick="window.app.showModal('addSaleModal')">
                            <i class="fas fa-plus me-1"></i>Registrar Venta
                        </button>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = sales.map(sale => `
            <tr>
                <td>
                    <div class="d-flex align-items-center">
                        <i class="fas fa-sheep text-success me-2"></i>
                        <div>
                            <strong>${this.escapeHtml(sale.animalName)}</strong>
                            <br>
                            <small class="text-muted">Arete: ${this.escapeHtml(sale.animalEarTag)}</small>
                        </div>
                    </div>
                </td>
                <td>${window.app.formatCurrency(sale.salePrice)}</td>
                <td>${sale.weightAtSale ? `${sale.weightAtSale} kg` : 'N/A'}</td>
                <td>${this.escapeHtml(sale.buyerName || 'N/A')}</td>
                <td>${this.escapeHtml(sale.buyerContact || 'N/A')}</td>
                <td>${window.app.formatDate(sale.saleDate)}</td>
                <td>${this.escapeHtml(sale.notes || 'Sin notas')}</td>
                <td>${window.app.formatDateTime(sale.createdAt)}</td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-info view-sale-btn" data-id="${sale.id}">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-outline-danger delete-sale-btn" data-id="${sale.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    updateStats(sales) {
        const totalSalesElement = document.getElementById('total-sales');
        const totalRevenueElement = document.getElementById('total-revenue');
        const monthlySalesElement = document.getElementById('monthly-sales');

        if (totalSalesElement) {
            totalSalesElement.textContent = sales.length;
        }

        if (totalRevenueElement) {
            const totalRevenue = sales.reduce((sum, sale) => sum + parseFloat(sale.salePrice), 0);
            totalRevenueElement.textContent = window.app.formatCurrency(totalRevenue);
        }

        if (monthlySalesElement) {
            const currentMonth = new Date().getMonth();
            const currentYear = new Date().getFullYear();
            const monthlySales = sales.filter(sale => {
                const saleDate = new Date(sale.saleDate);
                return saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear;
            }).length;
            monthlySalesElement.textContent = monthlySales;
        }
    }

    async handleSaleSubmit(e) {
        e.preventDefault();
        const form = e.target;
        
        try {
            window.app.showLoading(true);
            const formData = window.app.getFormData(form);

            // Validaciones
            if (!formData.animalId && !formData.animalEarTag) {
                window.app.showAlert('Debe seleccionar un animal o ingresar el número de arete', 'warning');
                return;
            }

            if (!formData.salePrice) {
                window.app.showAlert('El precio de venta es obligatorio', 'warning');
                return;
            }

            // Registrar venta
            await window.app.apiCall('/sales', {
                method: 'POST',
                body: formData
            });

            window.app.showAlert('Venta registrada exitosamente', 'success');

            // Cerrar modal y recargar datos
            window.app.hideModal('addSaleModal');
            window.app.resetForm(form);
            await this.loadSales();

        } catch (error) {
            console.error('Error saving sale:', error);
            window.app.showAlert('Error al registrar la venta: ' + error.message, 'danger');
        } finally {
            window.app.showLoading(false);
        }
    }

    async viewSale(saleId) {
        try {
            window.app.showLoading(true);
            const sale = await window.app.apiCall(`/sales/${saleId}`);
            
            // Mostrar detalles en un modal
            const modalBody = `
                <div class="row">
                    <div class="col-md-6">
                        <h6>Animal</h6>
                        <p><strong>Nombre:</strong> ${this.escapeHtml(sale.animalName)}</p>
                        <p><strong>Arete:</strong> ${this.escapeHtml(sale.animalEarTag)}</p>
                    </div>
                    <div class="col-md-6">
                        <h6>Venta</h6>
                        <p><strong>Precio:</strong> ${window.app.formatCurrency(sale.salePrice)}</p>
                        <p><strong>Peso:</strong> ${sale.weightAtSale ? `${sale.weightAtSale} kg` : 'N/A'}</p>
                        <p><strong>Fecha:</strong> ${window.app.formatDate(sale.saleDate)}</p>
                    </div>
                </div>
                <div class="row mt-3">
                    <div class="col-md-6">
                        <h6>Comprador</h6>
                        <p><strong>Nombre:</strong> ${this.escapeHtml(sale.buyerName || 'N/A')}</p>
                        <p><strong>Contacto:</strong> ${this.escapeHtml(sale.buyerContact || 'N/A')}</p>
                    </div>
                    <div class="col-md-6">
                        <h6>Notas</h6>
                        <p>${this.escapeHtml(sale.notes || 'Sin notas')}</p>
                    </div>
                </div>
            `;

            // Crear modal temporal para mostrar detalles
            this.showDetailModal('Detalles de Venta', modalBody);

        } catch (error) {
            console.error('Error loading sale details:', error);
            window.app.showAlert('Error al cargar los detalles de la venta', 'danger');
        } finally {
            window.app.showLoading(false);
        }
    }

    async deleteSale(saleId) {
        if (!confirm('¿Estás seguro de que quieres eliminar esta venta? Esta acción no se puede deshacer.')) {
            return;
        }

        try {
            window.app.showLoading(true);
            await window.app.apiCall(`/sales/${saleId}`, {
                method: 'DELETE'
            });
            
            window.app.showAlert('Venta eliminada exitosamente', 'success');
            await this.loadSales();

        } catch (error) {
            console.error('Error deleting sale:', error);
            window.app.showAlert('Error al eliminar la venta', 'danger');
        } finally {
            window.app.showLoading(false);
        }
    }

    showDetailModal(title, content) {
        // Crear modal temporal
        const modalId = 'detailModal';
        let modalElement = document.getElementById(modalId);
        
        if (!modalElement) {
            modalElement = document.createElement('div');
            modalElement.id = modalId;
            modalElement.className = 'modal fade';
            modalElement.innerHTML = `
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title"></h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body"></div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modalElement);
        }

        modalElement.querySelector('.modal-title').textContent = title;
        modalElement.querySelector('.modal-body').innerHTML = content;
        
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
    }

    async loadAnimalsSelect() {
        try {
            const animals = await window.app.getActiveAnimals();
            const select = document.getElementById('sale-animal-id');
            if (select) {
                // Limpiar opciones excepto la primera
                while (select.options.length > 1) {
                    select.remove(1);
                }
                
                // Agregar animales activos
                animals.forEach(animal => {
                    const option = document.createElement('option');
                    option.value = animal.id;
                    option.textContent = `${animal.earTag} - ${animal.name} (${animal.breed})`;
                    select.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading animals for select:', error);
        }
    }

    async filterSales(e) {
        e.preventDefault();
        // Implementar filtros si es necesario
        window.app.showAlert('Filtro aplicado', 'info');
    }

    clearFilters() {
        const filterForm = document.getElementById('filter-sales-form');
        if (filterForm) {
            filterForm.reset();
        }
        this.loadSales();
    }

    escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

// Inicialización
if (typeof window.salesManager === 'undefined') {
    window.salesManager = new SalesManager();
}