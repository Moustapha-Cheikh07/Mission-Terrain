// Google Sheets Integration Module
const GoogleSheetsModule = {
    // Configuration
    config: {
        apiKey: 'AIzaSyBbmXLynxJbYr4RTXjHa30yyd6AAbw2d_0', // Votre clé API Google
        spreadsheetId: '1H3PlSQJnUF1QIWHIUf4oEA4N8JtL83XkPxdeOQxe0uo', // ID de votre spreadsheet (SEULEMENT L'ID, PAS L'URL!)
        range: 'CONFIRMATION BRIDGE!A:AT', // Plage de données avec tous les colonnes (A à AT = 46 colonnes)
        refreshHour: 8, // Heure de rafraîchissement automatique (8h du matin)
        autoRefresh: false
    },

    isInitialized: false,
    isConnected: false,
    lastRefresh: null,
    refreshTimer: null,
    cachedData: [],

    // Initialize the module
    init: function() {
        console.log('Initializing Google Sheets module...');

        // Load saved configuration
        this.loadConfiguration();

        // Setup UI
        this.setupUI();

        // If API key is configured in code, save it and auto-connect
        if (this.config.apiKey && this.config.apiKey !== '' && this.config.spreadsheetId) {
            console.log('Configuration détectée dans le code, sauvegarde automatique...');
            this.saveConfiguration();
            this.updateUIStatus();

            // Auto-connect immediately for faster loading
            setTimeout(() => {
                console.log('Connexion automatique à Google Sheets...');
                this.connect();
            }, 100);
        }

        this.isInitialized = true;
        console.log('Google Sheets module initialized');
    },

    // Load configuration from localStorage
    loadConfiguration: function() {
        const savedConfig = localStorage.getItem('googleSheetsConfig');
        if (savedConfig) {
            try {
                const parsed = JSON.parse(savedConfig);
                this.config = { ...this.config, ...parsed };
                console.log('Configuration loaded from localStorage');
            } catch (error) {
                console.error('Error loading configuration:', error);
            }
        }

        // Load auto-refresh preference
        const autoRefresh = localStorage.getItem('googleSheetsAutoRefresh');
        if (autoRefresh === 'true') {
            this.config.autoRefresh = true;
        }
    },

    // Save configuration to localStorage
    saveConfiguration: function() {
        try {
            const configToSave = {
                apiKey: this.config.apiKey,
                spreadsheetId: this.config.spreadsheetId,
                range: this.config.range,
                refreshHour: this.config.refreshHour
            };
            localStorage.setItem('googleSheetsConfig', JSON.stringify(configToSave));
            localStorage.setItem('googleSheetsAutoRefresh', this.config.autoRefresh);
            console.log('Configuration saved');
        } catch (error) {
            console.error('Error saving configuration:', error);
        }
    },

    // Setup UI elements
    setupUI: function() {
        const configBtn = document.getElementById('google-sheets-config-btn');
        const connectBtn = document.getElementById('google-sheets-connect-btn');
        const refreshBtn = document.getElementById('google-sheets-refresh-btn');
        const autoRefreshCheckbox = document.getElementById('google-sheets-auto-refresh');
        const saveConfigBtn = document.getElementById('save-google-sheets-config');
        const cancelConfigBtn = document.getElementById('cancel-google-sheets-config');

        // Configuration button
        if (configBtn) {
            configBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.showConfigModal();
            });
        }

        // Connect button
        if (connectBtn) {
            connectBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.connect();
            });
        }

        // Refresh button
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();

                // Show loading in RejectAnalysis if available
                if (typeof RejectAnalysis !== 'undefined' && RejectAnalysis.showLoading) {
                    RejectAnalysis.showLoading();
                }

                try {
                    await this.fetchData();
                    // Hide loading after successful refresh
                    if (typeof RejectAnalysis !== 'undefined' && RejectAnalysis.hideLoading) {
                        RejectAnalysis.hideLoading();
                    }
                    this.showMessage('Données actualisées avec succès', 'success');
                } catch (error) {
                    console.error('Refresh error:', error);
                    if (typeof RejectAnalysis !== 'undefined' && RejectAnalysis.hideLoading) {
                        RejectAnalysis.hideLoading();
                    }
                }
            });
        }

        // Auto-refresh checkbox
        if (autoRefreshCheckbox) {
            autoRefreshCheckbox.checked = this.config.autoRefresh;
            autoRefreshCheckbox.addEventListener('change', (e) => {
                e.stopPropagation();
                this.config.autoRefresh = e.target.checked;
                this.saveConfiguration();

                if (this.config.autoRefresh) {
                    this.startAutoRefresh();
                } else {
                    this.stopAutoRefresh();
                }
            });
        }

        // Save configuration
        if (saveConfigBtn) {
            saveConfigBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.saveConfigFromModal();
            });
        }

        // Cancel configuration
        if (cancelConfigBtn) {
            cancelConfigBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.hideConfigModal();
            });
        }

        // Update UI with saved configuration
        this.updateUIStatus();
    },

    // Show configuration modal
    showConfigModal: function() {
        const modal = document.getElementById('google-sheets-config-modal');
        if (modal) {
            // Fill current values
            const apiKeyInput = document.getElementById('google-sheets-api-key');
            const spreadsheetIdInput = document.getElementById('google-sheets-spreadsheet-id');
            const rangeInput = document.getElementById('google-sheets-range');

            if (apiKeyInput) apiKeyInput.value = this.config.apiKey || '';
            if (spreadsheetIdInput) spreadsheetIdInput.value = this.config.spreadsheetId || '';
            if (rangeInput) rangeInput.value = this.config.range || 'CONFIRMATION BRIDGE!A:AT';

            modal.style.display = 'flex';
        }
    },

    // Hide configuration modal
    hideConfigModal: function() {
        const modal = document.getElementById('google-sheets-config-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    },

    // Save configuration from modal
    saveConfigFromModal: function() {
        const apiKeyInput = document.getElementById('google-sheets-api-key');
        const spreadsheetIdInput = document.getElementById('google-sheets-spreadsheet-id');
        const rangeInput = document.getElementById('google-sheets-range');

        const apiKey = apiKeyInput?.value.trim();
        const spreadsheetId = spreadsheetIdInput?.value.trim();
        const range = rangeInput?.value.trim() || 'CONFIRMATION BRIDGE!A:AT';

        // Validation
        if (!apiKey || !spreadsheetId) {
            this.showMessage('Veuillez remplir la clé API et l\'ID du spreadsheet', 'error');
            return;
        }

        // Extract spreadsheet ID from URL if needed
        let extractedId = spreadsheetId;
        if (spreadsheetId.includes('docs.google.com/spreadsheets')) {
            const match = spreadsheetId.match(/\/d\/([a-zA-Z0-9-_]+)/);
            if (match) {
                extractedId = match[1];
            }
        }

        this.config.apiKey = apiKey;
        this.config.spreadsheetId = extractedId;
        this.config.range = range;

        this.saveConfiguration();
        this.hideConfigModal();
        this.showMessage('Configuration sauvegardée avec succès', 'success');
        this.updateUIStatus();

        // Try to connect
        this.connect();
    },

    // Connect to Google Sheets
    connect: async function() {
        if (!this.config.apiKey || !this.config.spreadsheetId) {
            this.showMessage('Configuration manquante. Veuillez configurer l\'API.', 'warning');
            this.showConfigModal();
            return;
        }

        // Connexion silencieuse - le chargement est géré par l'indicateur visuel

        try {
            await this.fetchData();
            this.isConnected = true;
            this.updateUIStatus();

            // Start auto-refresh if enabled
            if (this.config.autoRefresh) {
                this.startAutoRefresh();
            }
        } catch (error) {
            this.isConnected = false;
            this.updateUIStatus();
            console.error('Connection error:', error);
        }
    },

    // Fetch data from Google Sheets
    fetchData: async function() {
        if (!this.config.apiKey || !this.config.spreadsheetId) {
            throw new Error('Configuration manquante');
        }

        const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.config.spreadsheetId}/values/${this.config.range}?key=${this.config.apiKey}`;

        try {
            // Message de chargement géré par l'indicateur visuel dans RejectAnalysis
            const response = await fetch(url);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || 'Erreur lors de la récupération des données');
            }

            const data = await response.json();

            if (!data.values || data.values.length === 0) {
                throw new Error('Aucune donnée trouvée dans le spreadsheet');
            }

            // Convert to reject format
            const rejects = this.convertSheetsDataToRejects(data.values);

            this.cachedData = rejects;
            this.lastRefresh = new Date();

            // Save to localStorage
            localStorage.setItem('googleSheetsData', JSON.stringify(rejects));
            localStorage.setItem('googleSheetsLastRefresh', this.lastRefresh.toISOString());

            this.updateUIStatus();

            // Trigger data reload in RejectAnalysis
            if (typeof RejectAnalysis !== 'undefined') {
                RejectAnalysis.loadRejectData();
            }

            // Show success message only after display is updated
            setTimeout(() => {
                this.showMessage(`${rejects.length} rebuts chargés avec succès`, 'success');
            }, 300);

            return rejects;
        } catch (error) {
            console.error('Error fetching data:', error);
            this.showMessage('Erreur: ' + error.message, 'error');
            throw error;
        }
    },

    // Convert Google Sheets data to reject format
    convertSheetsDataToRejects: function(rows) {
        if (!rows || rows.length < 2) {
            return [];
        }

        // First row is headers
        const headers = rows[0].map(h => h ? h.toString().trim().toLowerCase() : '');
        const rejects = [];

        console.log('Headers found:', headers);

        // Find column indexes - Support both standard and SAP/ERP column names
        const getColIndex = (names) => {
            for (let name of names) {
                const index = headers.indexOf(name.toLowerCase());
                if (index !== -1) {
                    console.log(`Found column "${name}" at index ${index}`);
                    return index;
                }
            }
            return -1;
        };

        // Map columns with SAP/ERP names support - Updated with exact column names
        const dateCol = getColIndex([
            'confirmation date',
            'confirmation_date',
            'date',
            'Date',
            'CONFIRMATION DATE'
        ]);

        const machineCol = getColIndex([
            'workcenter',
            'work center',
            'WORKCENTER',
            'machine',
            'Machine'
        ]);

        const materialCol = getColIndex([
            'material',
            'MATERIAL',
            'matériel',
            'code matériel',
            'materiel',
            'material plant',
            'MATERIAL PLANT'
        ]);

        const descCol = getColIndex([
            'designation',
            'DESIGNATION',
            'material description',
            'operation short text',
            'OPERATION SHORT TEXT',
            'description',
            'Description'
        ]);

        const qtyCol = getColIndex([
            'qte scrap',
            'QTE SCRAP',
            'confirmed scrap',
            'CONFIRMED SCRAP',
            'quantité',
            'quantity',
            'quantite',
            'quantité de rebut'
        ]);

        const priceCol = getColIndex([
            'prix unit',
            'Prix UNIT',
            'prix_unit',
            'prix unitaire',
            'unit price',
            'unitprice'
        ]);

        const costCol = getColIndex([
            'coût total',
            'total cost',
            'cout total',
            'totalcost'
        ]);

        const reasonCol = getColIndex([
            'category',
            'CATEGORY',
            'raison',
            'reason'
        ]);

        const operatorCol = getColIndex([
            'production scheduler',
            'PRODUCTION SCHEDULER',
            'opérateur',
            'operator',
            'operateur'
        ]);

        const workcenterCol = getColIndex([
            'workcenter',
            'WORKCENTER',
            'work center',
            'centre'
        ]);

        console.log('Column mapping:', {
            date: dateCol,
            machine: machineCol,
            material: materialCol,
            description: descCol,
            quantity: qtyCol,
            price: priceCol
        });

        // Process data rows
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];

            try {
                // Parse price - handle both comma and dot as decimal separator
                let unitPrice = 0;
                if (row[priceCol]) {
                    // Replace comma with dot for decimal numbers
                    const priceStr = String(row[priceCol]).replace(',', '.');
                    unitPrice = parseFloat(priceStr) || 0;
                }

                // Parse total cost - handle comma separator
                let totalCost = 0;
                if (row[costCol]) {
                    const costStr = String(row[costCol]).replace(',', '.');
                    totalCost = parseFloat(costStr) || 0;
                }

                const reject = {
                    date: this.parseDate(row[dateCol] || ''),
                    machine: row[machineCol] || '',
                    material: row[materialCol] || '',
                    description: row[descCol] || '',
                    scrapQuantity: parseInt(row[qtyCol]) || 0,
                    unitPrice: unitPrice,
                    totalCost: totalCost,
                    reason: this.mapReason(row[reasonCol] || 'other'),
                    operator: row[operatorCol] || 'Google Sheets',
                    workcenter: row[workcenterCol] || ''
                };

                // Calculate total cost if not provided
                if (!reject.totalCost && reject.scrapQuantity && reject.unitPrice) {
                    reject.totalCost = reject.scrapQuantity * reject.unitPrice;
                }

                // Validate required fields
                if (reject.date && reject.machine && reject.scrapQuantity > 0) {
                    rejects.push(reject);
                } else {
                    console.warn(`Ligne ${i + 1} ignorée (données manquantes)`, row);
                }
            } catch (error) {
                console.error(`Erreur ligne ${i + 1}:`, error, row);
            }
        }

        console.log(`Converted ${rejects.length} rejects from ${rows.length - 1} rows`);
        return rejects;
    },

    // Parse date from various formats
    parseDate: function(dateStr) {
        if (!dateStr) return null;

        // Convert to string if number
        const dateString = dateStr.toString().trim();

        // Already in YYYY-MM-DD format
        if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
            return dateString;
        }

        // SAP format: YYYYMMDD (8 digits)
        if (dateString.match(/^\d{8}$/)) {
            const year = dateString.substring(0, 4);
            const month = dateString.substring(4, 6);
            const day = dateString.substring(6, 8);
            return `${year}-${month}-${day}`;
        }

        // DD/MM/YYYY format
        if (dateString.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
            const parts = dateString.split('/');
            return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }

        // YYYY/MM/DD format
        if (dateString.match(/^\d{4}\/\d{2}\/\d{2}$/)) {
            return dateString.replace(/\//g, '-');
        }

        // Try parsing as Date
        try {
            const date = new Date(dateString);
            if (!isNaN(date.getTime())) {
                return date.toISOString().split('T')[0];
            }
        } catch (e) {
            console.error('Invalid date:', dateStr);
        }

        return null;
    },

    // Map reason to internal format
    mapReason: function(reason) {
        const reasonMap = {
            'dimension': 'dimension',
            'dimensionnelle': 'dimension',
            'aspect': 'appearance',
            'appearance': 'appearance',
            'fonction': 'function',
            'function': 'function',
            'fonctionnel': 'function',
            'matière': 'material',
            'material': 'material',
            'matiere': 'material',
            'autre': 'other',
            'other': 'other'
        };

        const lowerReason = (reason || '').toLowerCase();
        return reasonMap[lowerReason] || 'other';
    },

    // Calculate milliseconds until next refresh at 8h
    getMillisecondsUntilNextRefresh: function() {
        const now = new Date();
        const next8am = new Date();

        // Set to today at 8:00:00
        next8am.setHours(this.config.refreshHour, 0, 0, 0);

        // If it's already past 8am today, schedule for tomorrow 8am
        if (now >= next8am) {
            next8am.setDate(next8am.getDate() + 1);
        }

        const msUntilRefresh = next8am - now;
        console.log(`Next refresh scheduled at: ${next8am.toLocaleString('fr-FR')}`);
        return msUntilRefresh;
    },

    // Start auto-refresh - Daily at 8h
    startAutoRefresh: function() {
        this.stopAutoRefresh(); // Clear any existing timer

        if (this.config.autoRefresh && this.isConnected) {
            const scheduleNext = () => {
                const msUntilRefresh = this.getMillisecondsUntilNextRefresh();
                console.log(`Auto-refresh activé : prochaine mise à jour dans ${Math.round(msUntilRefresh / 1000 / 60 / 60)} heures`);

                this.refreshTimer = setTimeout(() => {
                    console.log('Auto-refreshing data at 8h...');
                    this.fetchData();
                    // Schedule next refresh for tomorrow 8h
                    scheduleNext();
                }, msUntilRefresh);
            };

            scheduleNext();
        }
    },

    // Stop auto-refresh
    stopAutoRefresh: function() {
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
            this.refreshTimer = null;
            console.log('Auto-refresh stopped');
        }
    },

    // Update UI status
    updateUIStatus: function() {
        const statusEl = document.getElementById('google-sheets-status');
        if (!statusEl) return;

        if (this.isConnected) {
            const lastRefreshStr = this.lastRefresh ?
                this.lastRefresh.toLocaleString('fr-FR') :
                'Jamais';

            statusEl.innerHTML = `
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <i class="fas fa-check-circle" style="color: #10b981;"></i>
                    <div>
                        <strong>Connecté à Google Sheets</strong>
                        <br><small>Dernière mise à jour: ${lastRefreshStr}</small>
                        <br><small>${this.cachedData.length} rebuts chargés</small>
                    </div>
                </div>
            `;
            statusEl.className = 'alert alert-success';
            statusEl.style.display = 'block';
        } else if (this.config.apiKey && this.config.spreadsheetId) {
            statusEl.innerHTML = `
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <i class="fas fa-exclamation-triangle" style="color: #f59e0b;"></i>
                    <strong>Configuré mais non connecté</strong>
                </div>
            `;
            statusEl.className = 'alert alert-warning';
            statusEl.style.display = 'block';
        } else {
            statusEl.innerHTML = `
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <i class="fas fa-info-circle" style="color: #3b82f6;"></i>
                    <strong>Configuration requise</strong>
                </div>
            `;
            statusEl.className = 'alert alert-info';
            statusEl.style.display = 'block';
        }
    },

    // Get cached data
    getData: function() {
        return this.cachedData;
    },

    // Show message
    showMessage: function(message, type = 'info') {
        const toast = document.getElementById('message-toast');
        if (toast) {
            toast.textContent = message;
            toast.className = 'toast show ' + type;
            setTimeout(() => {
                toast.className = 'toast';
            }, 4000);
        }
    }
};
