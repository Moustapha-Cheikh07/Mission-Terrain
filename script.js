
// Merlin Gerin Quality Dashboard - Main JavaScript
// This file contains all the application logic organized in modules

// ===========================================
// UTILITY FUNCTIONS MODULE
// ===========================================
const Utils = {
    // Debounce function for performance optimization
    debounce: function(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Format date to French locale
    formatDate: function(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR');
    },

    // Get date range based on period
    getDateRange: function(period) {
        const today = new Date();
        const ranges = {
            today: () => {
                const start = new Date(today);
                start.setHours(0, 0, 0, 0);
                return { start, end: today };
            },
            week: () => {
                const start = new Date(today);
                start.setDate(today.getDate() - 7);
                return { start, end: today };
            },
            month: () => {
                const start = new Date(today);
                start.setMonth(today.getMonth() - 1);
                return { start, end: today };
            },
            year: () => {
                const start = new Date(today);
                start.setFullYear(today.getFullYear() - 1);
                return { start, end: today };
            },
            all: () => {
                return { start: new Date(0), end: today };
            }
        };
        return ranges[period] ? ranges[period]() : ranges.all();
    },

    // Filter results by period
    filterByPeriod: function(results, period) {
        if (period === 'all') return results;
        const { start, end } = this.getDateRange(period);
        return results.filter(result => {
            const resultDate = new Date(result.date);
            return resultDate >= start && resultDate <= end;
        });
    }
};

// ===========================================
// CHART MODULE (with optimizations)
// ===========================================
const ChartModule = {
    canvas: null,
    ctx: null,
    data: null,
    padding: 50,
    dimensions: { width: 0, height: 0, stepX: 0, stepY: 0 },
    range: { min: 0, max: 100 },
    hoveredIndex: -1,
    tooltip: null,

    // Initialize chart
    init: function() {
        this.canvas = document.getElementById('conformity-chart');
        if (!this.canvas) return;

        this.tooltip = document.getElementById('chart-tooltip');

        // Set canvas dimensions
        this.canvas.width = 1000;
        this.canvas.height = 500;
        this.ctx = this.canvas.getContext('2d');

        this.setupEventListeners();
        this.draw();
    },

    // Setup all event listeners with debouncing
    setupEventListeners: function() {
        if (!this.canvas) return;

        const debouncedMouseMove = Utils.debounce((e) => this.handleMouseMove(e), 16);

        this.canvas.addEventListener('mousemove', debouncedMouseMove);
        this.canvas.addEventListener('mouseleave', () => this.handleMouseLeave());
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
    },

    // Get filtered data based on current filters
    getFilteredData: function() {
        const results = DataManager.getResults();
        if (results.length === 0) return null;

        const lineFilter = document.getElementById('line-filter')?.value || 'all';
        const statusFilter = document.getElementById('status-filter')?.value || 'all';
        const periodFilter = document.getElementById('period-filter')?.value || 'month';

        // Apply all filters
        let filtered = Utils.filterByPeriod(results, periodFilter);

        if (lineFilter !== 'all') {
            filtered = filtered.filter(r => r.line === lineFilter);
        }

        if (statusFilter !== 'all') {
            filtered = filtered.filter(r => r.status === statusFilter);
        }

        // Group by date and calculate conformity rate
        const dateGroups = {};
        filtered.forEach(result => {
            const date = result.date;
            if (!dateGroups[date]) {
                dateGroups[date] = { total: 0, conform: 0 };
            }
            dateGroups[date].total++;
            if (result.status === 'success') {
                dateGroups[date].conform++;
            }
        });

        // Convert to array and sort
        const chartData = Object.keys(dateGroups)
            .sort((a, b) => new Date(a) - new Date(b))
            .map(date => ({
                date: date,
                rate: (dateGroups[date].conform / dateGroups[date].total) * 100
            }));

        // Take last 10 points
        const lastPoints = chartData.slice(-10);

        return {
            dates: lastPoints.map(d => {
                const date = new Date(d.date);
                return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
            }),
            rates: lastPoints.map(d => d.rate),
            fullDates: lastPoints.map(d => d.date)
        };
    },

    // Main draw function
    draw: function(highlightIndex = -1) {
        if (!this.ctx || !this.canvas) return;

        // Check if canvas is visible
        if (this.canvas.offsetWidth === 0) {
            setTimeout(() => this.draw(), 100);
            return;
        }

        this.data = this.getFilteredData();

        if (!this.data || this.data.rates.length === 0) {
            this.drawNoData();
            return;
        }

        this.calculateDimensions();
        this.clearCanvas();
        this.drawGrid();
        this.drawAxes();
        this.drawAreaGradient();
        this.drawLine();
        this.drawPoints(highlightIndex);
        this.drawLabels();
        this.drawLegend();
    },

    // Calculate chart dimensions
    calculateDimensions: function() {
        const rates = this.data.rates;
        const minDataValue = Math.min(...rates);
        const maxDataValue = Math.max(...rates);

        this.range.min = Math.max(0, Math.floor(minDataValue - 5));
        this.range.max = Math.min(100, Math.ceil(maxDataValue + 5));

        this.dimensions.width = this.canvas.width - (this.padding * 2);
        this.dimensions.height = this.canvas.height - (this.padding * 2);
        this.dimensions.stepX = rates.length > 1 ? this.dimensions.width / (rates.length - 1) : this.dimensions.width / 2;
        this.dimensions.stepY = this.dimensions.height / (this.range.max - this.range.min);
    },

    // Clear canvas
    clearCanvas: function() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    },

    // Draw background grid
    drawGrid: function() {
        this.ctx.strokeStyle = '#f1f5f9';
        this.ctx.lineWidth = 1;
        for (let i = 0; i <= 5; i++) {
            const y = this.padding + (this.dimensions.height / 5) * i;
            this.ctx.beginPath();
            this.ctx.moveTo(this.padding, y);
            this.ctx.lineTo(this.canvas.width - this.padding, y);
            this.ctx.stroke();
        }
    },

    // Draw axes
    drawAxes: function() {
        this.ctx.strokeStyle = '#64748b';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(this.padding, this.padding);
        this.ctx.lineTo(this.padding, this.canvas.height - this.padding);
        this.ctx.lineTo(this.canvas.width - this.padding, this.canvas.height - this.padding);
        this.ctx.stroke();
    },

    // Draw gradient area under line
    drawAreaGradient: function() {
        const gradient = this.ctx.createLinearGradient(0, this.padding, 0, this.canvas.height - this.padding);
        gradient.addColorStop(0, 'rgba(16, 185, 129, 0.3)');
        gradient.addColorStop(1, 'rgba(16, 185, 129, 0.05)');

        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.moveTo(this.padding, this.canvas.height - this.padding);

        this.data.rates.forEach((value, index) => {
            const x = this.padding + (this.dimensions.stepX * index);
            const y = this.canvas.height - this.padding - ((value - this.range.min) * this.dimensions.stepY);
            this.ctx.lineTo(x, y);
        });

        this.ctx.lineTo(this.padding + (this.dimensions.stepX * (this.data.rates.length - 1)),
                       this.canvas.height - this.padding);
        this.ctx.closePath();
        this.ctx.fill();
    },

    // Draw main line
    drawLine: function() {
        this.ctx.strokeStyle = '#10b981';
        this.ctx.lineWidth = 3;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.beginPath();

        this.data.rates.forEach((value, index) => {
            const x = this.padding + (this.dimensions.stepX * index);
            const y = this.canvas.height - this.padding - ((value - this.range.min) * this.dimensions.stepY);
            if (index === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        });
        this.ctx.stroke();
    },

    // Draw data points
    drawPoints: function(highlightIndex) {
        this.data.rates.forEach((value, index) => {
            const x = this.padding + (this.dimensions.stepX * index);
            const y = this.canvas.height - this.padding - ((value - this.range.min) * this.dimensions.stepY);

            const isHighlighted = index === highlightIndex;

            // Draw point
            this.ctx.fillStyle = isHighlighted ? '#059669' : '#10b981';
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 3;

            this.ctx.beginPath();
            this.ctx.arc(x, y, isHighlighted ? 8 : 6, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();

            // Draw value label for highlighted point
            if (isHighlighted || this.data.rates.length <= 5) {
                this.ctx.fillStyle = '#059669';
                this.ctx.font = 'bold 11px sans-serif';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(value.toFixed(1) + '%', x, y - 12);
            }
        });
    },

    // Draw axis labels
    drawLabels: function() {
        this.ctx.fillStyle = '#64748b';
        this.ctx.font = 'bold 14px sans-serif';

        // X-axis labels (dates)
        this.ctx.textAlign = 'center';
        this.data.dates.forEach((label, index) => {
            const x = this.padding + (this.dimensions.stepX * index);
            this.ctx.fillText(label, x, this.canvas.height - this.padding + 25);
        });

        // Y-axis labels (percentages)
        this.ctx.textAlign = 'right';
        this.ctx.textBaseline = 'middle';
        for (let i = 0; i <= 5; i++) {
            const value = this.range.min + ((this.range.max - this.range.min) / 5) * (5 - i);
            const y = this.padding + (this.dimensions.height / 5) * i;
            this.ctx.fillText(value.toFixed(0) + '%', this.padding - 10, y);
        }
    },

    // Draw professional legend with statistics
    drawLegend: function() {
        const rates = this.data.rates;
        const avgRate = (rates.reduce((sum, val) => sum + val, 0) / rates.length).toFixed(1);
        const maxRate = Math.max(...rates).toFixed(1);
        const minRate = Math.min(...rates).toFixed(1);

        // Get active filters
        const lineFilter = document.getElementById('line-filter')?.value || 'all';
        const statusFilter = document.getElementById('status-filter')?.value || 'all';
        const periodFilter = document.getElementById('period-filter')?.value || 'month';

        const periodNames = {
            'today': "Aujourd'hui",
            'week': 'Semaine',
            'month': 'Mois',
            'year': 'Année',
            'all': 'Tout'
        };

        const lineNames = {
            'all': 'Toutes lignes',
            'A': 'Ligne A',
            'B': 'Ligne B',
            'C': 'Ligne C',
            'D': 'Ligne D'
        };

        const statusNames = {
            'all': 'Tous statuts',
            'success': 'Conforme',
            'warning': 'À vérifier',
            'danger': 'Non-conforme'
        };

        // Draw title with filters
        this.ctx.fillStyle = '#1e293b';
        this.ctx.font = 'bold 16px sans-serif';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('Évolution du Taux de Conformité', this.padding, this.padding - 30);

        // Draw filter info
        this.ctx.fillStyle = '#64748b';
        this.ctx.font = '11px sans-serif';
        let filterText = `${periodNames[periodFilter]}`;
        if (lineFilter !== 'all') filterText += ` • ${lineNames[lineFilter]}`;
        if (statusFilter !== 'all') filterText += ` • ${statusNames[statusFilter]}`;
        this.ctx.fillText(filterText, this.padding, this.padding - 12);

        // Draw statistics box
        const statsX = this.canvas.width - this.padding - 200;
        const statsY = this.padding - 35;
        const statsWidth = 200;
        const statsHeight = 70;

        // Background
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        this.ctx.fillRect(statsX, statsY, statsWidth, statsHeight);
        this.ctx.strokeStyle = '#e2e8f0';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(statsX, statsY, statsWidth, statsHeight);

        // Statistics text
        const stats = [
            { label: 'Moyenne', value: avgRate + '%', color: '#10b981' },
            { label: 'Maximum', value: maxRate + '%', color: '#3b82f6' },
            { label: 'Minimum', value: minRate + '%', color: '#f59e0b' }
        ];

        stats.forEach((stat, index) => {
            const y = statsY + 20 + (index * 16);

            // Label
            this.ctx.fillStyle = '#64748b';
            this.ctx.font = '10px sans-serif';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(stat.label + ':', statsX + 10, y);

            // Value
            this.ctx.fillStyle = stat.color;
            this.ctx.font = 'bold 12px sans-serif';
            this.ctx.textAlign = 'right';
            this.ctx.fillText(stat.value, statsX + statsWidth - 10, y);
        });
    },

    // Draw "no data" message
    drawNoData: function() {
        this.ctx.fillStyle = '#64748b';
        this.ctx.font = '16px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Aucune donnée disponible', this.canvas.width / 2, this.canvas.height / 2);
    },

    // Handle mouse move
    handleMouseMove: function(e) {
        if (!this.data) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Find closest data point
        let closestIndex = -1;
        let minDistance = Infinity;

        this.data.rates.forEach((value, index) => {
            const pointX = this.padding + (this.dimensions.stepX * index);
            const pointY = this.canvas.height - this.padding - ((value - this.range.min) * this.dimensions.stepY);
            const distance = Math.sqrt((x - pointX) ** 2 + (y - pointY) ** 2);

            if (distance < minDistance && distance < 20) {
                minDistance = distance;
                closestIndex = index;
            }
        });

        if (closestIndex !== this.hoveredIndex) {
            this.hoveredIndex = closestIndex;
            this.draw(this.hoveredIndex);

            if (this.hoveredIndex >= 0 && this.tooltip) {
                const value = this.data.rates[this.hoveredIndex];
                const date = this.data.fullDates[this.hoveredIndex];
                const formattedDate = new Date(date).toLocaleDateString('fr-FR');

                this.tooltip.textContent = `${formattedDate}: ${value.toFixed(1)}%`;
                this.tooltip.style.left = (e.clientX + 10) + 'px';
                this.tooltip.style.top = (e.clientY - 10) + 'px';
                this.tooltip.classList.add('show');
            } else if (this.tooltip) {
                this.tooltip.classList.remove('show');
            }
        }
    },

    // Handle mouse leave
    handleMouseLeave: function() {
        this.hoveredIndex = -1;
        this.draw(-1);
        if (this.tooltip) {
            this.tooltip.classList.remove('show');
        }
    },

    // Handle click on data point
    handleClick: function(e) {
        if (this.hoveredIndex >= 0 && this.data) {
            const date = this.data.fullDates[this.hoveredIndex];
            const formattedDate = new Date(date).toLocaleDateString('fr-FR');
            UIModule.showToast(`Données du ${formattedDate} sélectionnées`, 'success');
        }
    }
};

// ===========================================
// UI MODULE
// ===========================================
const UIModule = {
    // Show toast notification
    showToast: function(message, type = 'success') {
        const toast = document.getElementById('message-toast');
        if (!toast) return;

        toast.textContent = message;
        toast.className = `toast ${type} show`;

        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    },

    // Show confirmation dialog
    showConfirmation: function(message) {
        return confirm(message);
    },

    // Update date display
    updateDateDisplay: function() {
        const dateElement = document.getElementById('current-date');
        if (dateElement) {
            const today = new Date();
            const options = {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            };
            dateElement.textContent = today.toLocaleDateString('fr-FR', options);
        }
    },

    // Update dashboard statistics
    updateStats: function() {
        const stats = DataManager.getStats();
        const statCards = document.querySelectorAll('.stat-card');

        if (statCards.length >= 4) {
            const updates = [
                stats.conformityRate + '%',
                stats.totalControls.toLocaleString(),
                stats.nonConformControls,
                stats.totalDocuments
            ];

            statCards.forEach((card, index) => {
                const h3 = card.querySelector('.stat-info h3');
                if (h3 && updates[index] !== undefined) {
                    h3.textContent = updates[index];
                }
            });
        }
    }
};

// ===========================================
// NAVIGATION MODULE
// ===========================================
const NavigationModule = {
    init: function() {
        this.setupNavigation();
        this.setupQuickActions();
    },

    setupNavigation: function() {
        const navItems = document.querySelectorAll('.nav-item');
        const sections = document.querySelectorAll('.content-section');

        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const targetSection = item.getAttribute('data-section');
                this.showSection(targetSection);
            });
        });
    },

    setupQuickActions: function() {
        const actionButtons = document.querySelectorAll('.action-btn');
        actionButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetSection = button.getAttribute('data-section');
                this.showSection(targetSection);
            });
        });
    },

    showSection: function(sectionId) {
        const navItems = document.querySelectorAll('.nav-item');
        const sections = document.querySelectorAll('.content-section');

        navItems.forEach(nav => nav.classList.remove('active'));
        sections.forEach(section => section.classList.remove('active'));

        const targetNav = document.querySelector(`[data-section="${sectionId}"]`);
        if (targetNav) targetNav.classList.add('active');

        const targetSection = document.getElementById(sectionId);
        if (targetSection) targetSection.classList.add('active');

        // Refresh chart when navigating to results
        if (sectionId === 'results') {
            setTimeout(() => ChartModule.init(), 100);
        }
    }
};

