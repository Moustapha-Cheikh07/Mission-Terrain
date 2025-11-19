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
