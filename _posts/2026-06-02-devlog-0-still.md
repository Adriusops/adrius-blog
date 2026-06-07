---
title: Still. Devlog 000
date: 2026-06-02
tags:
  - devlog
  - still
  - rss
  - product
categories:
  - devlog
description: J'ai frôlé l'addiction à YouTube. Alors je construis Still une app de lecture sans algo, sans inbox, sans dette.
series: still
episode: 0
---

J'étais vraiment (trop) proche de l'addiction à YouTube.

Pas l'usage excessif : la vraie addiction. Recharger la page d'accueil en boucle sans avoir envie de rien en particulier, juste voir si quelque chose de nouveau était apparu. La récompense aléatoire. Remettre une pièce dans la machine, encore une fois, sans l'avoir décidé.

[Aza Raskin](https://www.bbc.com/news/technology-44640959), l'inventeur du scroll infini, dit qu'il en est malade de regrets. Il a probablement contribué à détruire des milliards d'heures d'attention humaine. Il a inventé ça en une nuit pour un projet, sans savoir ce qu'il créait.

Mais quelqu'un savait. Quelqu'un a décidé que c'était exactement ce qu'il fallait déployer.

Ces algorithmes n'ont pas été conçus par des incompétents. Ce sont les meilleurs ingénieurs et psychologues du comportement humain au monde. Chaque détail est optimisé : la durée des pauses, la fréquence des récompenses, la friction d'arrêt quasi-nulle. Ce n'est pas un accident que tu ne puisses pas t'arrêter. C'est l'objectif.

Du coup j'ai voulu construire quelque chose.

Pas une appli de bien-être. Pas un tracker de temps d'écran. Quelque chose de plus fondamental : une app de lecture où je pourrais consommer tout ce qui m'intéresse, articles, vidéos, podcasts, de façon intentionnelle. Sans algo. Sans inbox qui se remplit pendant que tu dors. Sans cette sensation qu'il faut vider quelque chose.

En cherchant comment construire ça, j'ai redécouvert les flux RSS. Technologie des années 90, toujours vivante, complètement ignorée. Minimaliste, presque belle dans sa sobriété, et visiblement faite pour durer : le web a tout changé autour d'elle, elle est restée. Chaque blog, chaque chaîne YouTube, chaque podcast expose un flux RSS. Tu t'abonnes, tu reçois le contenu dans l'ordre chronologique : aucun algorithme au milieu, aucune curation étrangère. C'est le web tel qu'il aurait dû rester.

Le problème : aucune app existante ne les présente correctement. Elles recréent toutes la même inbox anxiogène, le même compteur de non-lus, la même logique du mail à vider. Et celles qui évitent ça le remplacent par un algorithme qui décide pour toi ce que tu vas regarder. La technologie est saine. L'expérience est cassée.

Still répare ça.

L'idée centrale tient en une phrase : tu ne peux jamais être en retard dans Still.

Il n'existe pas de dette de lecture. Pas de boîte à vider. Quand tu n'ouvres pas l'app pendant trois jours, rien ne s'accumule. Elle continue à préparer tes sessions en silence. Quand tu reviens, elle est prête. Sans un mot.

Tu ouvres Still. Tu lis. L'app a préparé une sélection depuis tes sources, avec l'obsession habituelle que je met sur le design pour que l'expérience soit la plus propre possible, alternant les registres et les longueurs. Quand tu pars, tu passes en mode Flow : l'app compose une session audio, tu scannes un QR code, tu poses ton téléphone dans ta poche.

Aucun compteur. Aucune notification non sollicitée. Aucune suggestion que tu n'as pas faite toi-même.

Je construis Still pour moi. J'en ai besoin et j'ai envie de l'utiliser tous les jours. Si ça peut aider d'autres personnes à avoir une relation différente avec leur consommation de contenu, j'en serai ravi.

Ce devlog documente la construction depuis le début. Les décisions, les frictions, ce qui marche et ce qui casse. Le code est [ouvert sur GitHub](https://github.com/Adriusops/Still). [Le blog a changé de direction récemment](/posts/blog-init/), ce projet est une partie du pourquoi.

Est-ce qu'on peut construire quelque chose qui résiste à ce que des milliards de dollars ont passé des années à optimiser ? Je ne sais pas encore. Mais ne pas reproduire les mêmes patterns me semble une bonne idée.
