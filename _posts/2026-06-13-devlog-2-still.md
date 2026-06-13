---
title: Still. Devlog 002
date: 2026-06-13
tags:
  - still
  - product
  - devlog
  - feature
  - rss
categories:
  - devlog
description: Sun and Moon mode are gone. What remains is more simple.
readingTime: 4
related_stub:
  - devlog-1-still
  - devlog-0-still
series: still
episode: 3
---

**There was a version of Still with three Moments: Sun, Moon, Flow.** Sun for the active morning, Moon for night immersion, Flow for movement. I was proud of it. It was elegant on paper, consistent in `PRODUCT.md`, justified in `DECISIONS.md`.

But it was not necessary.

The problem wasn't technical complexity. Two color palettes, adapted typography, specific transitions: that's doable. The problem is that Sun and Moon asked the user to locate themselves in an energy level before they could read. Still was asking a question: *what state are you in?*

That's not a RSS reader's job.

So I pulled the thread. If Still refuses unread counters, notifications, gamification, because all of that imposes a posture on the user before they've even opened the app, then Sun and Moon do exactly the same thing. They label the moment before the reader has had a chance to exist.

What's left: a reading feed and Flow.

The feed composes content silently. A dense article, a short one, a tech source, then something else. The alternation is there but it's unnamed. It's not configurable. It exists because it's the best way to read, not because the app decided it for you.

Flow is unchanged. It's been the only voluntary gesture in Still since the start, and it stays that way.

My understanding of ["less is more"](/posts/less-is-more/) changed doing this.

Before: remove features so the interface doesn't get crowded.

Now: remove ideas you're proud of because they contradict what you're building. That's different. The first is discipline. The second is honesty.

I don't know yet if these were the right calls. I know Still is easier to describe today than it was yesterday. And usually, when a product gets easier to describe, that's a good sign.
