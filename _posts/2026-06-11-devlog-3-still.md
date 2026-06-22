---
title: Still. Devlog 003
date: 2026-06-22
tags:
  - still
  - rails
  - architecture
  - devlog
categories:
  - devlog
description: le schéma qui scalait sans que je le sache
readingTime: 4
related_stub:
  - devlog-2-still
  - devlog-1-still
series: still
episode: 4
---
Je réfléchissais à Sidekiq et à la fréquence des fetch des flux RSS. Toutes les heures ? Toutes les 6 heures ? Le calcul est simple : 10 sources par utilisateur, une requête HTTP par source, multiplié par le nombre d'utilisateurs. Même à quelques dizaines d'utilisateurs, ça reste négligeable.

Et puis j'ai buté sur un truc qui n'avait rien à voir avec la fréquence.

Si deux utilisateurs suivent le même blog, mon architecture allait fetcher ce blog deux fois. Une fois par utilisateur. À 100 utilisateurs qui suivent tous TechCrunch, ça fait 100 requêtes vers le même flux RSS, pour récupérer exactement le même contenu.

Ça m'a paru absurde. Les gros readers fetchent une source une fois, peu importe combien d'utilisateurs la suivent. Et je voulais que Still tienne cette logique dès la v1, pas comme un refacto douloureux à 1000 utilisateurs.

Je m'attendais à devoir retravailler pas mal de choses. Peut-être ajouter une notion de "source globale" séparée des sources de chaque utilisateur, migrer les données existantes, revoir les controllers. Le genre de chantier qu'on met sous le tapis.

Sauf qu'en regardant mon schéma, j'ai réalisé qu'il était déjà bon.

`Source` n'a pas de `user_id`. Elle existe indépendamment. C'est `Subscription` qui fait le lien entre un `User` et une `Source`. J'avais construit ça en pensant au quota de 10 sources actives par utilisateur, pas à la question du fetch partagé. Mais le résultat est le même modèle qu'utilisent les gros readers : sources globales, abonnements individuels.

Ce qui devait changer, c'était juste la logique de création. Avant, `SourcesController#create` faisait ça :

```ruby
current_user.sources.create(source_params)
```

Ça créait systématiquement une nouvelle `Source`, même si l'URL existait déjà en base pour un autre utilisateur. Doublon en base, et doublon de fetch côté Sidekiq.

Le `create` devient :

```ruby
source = Source.find_or_create_by(url: source_params[:url])
current_user.subscriptions.create(source: source)
```

`find_or_create_by` cherche l'URL en base. Si elle existe, on récupère la source existante. Sinon on la crée. Dans les deux cas, on crée juste une `Subscription` qui relie l'utilisateur à cette source.

Le fetching RSS, dès qu'il sera branché sur Sidekiq, tournera par source, pas par utilisateur. Un blog suivi par 100 personnes sera fetché une seule fois.

Je me demande combien d'autres décisions que j'ai prises pour Still vont finir par résoudre des problèmes que je n'ai pas encore vus venir. Et combien, à l'inverse, vont me coûter cher plus tard sans que je le sache aujourd'hui.