// ===========================================
// RESULTS MODULE (Synchronized with filters)
// ===========================================
const ResultsModule = {
    init: function() {
        this.generateTable();
        this.setupFilters();
        this.updateFilterSummary();
    },

    // Get all filtered results (synchronized with chart)
    getFilteredResults: function() {
        const allResults = DataManager.getResults();
        if (allResults.length === 0) return [];

        const lineFilter = document.getElementById('line-filter')?.value || 'all';
        const statusFilter = document.getElementById('status-filter')?.value || 'all';
        const periodFilter = document.getElementById('period-filter')?.value || 'month';

        // Apply all filters (same logic as chart)
        let filtered = Utils.filterByPeriod(allResults, periodFilter);

        if (lineFilter !== 'all') {
            filtered = filtered.filter(r => r.line === lineFilter);
        }

        if (statusFilter !== 'all') {
            filtered = filtered.filter(r => r.status === statusFilter);
        }

        return filtered;
    },

    setupFilters: function() {
        const applyAllFilters = () => {
            this.generateTable();
            ChartModule.draw();
            this.updateFilterSummary();
        };

        // Period filter
        const periodFilter = document.getElementById('period-filter');
        if (periodFilter) {
            periodFilter.addEventListener('change', () => {
                applyAllFilters();
                const selectedText = periodFilter.options[periodFilter.selectedIndex].text;
                UIModule.showToast(`Filtre appliqué : ${selectedText}`, 'success');
            });
        }

        // Line filter
        const lineFilter = document.getElementById('line-filter');
        if (lineFilter) {
            lineFilter.addEventListener('change', () => {
                applyAllFilters();
                const selectedText = lineFilter.options[lineFilter.selectedIndex].text;
                UIModule.showToast(`Filtre appliqué : ${selectedText}`, 'success');
            });
        }

        // Status filter
        const statusFilter = document.getElementById('status-filter');
        if (statusFilter) {
            statusFilter.addEventListener('change', () => {
                applyAllFilters();
                const selectedText = statusFilter.options[statusFilter.selectedIndex].text;
                UIModule.showToast(`Filtre appliqué : ${selectedText}`, 'success');
            });
        }
    },

    // Update filter summary display
    updateFilterSummary: function() {
        const summaryElement = document.getElementById('filter-summary');
        if (!summaryElement) return;

        const lineFilter = document.getElementById('line-filter')?.value || 'all';
        const statusFilter = document.getElementById('status-filter')?.value || 'all';
        const periodFilter = document.getElementById('period-filter')?.value || 'month';

        const results = this.getFilteredResults();
        const totalResults = DataManager.getResults().length;

        const periodNames = {
            'today': "Aujourd'hui",
            'week': 'Cette semaine',
            'month': 'Ce mois',
            'year': 'Cette année',
            'all': 'Toute la période'
        };

        const lineNames = {
            'all': 'Toutes les lignes',
            'A': 'Ligne A',
            'B': 'Ligne B',
            'C': 'Ligne C',
            'D': 'Ligne D'
        };

        const statusNames = {
            'all': 'Tous les statuts',
            'success': 'Conforme',
            'warning': 'À vérifier',
            'danger': 'Non-conforme'
        };

        let activeFilters = [];
        if (periodFilter !== 'all') activeFilters.push(periodNames[periodFilter]);
        if (lineFilter !== 'all') activeFilters.push(lineNames[lineFilter]);
        if (statusFilter !== 'all') activeFilters.push(statusNames[statusFilter]);

        const filterText = activeFilters.length > 0
            ? `Filtres actifs : ${activeFilters.join(' • ')}`
            : 'Aucun filtre actif';

        summaryElement.innerHTML = `
            <div class="filter-summary-content">
                <div class="filter-info">
                    <i class="fas fa-filter"></i>
                    <span>${filterText}</span>
                </div>
                <div class="results-count">
                    <strong>${results.length}</strong> résultat${results.length > 1 ? 's' : ''} sur ${totalResults}
                </div>
            </div>
        `;
    },

    generateTable: function() {
        const tableBody = document.getElementById('results-table-body');
        if (!tableBody) return;

        const results = this.getFilteredResults();

        tableBody.innerHTML = '';

        if (results.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem; color: var(--text-secondary);"><i class="fas fa-inbox" style="font-size: 2rem; display: block; margin-bottom: 0.5rem; opacity: 0.5;"></i>Aucun résultat ne correspond aux filtres sélectionnés</td></tr>';
            return;
        }

        const statusText = {
            'success': 'Conforme',
            'warning': 'À vérifier',
            'danger': 'Non-conforme'
        };

        const statusClass = {
            'success': 'success',
            'warning': 'warning',
            'danger': 'danger'
        };

        results.forEach(data => {
            const row = document.createElement('tr');
            const formattedDate = Utils.formatDate(data.date);

            row.innerHTML = `
                <td>${formattedDate}</td>
                <td>Ligne ${data.line}</td>
                <td>${data.reference}</td>
                <td><span class="status-badge ${statusClass[data.status]}">${statusText[data.status]}</span></td>
                <td>${data.operator}</td>
            `;

            tableBody.appendChild(row);
        });
    }
};

