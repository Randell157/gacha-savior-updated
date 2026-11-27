# Claude Code token-saving tips

From "Anthropic Engineer Explains: How to Stop Hitting Claude's Token Limit" by Nate Herk (YouTube, 2026-11-22): https://www.youtube.com/watch?v=0RF9ml43ups

These are notes to check against this project. Ask Claude which ones would help here and which this project already does.

## Why limits run out

Claude rereads the whole conversation on every message: instructions, CLAUDE.md, files it has opened, and every earlier message. In the video's own logs, Claude read about 200 tokens for every token it wrote. Prompt caching makes rereading the unchanged start of a conversation about 10× cheaper, but only while that start stays exactly the same. So the goal is to avoid making Claude start over, rather than to use it less.

## Habit 1: changing the setup mid-session

- **Pick the model at the start and keep it until the task is done.** Each model has its own cache, so switching to a cheaper model 100K tokens in means rereading all 100K at full price, which costs more than letting the first model answer.
- **For a small, cheap job, use a subagent** (for example "use a Haiku subagent to summarize these files"). It has its own chat and cache, so the main session's cache isn't touched.
- **Connect tools, MCP servers and plugins before the first message.** Adding one mid-session can break the cache. A skill made mid-session is easier to use from a new session for the same reason.
- **The cache expires**: about an hour after the last message on a subscription, 5 minutes on the API. Coming back to a big session after that means paying for all of it again. (The video's example: rebuilding a 400K-token cache cost about $3.50 of usage, keeping it warm about $0.08.) He had Claude build a mod above the prompt box that shows whether the cache is warm, how long it has left, and warns 5 minutes before it goes cold.

## Habit 2: one long session for everything

- **One task per session.** A long session that holds a day of unrelated work makes every message more expensive, even with a good cache hit rate.
- **Between tasks, `/clear`.** When part of a task is done, `/compact`, or write a short handoff note and paste it into a new session.
- **Say where things are.** "The bug is in checkout.js, in the total price function" reads one file. "Look through my project and find the bug" can read dozens, and all of them stay in context. A short routing map at the top of CLAUDE.md (which folder holds which kind of work) does this every time.

## Habit 3: too many rules

- **CLAUDE.md loads into every session**, whether the task needs those rules or not. A long one costs tokens and also makes Claude less likely to follow it. Rules can end up contradicting each other.
- **Anthropic recommends keeping CLAUDE.md under 200 lines.** Keep it to who you are, the project, and where things live.
- **Move step-by-step processes into skills** (a release checklist, onboarding steps, a data-update routine). Only a skill's short description loads at the start of a session; the full instructions load only when it's used ("progressive disclosure"). Docs files that CLAUDE.md points to work the same way.
- **Cut rules Claude would follow anyway.** The video uses `/doctor` to find them and to spot stray CLAUDE.md files loading from parent folders.
- **When a new model comes out, test whether your skills and rules are still needed.** Models need fewer rules as they improve.

## Short version

1. Pick the model and tools before you start.
2. Give every task its own clean session.
3. Keep CLAUDE.md short and put processes in skills.
