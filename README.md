# BLC Import ERP — Déploiement Netlify

## Structure
```
blc-erp-netlify/
├── index.html              ← Ton ERP complet
├── netlify.toml            ← Config Netlify
├── netlify/functions/
│   └── shopify-proxy.js    ← Proxy sécurisé vers Shopify
└── README.md
```

## Étapes de déploiement

### 1. Créer un compte Netlify
→ https://netlify.com → Sign up (gratuit)

### 2. Déployer le dossier
- Va sur https://app.netlify.com
- Clique "Add new site" → "Deploy manually"
- Glisse/dépose **tout le dossier blc-erp-netlify** sur la zone de dépôt
- Netlify te donne une URL ex: https://blc-erp-abc123.netlify.app

### 3. Configurer les variables d'environnement
Dans Netlify → ton site → Site settings → Environment variables → Add variable :

| Variable | Valeur |
|----------|--------|
| SHOPIFY_DOMAIN | blc-import.myshopify.com |
| SHOPIFY_TOKEN | shpat_xxxxxxxxxxxxxxxx |

### 4. Mettre l'URL Netlify dans le Dev Dashboard Shopify
- Retourne sur dev.shopify.com → BLC ERP → Versions → blc-erp-2
- Dans "URL de l'application" remplace https://example.com par ton URL Netlify
- Publie la nouvelle version
- Installer l'application → ça fonctionnera maintenant et tu obtiendras le token

### 5. Mettre le token dans Netlify
- Ajoute SHOPIFY_TOKEN = shpat_xxx dans les variables d'environnement
- Redéploie (automatique)

### 6. Dans l'ERP
- Clique sur "⚙ Shopify" → "Tester la connexion"
- Puis "Charger les commandes" pour importer toutes tes ventes Shopify
- Puis "Synchroniser le stock" pour lier tes produits
