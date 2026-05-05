---
title: "CloudGoat > IAM Enum Basics : quand Bob en sait trop"
date: 2026-04-28
description: "Enumération IAM AWS avec CloudGoat : récupérer des credentials et trouver 5 flags cachés dans les métadonnées des ressources."
tags: ["aws", "iam", "cloudgoat", "enumeration", "write-up"]
categories: ["write-up"]
draft: false
---

## Contexte

Dans ce scénario, on récupère les credentials d'un utilisateur AWS nommé **Bob**. Pas de mot de passe, pas d'accès console, juste une Access Key et une Secret Key. L'objectif : énumérer l'infrastructure IAM du compte et trouver 5 flags cachés dans les métadonnées des ressources.

C'est le type de situation qu'un attaquant rencontre après avoir obtenu des credentials via une fuite (fichier `.env` exposé, repo GitHub public, phishing). Il ne sait pas ce qu'il peut faire, il doit le découvrir. PS: G pa trouvé les flags dans l'ordre :)

## Setup

### 1. Déployer le scénario

```bash
cloudgoat create iam_enum_basics
```

CloudGoat génère les ressources sur votre compte AWS et vous fournit les credentials de départ.

### 2. Configurer le profil AWS CLI

```bash
aws configure --profile bob
# AWS Access Key ID: <fourni par CloudGoat>
# AWS Secret Access Key: <fourni par CloudGoat>
# Default region: us-east-1
```

### 3. Vérifier l'authentification

```bash
aws sts get-caller-identity --profile bob
```

```json
{
    "UserId": "AIDAWOH3NR54ZYO6SX3GQ",
    "Account": "442908905337",
    "Arn": "arn:aws:iam::442908905337:user/cg-bob-cgidpzxjy3ymnv"
}
```

On est authentifié en tant que `cg-bob`. Point de départ de l'énumération.

## Enumération IAM

### Réflexe #1 : qu'est-ce que Bob peut faire ?

La première question avec des credentials inconnus : **quelles sont mes permissions ?** L'équivalent AWS du `sudo -l` sous Linux.

```bash
aws iam list-attached-user-policies --user-name cg-bob-cgidpzxjy3ymnv --profile bob
```

```json
{
    "AttachedPolicies": [
        {
            "PolicyName": "IAMReadOnlyAccess",
            "PolicyArn": "arn:aws:iam::aws:policy/IAMReadOnlyAccess"
        },
        {
            "PolicyName": "cg-flag1-managed-policy-cgidpzxjy3ymnv",
            "PolicyArn": "arn:aws:iam::442908905337:policy/cg-flag1-managed-policy-cgidpzxjy3ymnv"
        }
    ]
}
```

Deux policies attachées à Bob :
- **`IAMReadOnlyAccess`** : policy AWS standard qui donne un accès en lecture sur **tout IAM**. C'est le skibidi jackpot.
- Une policy custom dont le nom contient "flag1".

### Flag 1 : la vilaine description

```bash
aws iam get-policy --policy-arn arn:aws:iam::442908905337:policy/cg-flag1-managed-policy-cgidpzxjy3ymnv --profile bob
```

```json
{
    "Policy": {
        "PolicyName": "cg-flag1-managed-policy-cgidpzxjy3ymnv",
        "Description": "HSM{m4n4g3d_p0l1cy_m4st3r}",
        ...
    }
}
```

**Flag 1 : `HSM{m4n4g3d_p0l1cy_m4st3r}`**

La description d'une ressource IAM est rarement protégée et souvent ignorée. En conditions réelles, ce champ peut contenir des mots de passe, des URLs internes, des noms d'environnement.

### Flag 5 : les permissions cachées dans la policy

```bash
aws iam get-policy-version \
  --policy-arn arn:aws:iam::442908905337:policy/cg-flag1-managed-policy-cgidpzxjy3ymnv \
  --version-id v1 \
  --profile bob
```

```json
{
    "PolicyVersion": {
        "Document": {
            "Statement": [
                {
                    "Action": ["s3:ListBucket", "s3:GetObject"],
                    "Effect": "Allow",
                    "Resource": "arn:aws:s3:::HSM{s3cr3t_js0n_str1ng}"
                }
            ]
        }
    }
}
```

**Flag 5 : `HSM{s3cr3t_js0n_str1ng}`**

Le champ `Resource` d'une policy révèle les assets ciblés, noms de buckets S3, ARNs de fonctions Lambda, etc. Même sans y accéder, un attaquant cartographie l'infrastructure.

### Flag 4 : l'inline policy oubliée

Les managed policies ne sont pas les seules à surveiller. Les **inline policies** sont directement embarquées dans l'utilisateur et souvent oubliées dans les audits.

```bash
aws iam list-user-policies \
  --user-name cg-bob-cgidpzxjy3ymnv \
  --profile bob
```

```json
{
    "PolicyNames": ["cg-flag2-inline-policy-cgidpzxjy3ymnv"]
}
```

```bash
aws iam get-user-policy \
  --user-name cg-bob-cgidpzxjy3ymnv \
  --policy-name cg-flag2-inline-policy-cgidpzxjy3ymnv \
  --profile bob
```

