// Data Manager - Manages all application data
const DataManager = {
    // Storage keys
    STORAGE_KEYS: {
        RESULTS: 'mg_quality_results',
        DOCUMENTS: 'mg_quality_documents',
        REJECTS: 'mg_quality_rejects',
        VERSION: 'mg_data_version'
    },

    DATA_VERSION: '2.0', // Increment this to force data refresh

    // Initialize data manager
    init: function() {
        const currentVersion = localStorage.getItem(this.STORAGE_KEYS.VERSION);

        // Load data from localStorage or use sample data
        // Also refresh data if version changed
        if (!localStorage.getItem(this.STORAGE_KEYS.RESULTS) || currentVersion !== this.DATA_VERSION) {
            this.initializeSampleData();
            localStorage.setItem(this.STORAGE_KEYS.VERSION, this.DATA_VERSION);
        }
    },

    // Initialize with sample data
    initializeSampleData: function() {
        // Generate dates relative to today
        const today = new Date();
        const formatDate = (daysAgo) => {
            const date = new Date(today);
            date.setDate(today.getDate() - daysAgo);
            return date.toISOString().split('T')[0];
        };

        const sampleResults = [
            { date: formatDate(0), line: 'A', reference: 'MG-2025-001', status: 'success', operator: 'Jean Dupont' },
            { date: formatDate(0), line: 'B', reference: 'MG-2025-002', status: 'success', operator: 'Marie Martin' },
            { date: formatDate(1), line: 'C', reference: 'MG-2025-003', status: 'warning', operator: 'Pierre Bernard' },
            { date: formatDate(1), line: 'A', reference: 'MG-2025-004', status: 'success', operator: 'Sophie Petit' },
            { date: formatDate(2), line: 'D', reference: 'MG-2025-005', status: 'danger', operator: 'Luc Dubois' },
            { date: formatDate(2), line: 'B', reference: 'MG-2025-006', status: 'success', operator: 'Anne Moreau' },
            { date: formatDate(3), line: 'C', reference: 'MG-2025-007', status: 'success', operator: 'Thomas Laurent' },
            { date: formatDate(3), line: 'A', reference: 'MG-2025-008', status: 'warning', operator: 'Julie Simon' },
            { date: formatDate(4), line: 'B', reference: 'MG-2025-009', status: 'success', operator: 'Marc Michel' },
            { date: formatDate(5), line: 'D', reference: 'MG-2025-010', status: 'success', operator: 'Claire Lefevre' },
            { date: formatDate(6), line: 'A', reference: 'MG-2025-011', status: 'danger', operator: 'Paul Leroy' },
            { date: formatDate(7), line: 'C', reference: 'MG-2025-012', status: 'success', operator: 'Emma Roux' }
        ];

        const sampleDocuments = [
            { id: 'QC-2025-089', title: 'Contrôle qualité ligne A', date: formatDate(0), type: 'Contrôle' },
            { id: 'QC-2025-088', title: 'Audit production ligne B', date: formatDate(1), type: 'Audit' },
            { id: 'QC-2025-087', title: 'Rapport non-conformité', date: formatDate(2), type: 'NC' },
            { id: 'QC-2025-086', title: 'Validation process ligne C', date: formatDate(3), type: 'Validation' },
            { id: 'QC-2025-085', title: 'Contrôle qualité ligne D', date: formatDate(4), type: 'Contrôle' },
            { id: 'QC-2025-084', title: 'Certificat de conformité', date: formatDate(5), type: 'Certificat' },
            { id: 'QC-2025-083', title: 'Analyse défauts matière', date: formatDate(6), type: 'Analyse' },
            { id: 'QC-2025-082', title: 'Plan de contrôle Q4', date: formatDate(7), type: 'Plan' },
            { id: 'QC-2025-081', title: 'Rapport mensuel qualité', date: formatDate(8), type: 'Rapport' }
        ];

        const sampleRejects = [];

        localStorage.setItem(this.STORAGE_KEYS.RESULTS, JSON.stringify(sampleResults));
        localStorage.setItem(this.STORAGE_KEYS.DOCUMENTS, JSON.stringify(sampleDocuments));
        localStorage.setItem(this.STORAGE_KEYS.REJECTS, JSON.stringify(sampleRejects));
    },

    // Get results
    getResults: function() {
        const data = localStorage.getItem(this.STORAGE_KEYS.RESULTS);
        return data ? JSON.parse(data) : [];
    },

    // Get documents
    getDocuments: function() {
        const data = localStorage.getItem(this.STORAGE_KEYS.DOCUMENTS);
        return data ? JSON.parse(data) : [];
    },

    // Get rejects
    getRejects: function() {
        const data = localStorage.getItem(this.STORAGE_KEYS.REJECTS);
        return data ? JSON.parse(data) : [];
    },

    // Add result
    addResult: function(result) {
        const results = this.getResults();
        results.unshift(result);
        localStorage.setItem(this.STORAGE_KEYS.RESULTS, JSON.stringify(results));
    },

    // Add reject
    addReject: function(reject) {
        const rejects = this.getRejects();
        rejects.unshift(reject);
        localStorage.setItem(this.STORAGE_KEYS.REJECTS, JSON.stringify(rejects));
    },

    // Get statistics
    getStats: function() {
        const results = this.getResults();
        const documents = this.getDocuments();

        const totalControls = results.length;
        const conformControls = results.filter(r => r.status === 'success').length;
        const warningControls = results.filter(r => r.status === 'warning').length;
        const nonConformControls = results.filter(r => r.status === 'danger').length;

        const conformityRate = totalControls > 0
            ? ((conformControls / totalControls) * 100).toFixed(1)
            : 0;

        return {
            conformityRate: conformityRate,
            totalControls: totalControls,
            conformControls: conformControls,
            warningControls: warningControls,
            nonConformControls: nonConformControls,
            totalDocuments: documents.length
        };
    },

    // Clear all data (useful for testing)
    clearAll: function() {
        localStorage.removeItem(this.STORAGE_KEYS.RESULTS);
        localStorage.removeItem(this.STORAGE_KEYS.DOCUMENTS);
        localStorage.removeItem(this.STORAGE_KEYS.REJECTS);
        this.initializeSampleData();
    }
};