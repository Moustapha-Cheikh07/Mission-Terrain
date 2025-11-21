// Reject Analysis Module (VERSION FINALE CORRIGÉE)
const RejectAnalysis = {

    currentFilters: {
        machine: "all",
        startDate: null,
        endDate: null
    },

    chart: null,

    init: function () {
        console.log("RejectAnalysis initialisation...");
        this.setupEventListeners();

        // Default: last 30 days
        const today = new Date();
        const monthAgo = new Date(today);
        monthAgo.setDate(today.getDate() - 30);

        this.currentFilters.startDate = monthAgo.toISOString().slice(0, 10);
        this.currentFilters.endDate = today.toISOString().slice(0, 10);

        document.getElementById("reject-start-date").value = this.currentFilters.startDate;
        document.getElementById("reject-end-date").value = this.currentFilters.endDate;

        // Show loading indicator
        this.showLoading();

        // Wait for Google Sheets to be ready, then load data
        this.waitForDataAndLoad();
    },

    // Show loading indicator
    showLoading: function() {
        const loadingEl = document.getElementById("rejects-loading");
        const statsGrid = document.getElementById("reject-stats-grid");
        const container = document.querySelector(".rejects-container");

        if (loadingEl) loadingEl.style.display = "flex";
        if (statsGrid) statsGrid.style.opacity = "0.3";
        if (container) container.style.opacity = "0.3";
    },

    // Hide loading indicator
    hideLoading: function() {
        const loadingEl = document.getElementById("rejects-loading");
        const statsGrid = document.getElementById("reject-stats-grid");
        const container = document.querySelector(".rejects-container");

        if (loadingEl) loadingEl.style.display = "none";
        if (statsGrid) statsGrid.style.opacity = "1";
        if (container) container.style.opacity = "1";
    },

    // Wait for Google Sheets data to be available
    waitForDataAndLoad: function() {
        const maxAttempts = 30; // 15 seconds max wait time
        let attempts = 0;

        const checkAndLoad = () => {
            attempts++;

            if (GoogleSheetsModule?.isConnected && GoogleSheetsModule.getData().length > 0) {
                console.log("Google Sheets data ready, loading...");
                this.hideLoading();
                this.loadRejectData();
            } else if (attempts >= maxAttempts) {
                console.error("Timeout waiting for Google Sheets data");
                this.hideLoading();
                // this.showNoDataMessage(); // Message désactivé par l'utilisateur
            } else {
                console.log(`Waiting for Google Sheets data... (attempt ${attempts}/${maxAttempts})`);
                setTimeout(checkAndLoad, 500);
            }
        };

        checkAndLoad();
    },

    // Show message when no data is available
    showNoDataMessage: function() {
        const statusEl = document.getElementById("google-sheets-status");
        if (statusEl) {
            statusEl.innerHTML = `
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <i class="fas fa-exclamation-circle" style="color: #f59e0b;"></i>
                    <strong>Aucune donnée disponible. Veuillez vous connecter à Google Sheets.</strong>
                </div>
            `;
            statusEl.className = 'alert alert-warning';
            statusEl.style.display = 'block';
        }
    },

    // EVENT LISTENERS
    setupEventListeners: function () {
        // Fonction pour appliquer les filtres automatiquement
        const applyFilters = () => {
            this.currentFilters.machine = document.getElementById("reject-machine-filter").value;
            this.currentFilters.startDate = document.getElementById("reject-start-date").value;
            this.currentFilters.endDate = document.getElementById("reject-end-date").value;
            this.loadRejectData();
        };

        // Filtrage automatique sur changement de machine
        document.getElementById("reject-machine-filter")?.addEventListener("change", applyFilters);

        // Filtrage automatique sur changement de date de début
        document.getElementById("reject-start-date")?.addEventListener("change", applyFilters);

        // Filtrage automatique sur changement de date de fin
        document.getElementById("reject-end-date")?.addEventListener("change", applyFilters);

        // Garder le bouton filtrer pour compatibilité (optionnel)
        document.getElementById("apply-reject-filters")?.addEventListener("click", applyFilters);
    },

    // LOAD DATA
    loadRejectData: function () {
        let rejects = [];

        if (GoogleSheetsModule?.isConnected) {
            console.log("Loading from Google Sheets...");
            rejects = GoogleSheetsModule.getData();
        } else {
            console.error("Google Sheets NOT connected");
            this.hideLoading();
            return;
        }

        console.log("Total rejects:", rejects.length);

        const filtered = this.filterRejects(rejects);

        console.log("Filtered rejects:", filtered.length);

        this.updateStatistics(filtered);
        this.displayMachineCostsTable(filtered);
        this.displayDetailedRejectsTable(filtered);
        this.renderRejectChart(filtered);

        // Ensure loading is hidden after data is displayed
        this.hideLoading();
    },

    // FILTERING
    filterRejects: function (rejects) {
        return rejects.filter(r => {
            if (!r.date || !r.machine) return false;

            // Filtrer uniquement les machines MS (machines spéciales)
            if (!r.machine.includes("MS")) {
                return false;
            }

            // Machine
            if (this.currentFilters.machine !== "all" &&
                r.machine !== this.currentFilters.machine) {
                return false;
            }

            // Date
            const d = new Date(r.date);
            const dStart = new Date(this.currentFilters.startDate);
            const dEnd = new Date(this.currentFilters.endDate);

            if (d < dStart || d > dEnd) return false;

            return true;
        });
    },

    // STAT CARDS
    updateStatistics: function (rejects) {
        const totalCost = rejects.reduce((sum, r) => sum + r.totalCost, 0);
        const totalQty = rejects.reduce((sum, r) => sum + r.scrapQuantity, 0);

        const costByMachine = {};
        rejects.forEach(r => {
            costByMachine[r.machine] = (costByMachine[r.machine] || 0) + r.totalCost;
        });

        let mostExpensive = "-";
        if (Object.keys(costByMachine).length > 0) {
            mostExpensive = Object.entries(costByMachine)
                .sort((a, b) => b[1] - a[1])[0][0];
        }

        document.getElementById("total-reject-cost").textContent = totalCost.toFixed(2) + "€";
        document.getElementById("total-reject-quantity").textContent = totalQty;
        document.getElementById("most-expensive-machine").textContent = mostExpensive;
        document.getElementById("average-reject-cost").textContent =
            (rejects.length ? totalCost / rejects.length : 0).toFixed(2) + "€";
    },

    // MACHINE COST TABLE
    displayMachineCostsTable: function (rejects) {
        const tbody = document.getElementById("machine-costs-table-body");
        if (!tbody) return;

        if (rejects.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5">Aucun rebut trouvé</td></tr>`;
            return;
        }

        const machines = {};

        rejects.forEach(r => {
            if (!machines[r.machine]) {
                machines[r.machine] = {
                    qty: 0,
                    cost: 0,
                    prices: []
                };
            }
            machines[r.machine].qty += r.scrapQuantity;
            machines[r.machine].cost += r.totalCost;
            machines[r.machine].prices.push(r.unitPrice);
        });

        const totalCost = Object.values(machines).reduce((s, m) => s + m.cost, 0);

        let html = "";

        Object.keys(machines).sort((a, b) => machines[b].cost - machines[a].cost)
            .forEach(machine => {
                const m = machines[machine];
                const avgPrice = m.prices.reduce((a, b) => a + b, 0) / m.prices.length;
                const pct = (m.cost / totalCost) * 100;

                html += `
                <tr>
                    <td><b>${machine}</b></td>
                    <td>${m.qty}</td>
                    <td>${avgPrice.toFixed(5)}€</td>
                    <td>${m.cost.toFixed(2)}€</td>
                    <td>
                        <div class="percentage-bar">
                            <div class="percentage-fill" style="width:${pct}%;"></div>
                            <span>${pct.toFixed(1)}%</span>
                        </div>
                    </td>
                </tr>`;
            });

        tbody.innerHTML = html;
    },

    // DETAIL TABLE
    displayDetailedRejectsTable: function (rejects) {
        const tbody = document.getElementById("rejects-detail-table-body");

        if (!tbody) return;

        if (rejects.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8">Aucun rebut</td></tr>`;
            return;
        }

        let html = "";

        rejects.sort((a, b) => new Date(b.date) - new Date(a.date))
            .forEach(r => {
                html += `
                <tr>
                    <td>${new Date(r.date).toLocaleDateString("fr-FR")}</td>
                    <td><b>${r.machine}</b></td>
                    <td>${r.material}</td>
                    <td>${r.description}</td>
                    <td>${r.scrapQuantity}</td>
                    <td>${r.unitPrice.toFixed(5)}€</td>
                    <td>${r.totalCost.toFixed(2)}€</td>
                    <td>Autre</td>
                </tr>`;
            });

        tbody.innerHTML = html;
    },

    // CHART (Évolution des pertes)
    renderRejectChart: function (rejects) {
        const canvas = document.getElementById("reject-cost-chart");
        if (!canvas) return;

        if (this.chart) {
            this.chart.destroy();
        }

        if (rejects.length === 0) {
            this.chart = new Chart(canvas, { type: "line", data: { labels: [], datasets: [] } });
            return;
        }

        const grouped = {};

        rejects.forEach(r => {
            if (!grouped[r.date]) grouped[r.date] = {};
            if (!grouped[r.date][r.machine]) grouped[r.date][r.machine] = 0;
            grouped[r.date][r.machine] += r.totalCost;
        });

        const dates = Object.keys(grouped).sort();
        const machines = [...new Set(rejects.map(r => r.machine))];

        const datasets = machines.map(machine => ({
            label: machine,
            data: dates.map(d => grouped[d][machine] || 0),
            borderWidth: 2,
            fill: false
        }));

        this.chart = new Chart(canvas, {
            type: "line",
            data: {
                labels: dates,
                datasets: datasets
            },
            options: {
                responsive: true,
                plugins: { legend: { position: "bottom" } }
            }
        });
    }
};

// Auto-init
document.addEventListener("DOMContentLoaded", () => RejectAnalysis.init());
