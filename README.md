# Dashboard Qualité - Merlin Gerin

Application web interactive pour la gestion de la qualité destinée aux opérateurs de production.

## 🎯 Fonctionnalités

### Tableau de bord
- Vue d'ensemble des indicateurs qualité
- Statistiques en temps réel (taux de conformité, contrôles réalisés, etc.)
- Actions rapides pour accéder aux fonctionnalités principales
- Activité récente

### Résultats Qualité
- Graphique interactif d'évolution du taux de conformité
- Tableau détaillé des contrôles qualité
- Filtres avancés (période, ligne de production, statut)
- Tooltips au survol des données

### Dossiers Qualité
- Recherche de dossiers qualité
- Accès rapide aux documents
- Affichage par cartes avec métadonnées

### Formulaires
- Contrôle qualité terminé
- Déclaration de rebut en ligne
- Formulaires complets avec validation
- Authentification requise pour soumettre

### Formation Professionnelle
- Système de gestion de documents de formation
- Upload de fichiers (PDF, PPT, PPTX)
- Visualisation et téléchargement de documents
- Catégorisation par thèmes
- Gestion des documents (admin uniquement)

### Authentification
- Système de login sécurisé
- Gestion de sessions (24h)
- Rôles utilisateurs (admin/user)
- Contrôle d'accès aux fonctionnalités

## 🚀 Installation et Utilisation

### Prérequis
- Navigateur web moderne (Chrome, Firefox, Edge, Safari)
- Aucune installation serveur nécessaire

### Démarrage Rapide
1. **Ouvrir l'application**
   - Double-cliquer sur `index.html`
   - Ou ouvrir le fichier dans votre navigateur

2. **Navigation**
   - Utiliser le menu latéral pour naviguer entre les sections
   - Les boutons d'action rapide permettent un accès direct aux fonctionnalités

3. **Connexion (optionnel)**
   - Cliquer sur "S'identifier" dans la barre latérale
   - Utiliser les identifiants admin pour accéder aux fonctionnalités complètes

### Comptes de Test
```
Admin 1:
- Username: l.lalot
- Password: Lalot2025!

Admin 2:
- Username: a.boulenger
- Password: Boulenger2025!

Admin 3:
- Username: admin
- Password: admin
```

## 📁 Structure du Projet

```
Mission-Project/
├── index.html                    # Page principale
├── login.html                    # Page de connexion
├── README.md                     # Ce fichier
├── ARCHITECTURE.md               # Guide de l'architecture (développeurs)
│
├── docs/                         # Documentation
│   ├── GUIDE_DONNEES.md
│   ├── GUIDE_FORMATION_PROFESSIONNELLE.md
│   └── GUIDE_NOUVELLES_FONCTIONNALITES.md
│
├── assets/                       # Ressources statiques
│   ├── images/                   # Images et logos
│   └── styles/                   # Fichiers CSS
│       ├── main.css             # Styles de base
│       ├── components.css       # Composants UI
│       └── responsive.css       # Design responsive
│
└── src/                          # Code source JavaScript
    ├── core/                     # Modules centraux
    │   ├── auth.js              # Authentification
    │   ├── data-manager.js      # Gestion des données
    │   └── utils.js             # Fonctions utilitaires
    │
    ├── modules/                  # Modules fonctionnels
    │   ├── chart.js             # Graphiques
    │   ├── navigation.js        # Navigation
    │   ├── results.js           # Résultats qualité
    │   ├── documents.js         # Dossiers qualité
    │   ├── forms.js             # Formulaires
    │   ├── activity.js          # Activités récentes
    │   └── training.js          # Formation
    │
    ├── ui/                       # Interface utilisateur
    │   ├── ui-manager.js        # Gestion UI globale
    │   └── auth-ui.js           # Interface auth
    │
    └── app.js                    # Initialisation
```

## 📋 Technologies Utilisées