```json
{
    "PolicyDocument": {
        "Statement": [
            {
                "Action": "ec2:DescribeInstances",
                "Effect": "Allow",
                "Resource": "*",
                "Sid": "HSM1nl1n3p0l1cyd1sc0v3r3d"
            }
        ]
    }
}
```

**Flag 4 : `HSM{1nl1n3p0l1cyd1sc0v3r3d}`**

Le `Sid` (Statement ID) est un champ libre, sans impact sur les permissions, mais visible par quiconque peut lire la policy. Bob a aussi `ec2:DescribeInstances` : un attaquant peut énumérer les instances EC2 du compte.

### Flag 3 : le groupe et son chemin

```bash
aws iam list-groups --profile bob
```

```json
{
    "Groups": [
        {
            "Path": "/HSM_gr0up_m3mb3rsh1p_f0und/",
            "GroupName": "cg-flag3-group-cgidpzxjy3ymnv",
            "Arn": "arn:aws:iam::442908905337:group/..."
        }
    ]
}
```

**Flag 3 : `HSM{gr0up_m3mb3rsh1p_f0und}`**

Le champ `Path` des ressources IAM sert à organiser les ressources (`/engineering/`, `/prod/`). Il est rarement protégé et peut révéler l'organisation interne.

### Flag 2 : l'idiot

```bash
aws iam list-roles --profile bob | grep RoleName
```

J'avais pas fait le grep. La sortie de `list-roles` c'est un JSON paginated que t'as envie de scroller. Tu te doutes bien que j'ai pas scrollé. J'ai passé 20 minutes à chercher pourquoi je "ne trouvais rien" avant de réaliser que les rôles étaient là, juste en dehors de l'écran. Le `| grep RoleName` règle ce souci d'interface chaise-clavier.

On repère `cg-flag4-role-cgidpzxjy3ymnv`. On inspecte ses tags :

```bash
aws iam list-role-tags \
  --role-name cg-flag4-role-cgidpzxjy3ymnv \
  --profile bob
```

```json
{
    "Tags": [
        {
            "Key": "Flag",
            "Value": "HSM-r0l3_trus1_f0und"
        }
    ]
}
```

**Flag 2 : `HSM{r0l3_trus1_f0und}`**

Les tags AWS sont lisibles par quiconque a `IAMReadOnlyAccess` et contiennent souvent des informations sensibles sur l'environnement, les propriétaires, les coûts.

## Bilan des flags

| # | Trouvé dans | Commande clé |
|---|-------------|--------------|
| Flag 1 | Description d'une managed policy | `get-policy` |
| Flag 2 | Tags d'un rôle IAM | `list-role-tags` |
| Flag 3 | Path d'un groupe IAM | `list-groups` |
| Flag 4 | Sid d'une inline policy | `get-user-policy` |
| Flag 5 | Resource ARN d'une policy | `get-policy-version` |

## Remédiation

### Problème racine : `IAMReadOnlyAccess` trop permissive

`IAMReadOnlyAccess` donne une visibilité totale sur IAM : policies, users, groupes, rôles, tags, descriptions. Un utilisateur lambda n'a jamais besoin de ça. C'est cette policy qui a rendu toute l'énumération possible.

### 1. Détacher la policy

```bash
aws iam detach-user-policy \
  --user-name cg-bob-cgidpzxjy3ymnv \
  --policy-arn arn:aws:iam::aws:policy/IAMReadOnlyAccess \
  --profile cloudgoat
```

### 2. Vérifier que l'attaque ne fonctionne plus

```bash
aws iam get-policy \
  --policy-arn arn:aws:iam::442908905337:policy/cg-flag1-managed-policy-cgidpzxjy3ymnv \
  --profile bob
```

```
AccessDenied: User is not authorized to perform: iam:GetPolicy
```

Bob ne peut plus lire les métadonnées IAM.

### 3. Appliquer le principe du moindre privilège

En conditions réelles, l'approche correcte est le **permission rightsizing** :

```bash
# Générer un rapport d'utilisation réelle des permissions
aws iam generate-service-last-accessed-details \
  --arn arn:aws:iam::442908905337:user/cg-bob-cgidpzxjy3ymnv \
  --profile cloudgoat

# Récupérer le rapport (asynchrone)
aws iam get-service-last-accessed-details \
  --job-id <job-id> \
  --profile cloudgoat
```

Le rapport indique quels services ont été réellement utilisés et quand. On ne conserve que ces permissions. Cet audit peut aussi être automatisé via **IAM Access Analyzer** depuis la console AWS ou en CLI.

### 4. Ne jamais stocker de secrets dans les métadonnées IAM

Les champs libres (Description, Sid, Tags, Path) sont lisibles par tout utilisateur ayant des droits IAM en lecture. Ne jamais y stocker de mots de passe, de clés, de noms d'environnements sensibles ou d'informations d'architecture interne.

## Ce qu'on retient

Les informations sensibles ne sont pas toujours dans les données, elles sont dans les métadonnées. Descriptions, tags, paths, Sids : autant de champs ignorés par les équipes mais scrutés par les attaquants.

Une seule policy trop permissive (`IAMReadOnlyAccess`) a suffi pour exposer l'ensemble de l'infrastructure IAM du compte. Le principe du moindre privilège n'est pas optionnel.

*Scénario réalisé avec [CloudGoat](https://github.com/RhinoSecurityLabs/cloudgoat) de RhinoSecurityLabs.*
