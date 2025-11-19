// Data Manager - Manages all application data
const DataManager = {
    // Storage keys
    STORAGE_KEYS: {
        RESULTS: 'mg_quality_results',
        DOCUMENTS: 'mg_quality_documents',
        REJECTS: 'mg_quality_rejects',
        ACTIVITIES: 'mg_recent_activities',
        QUALITY_CHECKS: 'mg_quality_checks',
        TRAINING_DOCS: 'mg_training_documents',
        VERSION: 'mg_data_version'
    },

    DATA_VERSION: '3.0', // Increment this to force data refresh

    // Check if localStorage is available
    isLocalStorageAvailable: function() {
        try {
            const test = '__localStorage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            console.error('localStorage is not available:', e);
            return false;
        }
    },

    // Safe localStorage getter
    getItem: function(key) {
        try {
            if (!this.isLocalStorageAvailable()) {
                return null;
            }
            return localStorage.getItem(key);
        } catch (e) {
            console.error('Error reading from localStorage:', e);
            return null;
        }
    },

    // Safe localStorage setter
    setItem: function(key, value) {
        try {
            if (!this.isLocalStorageAvailable()) {
                console.error('localStorage not available');
                return false;
            }
            localStorage.setItem(key, value);
            return true;
        } catch (e) {
            if (e.name === 'QuotaExceededError') {
                console.error('localStorage quota exceeded');
                alert('Espace de stockage insuffisant. Veuillez vider le cache de votre navigateur.');
            } else {
                console.error('Error writing to localStorage:', e);
            }
            return false;
        }
    },

    // Initialize data manager
    init: function() {
        try {
            const currentVersion = this.getItem(this.STORAGE_KEYS.VERSION);

            // Load data from localStorage or use sample data
            // Also refresh data if version changed
            if (!this.getItem(this.STORAGE_KEYS.RESULTS) || currentVersion !== this.DATA_VERSION) {
                this.initializeSampleData();
                this.setItem(this.STORAGE_KEYS.VERSION, this.DATA_VERSION);
            }
        } catch (e) {
            console.error('Error initializing DataManager:', e);
            this.initializeSampleData();
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

        // Quality documents now start empty - admins will upload them
        const sampleDocuments = [];

        const sampleRejects = [];

        const sampleActivities = [
            {
                id: 1,
                type: 'quality_check',
                title: 'Contrôle qualité terminé',
                description: 'Ligne de production A',
                timestamp: new Date(today.getTime() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
                icon: 'check',
                user: 'Jean Dupont'
            },
            {
                id: 2,
                type: 'document',
                title: 'Nouveau dossier créé',
                description: 'Dossier #QC-2025-089',
                timestamp: new Date(today.getTime() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
                icon: 'file',
                user: 'Marie Martin'
            },
            {
                id: 3,
                type: 'training',
                title: 'Formation complétée',
                description: 'Concepts qualité de base',
                timestamp: new Date(today.getTime() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
                icon: 'user-graduate',
                user: 'Pierre Bernard'
            }
        ];

        const sampleQualityChecks = [];

        this.setItem(this.STORAGE_KEYS.RESULTS, JSON.stringify(sampleResults));
        this.setItem(this.STORAGE_KEYS.DOCUMENTS, JSON.stringify(sampleDocuments));
        this.setItem(this.STORAGE_KEYS.REJECTS, JSON.stringify(sampleRejects));
        this.setItem(this.STORAGE_KEYS.ACTIVITIES, JSON.stringify(sampleActivities));
        this.setItem(this.STORAGE_KEYS.QUALITY_CHECKS, JSON.stringify(sampleQualityChecks));
    },

    // Get results
    getResults: function() {
        try {
            const data = this.getItem(this.STORAGE_KEYS.RESULTS);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Error parsing results data:', e);
            return [];
        }
    },

    // Get documents
    getDocuments: function() {
        try {
            const data = this.getItem(this.STORAGE_KEYS.DOCUMENTS);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Error parsing documents data:', e);
            return [];
        }
    },

    // Get rejects
    getRejects: function() {
        try {
            const data = this.getItem(this.STORAGE_KEYS.REJECTS);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Error parsing rejects data:', e);
            return [];
        }
    },

    // Add result
    addResult: function(result) {
        try {
            const results = this.getResults();
            results.unshift(result);
            return this.setItem(this.STORAGE_KEYS.RESULTS, JSON.stringify(results));
        } catch (e) {
            console.error('Error adding result:', e);
            return false;
        }
    },

    // Add reject
    addReject: function(reject) {
        try {
            const rejects = this.getRejects();
            rejects.unshift(reject);
            return this.setItem(this.STORAGE_KEYS.REJECTS, JSON.stringify(rejects));
        } catch (e) {
            console.error('Error adding reject:', e);
            return false;
        }
    },

    // Add quality document
    addQualityDocument: function(document) {
        try {
            const documents = this.getDocuments();
            const newDoc = {
                id: Date.now(),
                uploadDate: new Date().toISOString(),
                uploadedBy: SimpleAuth.getCurrentUser(),
                downloads: 0,
                views: 0,
                ...document
            };
            documents.unshift(newDoc);
            return this.setItem(this.STORAGE_KEYS.DOCUMENTS, JSON.stringify(documents));
        } catch (e) {
            console.error('Error adding quality document:', e);
            return false;
        }
    },

    // Delete quality document
    deleteQualityDocument: function(docId) {
        try {
            const documents = this.getDocuments();
            const filtered = documents.filter(doc => doc.id !== docId);
            return this.setItem(this.STORAGE_KEYS.DOCUMENTS, JSON.stringify(filtered));
        } catch (e) {
            console.error('Error deleting quality document:', e);
            return false;
        }
    },

    // Update quality document
    updateQualityDocument: function(docId, updates) {
        try {
            const documents = this.getDocuments();
            const updated = documents.map(doc => {
                if (doc.id === docId) {
                    return { ...doc, ...updates, lastModified: new Date().toISOString() };
                }
                return doc;
            });
            return this.setItem(this.STORAGE_KEYS.DOCUMENTS, JSON.stringify(updated));
        } catch (e) {
            console.error('Error updating quality document:', e);
            return false;
        }
    },

    // Increment quality document download count
    incrementQualityDocumentDownloads: function(docId) {
        try {
            const documents = this.getDocuments();
            const updated = documents.map(doc => {
                if (doc.id === docId) {
                    return { ...doc, downloads: (doc.downloads || 0) + 1 };
                }
                return doc;
            });
            return this.setItem(this.STORAGE_KEYS.DOCUMENTS, JSON.stringify(updated));
        } catch (e) {
            console.error('Error updating download count:', e);
            return false;
        }
    },

    // Increment quality document view count
    incrementQualityDocumentViews: function(docId) {
        try {
            const documents = this.getDocuments();
            const updated = documents.map(doc => {
                if (doc.id === docId) {
                    return { ...doc, views: (doc.views || 0) + 1 };
                }
                return doc;
            });
            return this.setItem(this.STORAGE_KEYS.DOCUMENTS, JSON.stringify(updated));
        } catch (e) {
            console.error('Error updating view count:', e);
            return false;
        }
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

    // Get recent activities
    getActivities: function(limit = 10) {
        try {
            const data = this.getItem(this.STORAGE_KEYS.ACTIVITIES);
            const activities = data ? JSON.parse(data) : [];
            // Sort by timestamp (newest first) and limit
            return activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, limit);
        } catch (e) {
            console.error('Error parsing activities data:', e);
            return [];
        }
    },

    // Add activity
    addActivity: function(activity) {
        try {
            const activities = this.getActivities(100); // Get more for storage
            const newActivity = {
                id: Date.now(),
                timestamp: new Date().toISOString(),
                ...activity
            };
            activities.unshift(newActivity);
            // Keep only last 50 activities
            const limitedActivities = activities.slice(0, 50);
            return this.setItem(this.STORAGE_KEYS.ACTIVITIES, JSON.stringify(limitedActivities));
        } catch (e) {
            console.error('Error adding activity:', e);
            return false;
        }
    },

    // Get quality checks
    getQualityChecks: function() {
        try {
            const data = this.getItem(this.STORAGE_KEYS.QUALITY_CHECKS);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Error parsing quality checks data:', e);
            return [];
        }
    },

    // Add quality check
    addQualityCheck: function(check) {
        try {
            const checks = this.getQualityChecks();
            checks.unshift(check);
            return this.setItem(this.STORAGE_KEYS.QUALITY_CHECKS, JSON.stringify(checks));
        } catch (e) {
            console.error('Error adding quality check:', e);
            return false;
        }
    },

    // Get training documents
    getTrainingDocuments: function() {
        try {
            const data = this.getItem(this.STORAGE_KEYS.TRAINING_DOCS);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Error parsing training documents data:', e);
            return [];
        }
    },

    // Add training document
    addTrainingDocument: function(document) {
        try {
            const documents = this.getTrainingDocuments();
            const newDoc = {
                id: Date.now(),
                uploadDate: new Date().toISOString(),
                uploadedBy: SimpleAuth.getCurrentUser(),
                downloads: 0,
                ...document
            };
            documents.unshift(newDoc);
            return this.setItem(this.STORAGE_KEYS.TRAINING_DOCS, JSON.stringify(documents));
        } catch (e) {
            console.error('Error adding training document:', e);
            return false;
        }
    },

    // Delete training document
    deleteTrainingDocument: function(docId) {
        try {
            const documents = this.getTrainingDocuments();
            const filtered = documents.filter(doc => doc.id !== docId);
            return this.setItem(this.STORAGE_KEYS.TRAINING_DOCS, JSON.stringify(filtered));
        } catch (e) {
            console.error('Error deleting training document:', e);
            return false;
        }
    },

    // Increment document download count
    incrementDownloadCount: function(docId) {
        try {
            const documents = this.getTrainingDocuments();
            const updated = documents.map(doc => {
                if (doc.id === docId) {
                    return { ...doc, downloads: (doc.downloads || 0) + 1 };
                }
                return doc;
            });
            return this.setItem(this.STORAGE_KEYS.TRAINING_DOCS, JSON.stringify(updated));
        } catch (e) {
            console.error('Error updating download count:', e);
            return false;
        }
    },

    // Clear all data (useful for testing)
    clearAll: function() {
        try {
            if (this.isLocalStorageAvailable()) {
                localStorage.removeItem(this.STORAGE_KEYS.RESULTS);
                localStorage.removeItem(this.STORAGE_KEYS.DOCUMENTS);
                localStorage.removeItem(this.STORAGE_KEYS.REJECTS);
                localStorage.removeItem(this.STORAGE_KEYS.ACTIVITIES);
                localStorage.removeItem(this.STORAGE_KEYS.QUALITY_CHECKS);
                localStorage.removeItem(this.STORAGE_KEYS.TRAINING_DOCS);
                this.initializeSampleData();
                return true;
            }
            return false;
        } catch (e) {
            console.error('Error clearing data:', e);
            return false;
        }
    }
};