- **HTML5** : Structure de l'application
- **CSS3** : Styles modernes et responsives
- **JavaScript (Vanilla)** : Interactivité et fonctionnalités dynamiques
- **Font Awesome 6.4.0** : Icônes (chargées via CDN)
- **Canvas API** : Graphiques interactifs
- **LocalStorage API** : Stockage des données

## 🎨 Caractéristiques de l'Interface

- ✨ Design moderne et professionnel
- 🎯 Interface intuitive et facile à utiliser
- 📱 Responsive (adapté aux différentes tailles d'écran)
- 🎬 Animations fluides
- 🎨 Couleurs cohérentes avec l'identité Merlin Gerin
- ♿ Accessibilité (ARIA, navigation clavier)

## 📱 Responsive Design

L'application s'adapte automatiquement aux différentes tailles d'écran :
- **Desktop** : Sidebar complète avec toutes les informations
- **Tablet** : Sidebar compacte, interface optimisée
- **Mobile** : Sidebar réduite, composants empilés

## 🔧 Personnalisation

### Variables CSS
Les couleurs et styles peuvent être facilement modifiés dans `assets/styles/main.css` :

```css
:root {
    --primary-color: #10b981;
    --secondary-color: #059669;
    --success-color: #10b981;
    --warning-color: #f59e0b;
    --danger-color: #ef4444;
    /* ... */
}
```

### Architecture Modulaire
Pour ajouter de nouvelles fonctionnalités, consultez `ARCHITECTURE.md` qui explique :
- La structure des modules
- Comment ajouter un nouveau module
- Les conventions de nommage
- Le flux d'initialisation

## 💾 Stockage des Données

Les données sont stockées localement dans le navigateur via **localStorage** :
- Résultats de contrôles qualité
- Documents qualité
- Déclarations de rebut
- Activités récentes
- Documents de formation
- Sessions utilisateur

**Note** : Les données sont perdues si vous videz le cache du navigateur.

## 🔒 Sécurité

- Authentification par session
- Hashage des mots de passe (côté client)
- Expiration de session (24h)
- Contrôle d'accès basé sur les rôles
- Validation des formulaires

**⚠️ Important** : Ce système d'authentification est destiné à la démonstration. Pour un environnement de production, utilisez une authentification côté serveur.

## 📝 Notes Importantes

- Les données sont stockées localement (localStorage)
- Aucune connexion serveur requise
- Application 100% côté client
- Pour un environnement de production :
  - Connecter à une base de données
  - Implémenter une authentification serveur
  - Ajouter un backend API

## 🚧 Développement

### Pour les Développeurs
Consultez **`ARCHITECTURE.md`** pour :
- Comprendre la structure du projet
- Apprendre à ajouter de nouvelles fonctionnalités
- Suivre les bonnes pratiques
- Comprendre les dépendances entre modules

### Commandes Utiles
```bash
# Voir la structure du projet
find . -type f -name "*.js" -o -name "*.css" -o -name "*.html"

# Compter les lignes de code JavaScript
find src -name "*.js" -exec wc -l {} + | tail -1

# Compter les lignes de code CSS
find assets/styles -name "*.css" -exec wc -l {} + | tail -1
```

## 📊 Statistiques du Projet

- **15 modules JavaScript** organisés
- **~2000 lignes** de code JavaScript
- **~1500 lignes** de code CSS
- **2 pages HTML**
- **Architecture modulaire** professionnelle
- **0 dépendances** npm

## 🆘 Support

Pour toute question :
1. Consultez `README.md` (ce fichier)
2. Lisez `ARCHITECTURE.md` pour les aspects techniques
3. Parcourez les guides dans le dossier `docs/`

## 👥 Équipe

Projet réalisé par un groupe de 3 personnes pour Merlin Gerin.

## 📄 Licence

Projet destiné à Merlin Gerin - Tous droits réservés.

---

**Merlin Gerin - Dashboard Qualité** | Simplifiant l'expérience digitale des opérateurs