// ===========================================
// DOCUMENTS MODULE
// ===========================================
const DocumentsModule = {
    init: function() {
        this.generateDocuments();
        this.setupSearch();
    },

    generateDocuments: function() {
        const documentsGrid = document.getElementById('documents-grid');
        if (!documentsGrid) return;

        const documents = DataManager.getDocuments();
        documentsGrid.innerHTML = '';

        if (documents.length === 0) {
            documentsGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: var(--text-secondary);">Aucun document disponible</div>';
            return;
        }

        documents.forEach(doc => {
            const card = document.createElement('div');
            card.className = 'document-card';
            card.setAttribute('tabindex', '0');
            card.setAttribute('role', 'button');
            card.setAttribute('aria-label', `Ouvrir le document ${doc.title}`);

            const formattedDate = Utils.formatDate(doc.date);

            card.innerHTML = `
                <div class="document-header">
                    <div class="document-icon">
                        <i class="fas fa-file-alt"></i>
                    </div>
                    <div class="document-info">
                        <h3>${doc.title}</h3>
                        <p>${doc.id}</p>
                    </div>
                </div>
                <div class="document-meta">
                    <span><i class="fas fa-calendar"></i> ${formattedDate}</span>
                    <span><i class="fas fa-tag"></i> ${doc.type}</span>
                </div>
            `;

            card.addEventListener('click', () => this.openDocument(doc.id));
            card.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.openDocument(doc.id);
                }
            });

            documentsGrid.appendChild(card);
        });
    },

    setupSearch: function() {
        const searchInput = document.getElementById('document-search');
        if (!searchInput) return;

        const debouncedSearch = Utils.debounce((e) => {
            const searchTerm = e.target.value.toLowerCase();
            const documentCards = document.querySelectorAll('.document-card');

            documentCards.forEach(card => {
                const text = card.textContent.toLowerCase();
                card.style.display = text.includes(searchTerm) ? 'block' : 'none';
            });
        }, 300);

        searchInput.addEventListener('input', debouncedSearch);
    },

    openDocument: function(docId) {
        UIModule.showToast(`Ouverture du dossier ${docId}`, 'success');
        // Future: Open document viewer or download
    }
};

