# Guide de Déploiement - Blog Security Write-ups

## Options d'hébergement (du moins cher au plus cher)

### 1. GitHub Pages (GRATUIT) ⭐ **RECOMMANDÉ**

**Coût**: Totalement gratuit
**Simplicité**: Très simple
**Performance**: Excellente (CDN global)

#### Étapes de déploiement:

1. **Créer un repository GitHub**
   ```bash
   git remote add origin https://github.com/VOTRE-USERNAME/security-writeups.git
   git add .
   git commit -m "Initial commit"
   git push -u origin master
   ```

2. **Configurer GitHub Actions**
   Créer `.github/workflows/hugo.yml`:
   ```yaml
   name: Deploy Hugo site to Pages

   on:
     push:
       branches: ["master"]
     workflow_dispatch:

   permissions:
     contents: read
     pages: write
     id-token: write

   concurrency:
     group: "pages"
     cancel-in-progress: false

   defaults:
     run:
       shell: bash

   jobs:
     build:
       runs-on: ubuntu-latest
       steps:
         - name: Checkout
           uses: actions/checkout@v4
           with:
             submodules: recursive

         - name: Setup Hugo
           uses: peaceiris/actions-hugo@v2
           with:
             hugo-version: 'latest'
             extended: true

         - name: Build
           run: hugo --minify

         - name: Upload artifact
           uses: actions/upload-pages-artifact@v3
           with:
             path: ./public

     deploy:
       environment:
         name: github-pages
         url: ${{ steps.deployment.outputs.page_url }}
       runs-on: ubuntu-latest
       needs: build
       steps:
         - name: Deploy to GitHub Pages
           id: deployment
           uses: actions/deploy-pages@v4
   ```

3. **Activer GitHub Pages**
   - Aller dans Settings > Pages
   - Source: GitHub Actions
   - Votre site sera disponible à `https://VOTRE-USERNAME.github.io/security-writeups/`

4. **Mettre à jour le baseURL**
   Dans `hugo.toml`:
   ```toml
   baseURL = 'https://VOTRE-USERNAME.github.io/security-writeups/'
   ```

---

### 2. Netlify (GRATUIT) ⭐ **Très simple**

**Coût**: Gratuit (100 GB bande passante/mois)
**Simplicité**: Extrêmement simple
**Performance**: Excellente

#### Étapes:

1. Créer un fichier `netlify.toml`:
   ```toml
   [build]
     publish = "public"
     command = "hugo --minify"

   [build.environment]
     HUGO_VERSION = "0.152.2"

   [[redirects]]
     from = "/*"
     to = "/404.html"
     status = 404
   ```

2. Push sur GitHub

3. Aller sur [netlify.com](https://netlify.com)
   - Connecter votre repository GitHub
   - Déploiement automatique !
   - Domaine gratuit: `votre-site.netlify.app`
   - Possibilité d'ajouter un domaine personnalisé gratuit

---

### 3. Cloudflare Pages (GRATUIT)

**Coût**: Gratuit (illimité)
**Simplicité**: Simple
**Performance**: Excellente (CDN Cloudflare)

#### Étapes:

1. Push sur GitHub
2. Aller sur [pages.cloudflare.com](https://pages.cloudflare.com)
3. Connecter votre repository
4. Configuration build:
   - Build command: `hugo --minify`
   - Build output: `public`
   - Variables d'environnement: `HUGO_VERSION = 0.152.2`

---

### 4. Vercel (GRATUIT)

**Coût**: Gratuit (100 GB bande passante/mois)
**Similaire à**: Netlify

#### Configuration:
Même principe que Netlify, très simple avec déploiement automatique.

---

### 5. AWS S3 + CloudFront (Payant, ~1-5$/mois)

**Coût**: ~1-5$ par mois selon le trafic
**Simplicité**: Plus complexe
**Avantages**: Contrôle total, bonne expérience pour CV sécurité cloud

#### Étapes simplifiées:

1. Créer un bucket S3
2. Activer hébergement web statique
3. Upload du contenu avec `hugo && aws s3 sync public/ s3://votre-bucket`
4. Optionnel: CloudFront pour HTTPS et CDN

---

## Recommandation Finale

### Pour démarrer immédiatement: **GitHub Pages**
- Gratuit à vie
- Simple à configurer
- Performant
- Intégration Git native

### Pour le plus facile: **Netlify**
- Interface très intuitive
- Déploiement en 1 clic
- Domaine personnalisé facile

### Pour un portfolio sécurité cloud: **AWS S3 + CloudFront**
- Démontre vos compétences AWS
- Pertinent pour vos write-ups CloudGoat
- Coût minimal

---

## Workflow de publication

Une fois configuré, votre workflow sera:

```bash
# 1. Créer un nouveau write-up
hugo new posts/mon-nouveau-writeup.md

# 2. Éditer le fichier
# content/posts/mon-nouveau-writeup.md

# 3. Tester localement
hugo server -D

# 4. Publier
git add .
git commit -m "Add new write-up: [titre]"
git push

# Le déploiement se fait automatiquement !
```

---

## Commandes Hugo Utiles

```bash
# Démarrer le serveur local
hugo server -D

# Créer un nouveau post
hugo new posts/nom-du-post.md

# Build pour production
hugo --minify

# Voir la structure du site
hugo list all
```

---

## Domaine personnalisé (optionnel)

Si vous voulez un domaine comme `security-writeups.com`:

1. Acheter un domaine (~10$/an sur Namecheap, Google Domains, etc.)
2. Configurer les DNS selon votre hébergeur (tous les gratuits supportent les domaines custom)

**Coût total avec domaine**: ~10$/an (uniquement le domaine)
