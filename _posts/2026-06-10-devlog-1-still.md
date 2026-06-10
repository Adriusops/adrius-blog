---
title: Still. Devlog 001
date: 2026-06-10
tags:
  - still
  - ruby
  - rails
  - react
  - devlog
categories:
  - devlog
description: Revenir à Ruby et choisir React
readingTime: 3
related_stub:
  - devlog-0-still
series: still
episode: 1
---

Le [devlog 000](lien) racontait le pourquoi et la genèse de Still. Celui-ci raconte le comment : deux décisions de stack dont j'avais envie de garder la trace.

## Revenir à Ruby

Je connais Ruby depuis quelques années. Le Wagon, des projets personnels, puis je suis passé à d'autres langages. Quand j'ai commencé Still, j'ai eu envie de retrouver ce langage.

Ce n'est pas une décision purement rationnelle. Ruby a une philosophie que j'aime beaucoup : le code doit être agréable à écrire et à lire, et cette agréabilité ne doit pas être un accident. Matz l'a conçu pour le bonheur du développeur. Ça se sent dans les idiomes, dans la lisibilité, dans la façon dont le code se lit quand il est bien écrit.

Du coup Rails s'est imposé naturellement. Still est une app CRUD classique : des sources, des articles, des utilisateurs, des sessions. C'est le terrain où Rails excelle. Les conventions sont fortes, l'écosystème est mature, Sidekiq pour le fetching RSS est natif à l'écosystème. Et le bottleneck d'un lecteur RSS, c'est le réseau, pas le CPU. Le GIL de Ruby ne sera jamais mon problème à cette échelle.

J'ai considéré Go et Node.js. Go m'aurait donné des performances brutes, mais un développement plus lent sans convention web. Node.js a une bonne gestion de l'I/O mais un écosystème fragmenté. Rails m'a donné ce dont j'avais besoin
réelle sans friction.

## Choisir React

La séparation API-only + React m'est apparue rapidement.

La voie naturelle de Rails, c'est Hotwire : des templates ERB côté serveur, Turbo pour les mises à jour dynamiques. C'est solide, ça marche et pour la majorité des apps Rails, c'est le bon choix.

Mais Still n'est pas la majorité des apps Rails ;)

Still a une exigence de précision visuelle. Chaque transition, chaque animation, chaque geste dans l'interface doit être contrôlé. Hotwire est pensé pour des apps fonctionnelles et rapides à livrer. React me donne le niveau de contrôle que l'expérience de lecture exige. L'un n'est pas meilleur que l'autre en absolu. Mais pour ce que Still veut être, le choix était clair.

Honnêtement, c'est le seul argument qui compte. Still ne choisit pas React pour être moderne. Il le choisit parce que l'expérience qu'il veut construire ne peut pas exister autrement.

## Ce que je ne sais pas encore

Je rentre dans Rails 8 après quelques années d'absence. Ma compréhension des nouvelles conventions, des patterns qui ont évolué, n'est pas encore complète. Il y a des décisions que je vais probablement regretter en chemin.

C'est documenté dans le projet. Si les choix d'aujourd'hui se révèlent mauvais, au moins j'aurai la trace de pourquoi je les ai faits.

La prochaine question concrète : comment Sidekiq et le fetching RSS s'intègrent dans cette séparation backend/frontend. C'est là que l'architecture va commencer à se tester vraiment...