// ===========================================
// ACTIVITY MODULE (Activités récentes en temps réel)
// ===========================================
const ActivityModule = {
    init: function() {
        this.displayActivities();
    },

    // Get relative time string in French
    getRelativeTime: function(timestamp) {
        const now = new Date();
        const then = new Date(timestamp);
        const diffMs = now - then;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'À l\'instant';
        if (diffMins < 60) return `Il y a ${diffMins} minute${diffMins > 1 ? 's' : ''}`;
        if (diffHours < 24) return `Il y a ${diffHours} heure${diffHours > 1 ? 's' : ''}`;
        if (diffDays === 1) return 'Hier';
        if (diffDays < 7) return `Il y a ${diffDays} jours`;
        return Utils.formatDate(timestamp);
    },

    // Display activities in the recent activity section
    displayActivities: function() {
        const activityList = document.querySelector('.activity-list');
        if (!activityList) return;

        const activities = DataManager.getActivities(5); // Get last 5 activities

        if (activities.length === 0) {
            activityList.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-secondary);">Aucune activité récente</div>';
            return;
        }

        activityList.innerHTML = '';

        activities.forEach(activity => {
            const activityItem = document.createElement('div');
            activityItem.className = 'activity-item';

            activityItem.innerHTML = `
                <div class="activity-icon">
                    <i class="fas fa-${activity.icon}"></i>
                </div>
                <div class="activity-content">
                    <h4>${activity.title}</h4>
                    <p>${activity.description} - ${this.getRelativeTime(activity.timestamp)}</p>
                </div>
            `;

            activityList.appendChild(activityItem);
        });
    },

    // Add a new activity
    addActivity: function(activityData) {
        DataManager.addActivity(activityData);
        this.displayActivities(); // Refresh the display
    }
};

// ===========================================
// FORMS MODULE
// ===========================================
const FormsModule = {
    init: function() {
        this.setupQualityCheckForm();
        this.setupRejectForm();
        this.setDefaultDates();
    },

    setDefaultDates: function() {
        const today = new Date().toISOString().split('T')[0];

        const rejectDate = document.getElementById('reject-date');
        if (rejectDate) rejectDate.value = today;

        const checkDate = document.getElementById('check-date');
        if (checkDate) checkDate.value = today;
    },

    // Validate Quality Check Form
    validateQualityCheckForm: function(formData) {
        const errors = [];

        if (!formData.date) errors.push('La date est requise');
        if (!formData.line) errors.push('La ligne de production est requise');
        if (!formData.reference || formData.reference.trim().length < 3) {
            errors.push('La référence produit doit contenir au moins 3 caractères');
        }
        if (!formData.quantity || formData.quantity < 1) {
            errors.push('La quantité doit être supérieure à 0');
        }
        if (!formData.status) errors.push('Le résultat du contrôle est requis');
        if (!formData.operator || formData.operator.trim().length < 2) {
            errors.push('Le nom de l\'opérateur doit contenir au moins 2 caractères');
        }

        return errors;
    },

    // Setup Quality Check Form
    setupQualityCheckForm: function() {
        const checkForm = document.getElementById('quality-check-form');
        if (!checkForm) return;

        checkForm.addEventListener('submit', (e) => {
            e.preventDefault();

            // Check authentication
            if (!SimpleAuth.isLoggedIn()) {
                UIModule.showToast('Vous devez vous identifier pour soumettre des données', 'error');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
                return;
            }

            // Get form data
            const formData = {
                date: document.getElementById('check-date').value,
                line: document.getElementById('check-line').value,
                reference: document.getElementById('check-reference').value,
                quantity: document.getElementById('check-quantity').value,
                status: document.getElementById('check-status').value,
                notes: document.getElementById('check-notes').value || '',
                operator: document.getElementById('check-operator').value
            };

            // Validate form
            const errors = this.validateQualityCheckForm(formData);
            if (errors.length > 0) {
                UIModule.showToast(errors[0], 'error');
                return;
            }

            // Confirm submission
            if (!UIModule.showConfirmation('Êtes-vous sûr de vouloir enregistrer ce contrôle qualité ?')) {
                return;
            }

            // Save quality check
            const checkSaved = DataManager.addQualityCheck(formData);

            // Add result to results table
            const resultSaved = DataManager.addResult({
                date: formData.date,
                line: formData.line,
                reference: formData.reference,
                status: formData.status,
                operator: formData.operator
            });

            // Add activity to recent activities
            const statusText = {
                'success': 'Conforme',
                'warning': 'À vérifier',
                'danger': 'Non-conforme'
            };

            ActivityModule.addActivity({
                type: 'quality_check',
                title: 'Contrôle qualité terminé',
                description: `Ligne de production ${formData.line} - ${statusText[formData.status]}`,
                icon: 'check',
                user: formData.operator
            });

            if (checkSaved && resultSaved) {
                // Update UI
                UIModule.updateStats();
                ResultsModule.generateTable();
                UIModule.showToast('Contrôle qualité enregistré avec succès !', 'success');

                // Reset form
                checkForm.reset();
                this.setDefaultDates();
            } else {
                UIModule.showToast('Erreur lors de l\'enregistrement. Vérifiez l\'espace de stockage.', 'error');
            }
        });
    },

    validateForm: function(formData) {
        const errors = [];

        if (!formData.date) errors.push('La date est requise');
        if (!formData.line) errors.push('La ligne de production est requise');
        if (!formData.reference || formData.reference.trim().length < 3) {
            errors.push('La référence produit doit contenir au moins 3 caractères');
        }
        if (!formData.quantity || formData.quantity < 1) {
            errors.push('La quantité doit être supérieure à 0');
        }
        if (!formData.reason) errors.push('La raison du rebut est requise');
        if (!formData.description || formData.description.trim().length < 10) {
            errors.push('La description doit contenir au moins 10 caractères');
        }
        if (!formData.operator || formData.operator.trim().length < 2) {
            errors.push('Le nom de l\'opérateur doit contenir au moins 2 caractères');
        }

        return errors;
    },

    setupRejectForm: function() {
        const rejectForm = document.getElementById('reject-form');
        if (!rejectForm) return;

        rejectForm.addEventListener('submit', (e) => {
            e.preventDefault();

            // Check authentication
            if (!SimpleAuth.isLoggedIn()) {
                UIModule.showToast('Vous devez vous identifier pour soumettre des données', 'error');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
                return;
            }

            // Get form data
            const formData = {
                date: document.getElementById('reject-date').value,
                line: document.getElementById('reject-line').value,
                reference: document.getElementById('reject-reference').value,
                quantity: document.getElementById('reject-quantity').value,
                reason: document.getElementById('reject-reason').value,
                description: document.getElementById('reject-description').value,
                operator: document.getElementById('reject-operator').value
            };

            // Validate form
            const errors = this.validateForm(formData);
            if (errors.length > 0) {
                UIModule.showToast(errors[0], 'error');
                return;
            }

            // Confirm submission
            if (!UIModule.showConfirmation('Êtes-vous sûr de vouloir envoyer cette déclaration de rebut ?')) {
                return;
            }

            // Save data
            const rejectSaved = DataManager.addReject(formData);
            const resultSaved = DataManager.addResult({
                date: formData.date,
                line: formData.line,
                reference: formData.reference,
                status: 'danger',
                operator: formData.operator
            });

            // Add activity to recent activities
            const reasonText = {
                'dimension': 'Non-conformité dimensionnelle',
                'appearance': 'Défaut d\'aspect',
                'function': 'Défaut fonctionnel',
                'material': 'Défaut matière',
                'other': 'Autre'
            };

            ActivityModule.addActivity({
                type: 'reject',
                title: 'Rebut déclaré',
                description: `Ligne ${formData.line} - ${reasonText[formData.reason]}`,
                icon: 'exclamation-triangle',
                user: formData.operator
            });

            if (rejectSaved && resultSaved) {
                // Update UI
                UIModule.updateStats();
                ResultsModule.generateTable();
                UIModule.showToast('Déclaration de rebut envoyée avec succès !', 'success');

                // Reset form
                rejectForm.reset();
                this.setDefaultDates();
            } else {
                UIModule.showToast('Erreur lors de l\'enregistrement. Vérifiez l\'espace de stockage.', 'error');
            }
        });
    }
};

// ===========================================
// TRAINING DOCUMENTS MODULE (New professional system)
// ===========================================
const TrainingDocumentsModule = {
    init: function() {
        this.setupUploadButton();
        this.setupUploadForm();
        this.displayDocuments();
        this.updateUIBasedOnAuth();
    },

    // Setup upload button visibility based on authentication
    setupUploadButton: function() {
        const headerActions = document.getElementById('training-header-actions');
        if (!headerActions) return;

        if (SimpleAuth.isLoggedIn()) {
            headerActions.innerHTML = `
                <button class="add-doc-btn" id="show-upload-btn">
                    <i class="fas fa-plus"></i>
                    Ajouter un document
                </button>
            `;

            const showUploadBtn = document.getElementById('show-upload-btn');
            if (showUploadBtn) {
                showUploadBtn.addEventListener('click', () => this.showUploadForm());
            }
        } else {
            headerActions.innerHTML = '';
        }
    },

    // Show/hide upload form
    showUploadForm: function() {
        const uploadSection = document.getElementById('admin-upload-section');
        if (uploadSection) {
            uploadSection.style.display = 'block';
            uploadSection.scrollIntoView({ behavior: 'smooth' });
        }
    },

    hideUploadForm: function() {
        const uploadSection = document.getElementById('admin-upload-section');
        if (uploadSection) {
            uploadSection.style.display = 'none';
        }
    },

    // Setup upload form handlers
    setupUploadForm: function() {
        const uploadForm = document.getElementById('training-upload-form');
        const fileInput = document.getElementById('doc-file');
        const fileName = document.getElementById('file-name');
        const cancelBtn = document.getElementById('cancel-upload');

        // File input change handler
        if (fileInput && fileName) {
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    fileName.textContent = file.name;
                } else {
                    fileName.textContent = 'Aucun fichier sélectionné';
                }
            });
        }

        // Cancel button handler
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                if (uploadForm) uploadForm.reset();
                if (fileName) fileName.textContent = 'Aucun fichier sélectionné';
                this.hideUploadForm();
            });
        }

        // Form submission handler
        if (uploadForm) {
            uploadForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleUpload(e);
            });
        }
    },

    // Handle file upload
    handleUpload: async function(e) {
        const form = e.target;
        const fileInput = document.getElementById('doc-file');
        const file = fileInput.files[0];

        if (!file) {
            UIModule.showToast('Veuillez sélectionner un fichier', 'error');
            return;
        }

        // Validate file size (5MB max)
        const maxSize = 5 * 1024 * 1024; // 5MB in bytes
        if (file.size > maxSize) {
            UIModule.showToast('Le fichier est trop volumineux (max 5MB)', 'error');
            return;
        }

        // Validate file type
        const allowedTypes = ['application/pdf', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'];
        if (!allowedTypes.includes(file.type)) {
            UIModule.showToast('Format de fichier non supporté. Utilisez PDF, PPT ou PPTX', 'error');
            return;
        }

        // Show loading state
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Upload en cours...';

        try {
            // Read file as base64
            const base64 = await this.readFileAsBase64(file);

            // Get form data
            const docData = {
                title: document.getElementById('doc-title').value,
                category: document.getElementById('doc-category').value,
                description: document.getElementById('doc-description').value || '',
                fileName: file.name,
                fileType: file.type,
                fileSize: file.size,
                fileData: base64
            };

            // Save to storage
            const saved = DataManager.addTrainingDocument(docData);

            if (saved) {
                // Add activity
                const categoryNames = {
                    'basics': 'Concepts de base',
                    'controls': 'Contrôles qualité',
                    'procedures': 'Procédures',
                    'standards': 'Normes et standards',
                    'tools': 'Outils et équipements',
                    'other': 'Autre'
                };

                ActivityModule.addActivity({
                    type: 'training_upload',
                    title: 'Document de formation ajouté',
                    description: `${docData.title} - ${categoryNames[docData.category]}`,
                    icon: 'file-upload',
                    user: SimpleAuth.getCurrentUser()
                });

                // Success
                UIModule.showToast('Document uploadé avec succès !', 'success');
                form.reset();
                document.getElementById('file-name').textContent = 'Aucun fichier sélectionné';
                this.hideUploadForm();
                this.displayDocuments();
            } else {
                UIModule.showToast('Erreur lors de l\'enregistrement. Espace de stockage insuffisant.', 'error');
            }
        } catch (error) {
            console.error('Upload error:', error);
            UIModule.showToast('Erreur lors de l\'upload du fichier', 'error');
        } finally {
            // Reset button
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    },

    // Read file as base64
    readFileAsBase64: function(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    },

    // Display training documents
    displayDocuments: function() {
        const documentsList = document.getElementById('training-documents-list');
        if (!documentsList) return;

        const documents = DataManager.getTrainingDocuments();

        if (documents.length === 0) {
            documentsList.innerHTML = `
                <div class="empty-docs">
                    <i class="fas fa-folder-open"></i>
                    <p>Aucun document de formation disponible pour le moment</p>
                    ${SimpleAuth.isLoggedIn() ? '<p><small>Utilisez le bouton ci-dessus pour ajouter des documents</small></p>' : ''}
                </div>
            `;
            return;
        }

        documentsList.innerHTML = '';

        documents.forEach(doc => {
            const docItem = document.createElement('div');
            docItem.className = 'training-doc-item';

            // Get file extension
            const ext = doc.fileName.split('.').pop().toLowerCase();
            const iconClass = ext === 'pdf' ? 'fa-file-pdf' : 'fa-file-powerpoint';

            // Category names
            const categoryNames = {
                'basics': 'Concepts de base',
                'controls': 'Contrôles qualité',
                'procedures': 'Procédures',
                'standards': 'Normes et standards',
                'tools': 'Outils et équipements',
                'other': 'Autre'
            };

            // Format file size
            const fileSize = this.formatFileSize(doc.fileSize);

            // Format upload date
            const uploadDate = Utils.formatDate(doc.uploadDate);

            // Build actions based on authentication
            let actionsHTML = `
                <button class="doc-btn view" onclick="TrainingDocumentsModule.viewDocument(${doc.id})">
                    <i class="fas fa-eye"></i> Consulter
                </button>
                <button class="doc-btn download" onclick="TrainingDocumentsModule.downloadDocument(${doc.id})">
                    <i class="fas fa-download"></i> Télécharger
                </button>
            `;

            if (SimpleAuth.isLoggedIn()) {
                actionsHTML += `
                    <button class="doc-btn delete" onclick="TrainingDocumentsModule.deleteDocument(${doc.id})">
                        <i class="fas fa-trash"></i> Supprimer
                    </button>
                `;
            }

            docItem.innerHTML = `
                <div class="doc-icon ${ext}">
                    <i class="fas ${iconClass}"></i>
                </div>
                <div class="doc-info">
                    <h3>${doc.title}</h3>
                    ${doc.description ? `<p style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 0.25rem;">${doc.description}</p>` : ''}
                    <span class="doc-category">${categoryNames[doc.category] || doc.category}</span>
                    <div class="doc-meta">
                        <span><i class="fas fa-file"></i> ${fileSize}</span>
                        <span><i class="fas fa-calendar"></i> ${uploadDate}</span>
                        <span><i class="fas fa-user"></i> ${doc.uploadedBy}</span>
                        <span><i class="fas fa-download"></i> ${doc.downloads || 0} téléchargement(s)</span>
                    </div>
                </div>
                <div class="doc-actions">
                    ${actionsHTML}
                </div>
            `;

            documentsList.appendChild(docItem);
        });
    },

    // View document in modal
    viewDocument: function(docId) {
        const documents = DataManager.getTrainingDocuments();
        const doc = documents.find(d => d.id === docId);

        if (!doc) {
            UIModule.showToast('Document non trouvé', 'error');
            return;
        }

        const modal = document.getElementById('document-viewer-modal');
        const titleElement = document.getElementById('viewer-doc-title');
        const bodyElement = document.getElementById('viewer-body');
        const downloadBtn = document.getElementById('viewer-download-btn');

        if (!modal || !titleElement || !bodyElement) return;

        // Set title
        titleElement.innerHTML = `<i class="fas fa-file-${doc.fileName.endsWith('.pdf') ? 'pdf' : 'powerpoint'}"></i> ${doc.title}`;

        // Get file extension
        const ext = doc.fileName.split('.').pop().toLowerCase();

        // Show loading
        bodyElement.innerHTML = `
            <div class="loading">
                <i class="fas fa-spinner"></i>
                <p>Chargement du document...</p>
            </div>
        `;

        // Open modal
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');

        // Load document based on type
        setTimeout(() => {
            if (ext === 'pdf') {
                // For PDF, use iframe with base64 data
                bodyElement.innerHTML = `
                    <iframe src="${doc.fileData}" type="application/pdf"></iframe>
                `;
            } else if (ext === 'ppt' || ext === 'pptx') {
                // For PowerPoint, show notice with options
                bodyElement.innerHTML = `
                    <div class="ppt-viewer-notice">
                        <i class="fas fa-file-powerpoint"></i>
                        <h3>Visualisation PowerPoint</h3>
                        <p>Les fichiers PowerPoint ne peuvent pas être visualisés directement dans le navigateur.</p>
                        <p><strong>Options disponibles :</strong></p>
                        <ul style="text-align: left; display: inline-block; margin-bottom: 1rem;">
                            <li>Téléchargez le fichier pour l'ouvrir avec PowerPoint</li>
                            <li>Ou utilisez le bouton ci-dessous pour tenter l'ouverture avec Google Docs Viewer</li>
                        </ul>
                        <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                            <button class="viewer-btn download" onclick="TrainingDocumentsModule.downloadDocument(${doc.id})">
                                <i class="fas fa-download"></i> Télécharger
                            </button>
                            <button class="viewer-btn view" onclick="TrainingDocumentsModule.openWithGoogleViewer(${doc.id})">
                                <i class="fas fa-external-link-alt"></i> Ouvrir avec Google Viewer
                            </button>
                        </div>
                    </div>
                `;
            }
        }, 500);

        // Setup download button in footer
        downloadBtn.onclick = () => this.downloadDocument(docId);

        // Setup close buttons
        this.setupViewerCloseHandlers();
    },

    // Open PowerPoint with Google Docs Viewer
    openWithGoogleViewer: function(docId) {
        UIModule.showToast('Pour utiliser Google Docs Viewer, le fichier doit être hébergé sur un serveur web public. Veuillez télécharger le fichier.', 'info');
        this.downloadDocument(docId);
    },

    // Setup viewer close handlers
    setupViewerCloseHandlers: function() {
        const modal = document.getElementById('document-viewer-modal');
        const closeBtn = document.getElementById('close-viewer');
        const closeBtnFooter = document.getElementById('viewer-close-btn');

        const closeViewer = () => {
            if (modal) {
                modal.classList.remove('active');
                modal.setAttribute('aria-hidden', 'true');
            }
        };

        if (closeBtn) {
            closeBtn.onclick = closeViewer;
        }

        if (closeBtnFooter) {
            closeBtnFooter.onclick = closeViewer;
        }

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal && modal.classList.contains('active')) {
                closeViewer();
            }
        });

        // Close on background click
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeViewer();
                }
            });
        }
    },

    // Download document
    downloadDocument: function(docId) {
        const documents = DataManager.getTrainingDocuments();
        const doc = documents.find(d => d.id === docId);

        if (!doc) {
            UIModule.showToast('Document non trouvé', 'error');
            return;
        }

        try {
            // Create download link
            const link = document.createElement('a');
            link.href = doc.fileData;
            link.download = doc.fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Increment download count
            DataManager.incrementDownloadCount(docId);
            this.displayDocuments();

            UIModule.showToast(`Téléchargement de ${doc.fileName}`, 'success');
        } catch (error) {
            console.error('Download error:', error);
            UIModule.showToast('Erreur lors du téléchargement', 'error');
        }
    },

    // Delete document
    deleteDocument: function(docId) {
        if (!SimpleAuth.isLoggedIn()) {
            UIModule.showToast('Vous devez être connecté pour supprimer un document', 'error');
            return;
        }

        const documents = DataManager.getTrainingDocuments();
        const doc = documents.find(d => d.id === docId);

        if (!doc) {
            UIModule.showToast('Document non trouvé', 'error');
            return;
        }

        if (UIModule.showConfirmation(`Êtes-vous sûr de vouloir supprimer le document "${doc.title}" ?`)) {
            const deleted = DataManager.deleteTrainingDocument(docId);

            if (deleted) {
                ActivityModule.addActivity({
                    type: 'training_delete',
                    title: 'Document de formation supprimé',
                    description: doc.title,
                    icon: 'trash',
                    user: SimpleAuth.getCurrentUser()
                });

                UIModule.showToast('Document supprimé avec succès', 'success');
                this.displayDocuments();
            } else {
                UIModule.showToast('Erreur lors de la suppression', 'error');
            }
        }
    },

    // Format file size
    formatFileSize: function(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    },

    // Update UI based on authentication status
    updateUIBasedOnAuth: function() {
        this.setupUploadButton();
        this.displayDocuments();
    }
};

// ===========================================
// TRAINING MODULE (Legacy interactive modules)
// ===========================================
const TrainingModule = {
    content: {
        basics: {
            title: 'Concepts qualité de base',
            content: `
                <h2>Introduction aux concepts qualité</h2>
                <p>La qualité est un concept fondamental dans la production industrielle. Elle garantit que nos produits répondent aux attentes des clients et aux normes établies.</p>

                <h3>Définition de la qualité</h3>
                <p>La qualité peut être définie comme l'ensemble des caractéristiques d'un produit ou d'un service qui lui confèrent l'aptitude à satisfaire des besoins exprimés ou implicites.</p>

                <h3>Les principes clés</h3>
                <ul>
                    <li><strong>Conformité aux spécifications</strong> : Le produit doit respecter les critères définis</li>
                    <li><strong>Traçabilité</strong> : Chaque produit doit pouvoir être suivi tout au long de sa production</li>
                    <li><strong>Amélioration continue</strong> : La qualité est un processus d'amélioration permanente</li>
                    <li><strong>Prévention</strong> : Mieux vaut prévenir les défauts que les corriger</li>
                </ul>

                <h3>Les outils qualité</h3>
                <p>Plusieurs outils sont utilisés pour assurer la qualité :</p>
                <ul>
                    <li>Les contrôles qualité</li>
                    <li>Les audits</li>
                    <li>Les indicateurs de performance</li>
                    <li>Les actions correctives et préventives</li>
                </ul>
            `
        },
        controls: {
            title: 'Contrôles qualité',
            content: `
                <h2>Méthodes et procédures de contrôle qualité</h2>
                <p>Les contrôles qualité sont essentiels pour garantir la conformité des produits.</p>

                <h3>Types de contrôles</h3>
                <ul>
                    <li><strong>Contrôle à la réception</strong> : Vérification des matières premières</li>
                    <li><strong>Contrôle en cours de production</strong> : Vérifications pendant la fabrication</li>
                    <li><strong>Contrôle final</strong> : Vérification avant expédition</li>
                </ul>

                <h3>Procédure de contrôle</h3>
                <ol>
                    <li>Préparer les outils de mesure nécessaires</li>
                    <li>Vérifier l'étalonnage des instruments</li>
                    <li>Effectuer les mesures selon le plan de contrôle</li>
                    <li>Enregistrer les résultats</li>
                    <li>Comparer aux spécifications</li>
                    <li>Prendre les actions appropriées en cas de non-conformité</li>
                </ol>

                <h3>Documentation</h3>
                <p>Tous les résultats de contrôle doivent être documentés et traçables. Utilisez les formulaires prévus à cet effet.</p>
            `
        },
        nonconformity: {
            title: 'Gestion des non-conformités',
            content: `
                <h2>Procédures de gestion des non-conformités</h2>
                <p>Une non-conformité est un écart par rapport aux spécifications ou aux exigences qualité.</p>

                <h3>Identification</h3>
                <p>Les non-conformités peuvent être identifiées à différents stades :</p>
                <ul>
                    <li>Lors des contrôles qualité</li>
                    <li>Par les opérateurs de production</li>
                    <li>Lors des audits</li>
                    <li>Par les retours clients</li>
                </ul>

                <h3>Actions à entreprendre</h3>
                <ol>
                    <li><strong>Isoler</strong> : Mettre de côté le produit non-conforme</li>
                    <li><strong>Documenter</strong> : Remplir une déclaration de rebut ou un rapport de non-conformité</li>
                    <li><strong>Analyser</strong> : Identifier la cause racine</li>
                    <li><strong>Corriger</strong> : Mettre en place des actions correctives</li>
                    <li><strong>Prévenir</strong> : Établir des actions préventives pour éviter la récurrence</li>
                </ol>

                <h3>Utilisation du formulaire</h3>
                <p>Utilisez le formulaire de déclaration de rebut disponible dans la section "Formulaires" pour signaler toute non-conformité.</p>
            `
        },
        analysis: {
            title: 'Analyse des résultats',
            content: `
                <h2>Interprétation des données qualité</h2>
                <p>L'analyse des résultats qualité permet d'identifier les tendances et d'améliorer les processus.</p>

                <h3>Indicateurs clés</h3>
                <ul>
                    <li><strong>Taux de conformité</strong> : Pourcentage de produits conformes</li>
                    <li><strong>Taux de rebut</strong> : Pourcentage de produits rejetés</li>
                    <li><strong>Nombre de non-conformités</strong> : Fréquence des écarts</li>
                    <li><strong>Temps de traitement</strong> : Délai de résolution des problèmes</li>
                </ul>

                <h3>Lecture des graphiques</h3>
                <p>Les graphiques permettent de visualiser l'évolution des indicateurs dans le temps. Une tendance à la hausse du taux de conformité est positive, tandis qu'une augmentation des non-conformités nécessite une attention particulière.</p>

                <h3>Actions d'amélioration</h3>
                <p>Basées sur l'analyse des données, des actions d'amélioration peuvent être mises en place pour optimiser les processus de production.</p>
            `
        }
    },

    init: function() {
        this.setupTrainingButtons();
        this.setupModalClose();
    },

    setupTrainingButtons: function() {
        const trainingButtons = document.querySelectorAll('.training-btn');
        trainingButtons.forEach(button => {
            button.addEventListener('click', () => {
                const trainingId = button.getAttribute('data-training');
                this.openTraining(trainingId);
            });
        });
    },

    setupModalClose: function() {
        const closeButton = document.getElementById('close-training-modal');
        const modal = document.getElementById('training-modal');

        if (closeButton) {
            closeButton.addEventListener('click', () => this.closeTraining());
        }

        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeTraining();
                }
            });
        }

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeTraining();
            }
        });
    },

    openTraining: function(trainingId) {
        const modal = document.getElementById('training-modal');
        const content = document.getElementById('training-content');

        if (this.content[trainingId] && modal && content) {
            content.innerHTML = this.content[trainingId].content;
            modal.classList.add('active');
            modal.setAttribute('aria-hidden', 'false');

            // Focus the close button for accessibility
            const closeButton = document.getElementById('close-training-modal');
            if (closeButton) {
                closeButton.focus();
            }
        }
    },

    closeTraining: function() {
        const modal = document.getElementById('training-modal');
        if (modal) {
            modal.classList.remove('active');
            modal.setAttribute('aria-hidden', 'true');
        }
    }
};

// ===========================================
// AUTHENTICATION MODULE
// ===========================================
const AuthModule = {
    init: function() {
        this.setupAuthButton();
    },

    setupAuthButton: function() {
        const authBtn = document.getElementById('auth-btn');
        if (!authBtn) return;

        this.updateAuthButton();

        authBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (SimpleAuth.isLoggedIn()) {
                if (UIModule.showConfirmation('Êtes-vous sûr de vouloir vous déconnecter ?')) {
                    SimpleAuth.logout();
                    this.updateAuthButton();
                    UIModule.showToast('Déconnecté avec succès', 'success');
                    window.location.reload();
                }
            } else {
                window.location.href = 'login.html';
            }
        });
    },

    updateAuthButton: function() {
        const authBtn = document.getElementById('auth-btn');
        if (!authBtn) return;

        if (SimpleAuth.isLoggedIn()) {
            const username = SimpleAuth.getCurrentUser();
            authBtn.innerHTML = `<i class="fas fa-sign-out-alt"></i><span>Déconnecter (${username})</span>`;
            authBtn.setAttribute('aria-label', `Déconnecter ${username}`);
        } else {
            authBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i><span>S\'identifier</span>';
            authBtn.setAttribute('aria-label', 'S\'identifier');
        }
    }
};

// ===========================================
// APPLICATION INITIALIZATION
// ===========================================
document.addEventListener('DOMContentLoaded', function() {
    // Initialize data manager
    DataManager.init();

    // Initialize all modules
    AuthModule.init();
    NavigationModule.init();
    UIModule.updateDateDisplay();
    UIModule.updateStats();
    ActivityModule.init(); // Initialize recent activities
    ResultsModule.init();
    DocumentsModule.init();
    FormsModule.init();
    TrainingDocumentsModule.init(); // Initialize training documents system
    // TrainingModule.init(); // Removed - legacy interactive modules no longer used
    ChartModule.init();

    console.log('Merlin Gerin Quality Dashboard initialized successfully');
});