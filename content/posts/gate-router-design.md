---
title: "Introducing the GATE Router"
slug: gate-router-design
summary: GATE starts each turn on the cheapest model proven for the job, checks the result, and escalates only when the model is at fault. On 20 hard SWE-Bench Pro tasks it matched Opus 5.5 at 52% of the cost.
---

## Introduction

GATE is the router behind AURA's `gate` model id. Most routers pick a model once, up front, with a classifier trained offline on one-shot prompts. A coding agent's turn is different: it runs for minutes, makes dozens of model calls, and ends in something that can be checked. So GATE decides, then checks:

- **Start cheap.** Label the turn, then run it on the cheapest model the record shows is good enough for that kind of work.
- **Verify.** Read the evidence the turn leaves behind: its tests, its builds and its final reply.
- **Escalate only on fault.** When a check fails, a judge decides whether the model or the environment is to blame. Only a model's fault moves the work to a stronger tier.
- **Learn without training.** The routing table is a fold over AURA's append-only record. Replaying the record rebuilds the same table.

Initial results, on 20 tasks from the HARD-51 subset of SWE-Bench Pro, each run once on GATE and once on Claude Opus 5.5 alone:

- **Same pass rate.** Both arms passed all 20 hidden test suites.
- **48% cheaper.** $8.40 against $16.20, including GATE's own classifier, criteria, judge and review calls.
- **13% faster.** 111 minutes of wall time against 128.
- **Cheaper on 19 of 20 tasks,** at 0.26× to 0.88× of Opus's cost per task.

## 1. The idea

Picture a lead with three engineers: a fast, cheap junior, a mid-level engineer, and a principal who costs twice as much as the mid-level one. Sending every ticket to the principal works but wastes money. Sending every ticket to the junior is cheap until the hard ones come back broken. A good lead sizes up each ticket, runs the tests on what comes back, and before escalating a failure asks whether the engineer got it wrong or the build was already broken. Over time they learn who to trust with what.

GATE does the same with models. Each turn opens with a line stating its choice:

```text
gate → claude-sonnet-5-5 (claude plan) at high effort · multi_file_change, default
```

That is the model, who pays for it (the user's Claude plan), the effort, the prompt's category, and the reason: `default` (where this kind of work starts), `proven` (the cheapest model the record shows is good enough) or `explore` (a deliberate try of a cheaper model, so the table keeps learning).

## 2. Architecture

```chart
gate-architecture
```

GATE has three layers with strict boundaries:

- **Decide: `aura-agent-gate`.** Every decision is a pure function: which models the user's sign-ins allow, where a turn goes and at what effort, how the classifier's and judge's requests are built and their replies read, which outcome a turn ended with, and what each model has proven. It never calls a model or touches the disk, so every rule is unit-testable and replayable over recorded work.
- **Run: the `aura-app` event loop.** Shared by the terminal, the desktop app, `aura -p` and benchmark runs. It sends GATE's own model calls through the agent's kernel like any other call, runs checks as `run_command` proposals under the agent's command policy, and restores files when a subtask is retried.
- **Record: the kernel.** Every prompt is a transaction carrying its route, and every way a prompt can end is an `Outcome` transaction pointing back to it. The table is rebuilt from these at startup and updated on each commit, so the next decision always sees the last outcome.

## 3. Walking through a turn

The examples are real. They come from Compare #37, which ran 20 SWE-Bench Pro tasks once on GATE and once on Opus 5.5 alone, in isolated copies of each repository.

### 3.1 Candidates and tiers

GATE routes only among models the user can call right now: local models, models on AURA's router when signed in, and Claude or ChatGPT models when those plans are linked. A model reachable two ways is kept once, on the user's plan, since that is already paid for. Each model has a tier: `local`, `fast` (Haiku, GPT mini), `standard` (Sonnet) or `frontier` (Opus, GPT-5). Tiers set where work starts and what "stronger" means when it moves up.

### 3.2 Classify

One short call to the cheapest fast model labels the prompt with a category (`question`, `small_change`, `multi_file_change`, `debugging`, `research`, `planning`, `writing`, `other`) and a difficulty (`easy`, `medium`, `hard`). It answers through a `label` tool, not prose: given a long SWE-Bench prompt ("Your task is to implement…") as plain text, a cheap model tends to start doing the work. A call that fails or takes over 20 seconds leaves the prompt `unclassified`.

In #37, Haiku 5.5 made 20 calls of one to four seconds, $0.008 in total. It labelled 15 tasks `multi_file_change`, 4 `small_change` and 1 `debugging`, all of them `hard`. The classifier does not route. It only picks which row of the table to read.

### 3.3 Pick a model and an effort

The table has a row per level (turn or subtask), category and model, holding tries, successes and cost. GATE picks the cheapest model with at least 10 counted outcomes in the category and a success rate of at least 85% (`AURA_GATE_MIN_TRIES`, `AURA_GATE_TARGET`). Without one, it uses the category's start model: the cheapest fast-tier model for `easy` work, and the cheapest standard-tier model for everything else, including all planning. Frontier models are reached only by escalation, never by default.

- **Expected cost, not list price.** A model that is cheaper per token can need several times the tokens. An untried model is priced from its list price, scaled by how the tried models of its tier compare with theirs.
- **Early rule-out.** A fast-tier model is dropped as soon as it can no longer reach the target over its first 10 tries (`Row::can_still_reach`). Two failures in its first two tries is enough. A standard-tier model hands its work up only when starting on it has also become dearer than starting on the next tier: when a turn on it costs at least what a turn on the stronger model does, times the share of its turns that succeed.
- **Exploration.** With probability `AURA_GATE_EXPLORE` (5%), a turn tries a cheaper model that has not been ruled out, and logs the choice with its probability so the outcome can be weighed fairly. This is the logged-propensity idea from contextual bandits.[1](https://arxiv.org/abs/1003.0146) Comparisons switch exploration off, so a benchmark measures the policy, not its experiments.

Effort follows difficulty: `low`, `medium` or `high`, never `max` to start. A route recorded in #37:

```json
{"category": "debugging", "difficulty": "hard", "model": "claude/claude-sonnet-5-5", "effort": "high", "explored": false}
```

### 3.4 Define done

Before a code turn, a standard-tier model turns the request into acceptance criteria, each marked as a behaviour, an interface or an exact output. For an Element task in #37 (bulk sign-out of devices), Sonnet wrote 12, including:

> The bulk sign-out action has `data-testid="sign-out-selection-cta"`.
>
> When the active device filter changes, all selected devices are cleared.

The worker sees the criteria after the prompt, and reviews check the work against them one by one. Those reviews are still logged only (`AURA_GATE_CRITERIA=log`, see 3.6). Criteria cost $0.41 across #37, 5% of GATE's spend.

### 3.5 Work, alone or as a lead

The turn runs in the normal agent loop on the chosen model. Work that can be split (multi-file changes, planning, debugging, research) can instead be led. The lead keeps its reading and checking tools, loses its file-changing ones, gets capped reads, and hands edits to subtasks that GATE routes separately, below the frontier tier when the lead is on it and a standard model exists. Leading is learned like model choice: off by default, and used once the record shows it is cheaper for that kind of work. No turn in #37 was led.

### 3.6 Verify

This is where a router that checks results earns its savings. A code turn ends in one of four signals: an error, `checks_failed`, `checks_passed`, or nothing to go on. Telling which is harder than it sounds.

- **Find the check.** GATE takes the turn's last test or build command, including wrapped ones such as `sh .swe/run 'go test ./internal/config/...'`. When the exit status may belong to another command (`pytest | grep Error` that matched nothing), the output decides: `12 passed` passes, failures fail, and anything else says nothing. A test run with the change stashed tested the old code, so it does not count.
- **Follow up on unchecked work.** A code turn that ran no test or build is asked once to run the tests covering its change and restate its answer. If it still does not, the harness runs the project's own test command. If nothing can run, a judge reads the request, the diff, the commands and the reply, and rules whether the work is done.
- **Distrust weak passes.** A reply admitting the work was not verified ("I couldn't build against the real ECR module here because it isn't in the offline container", from a flipt task in #37) goes to the judge despite passing tests. So do tests that ran only files the attempt wrote itself. Each such sign is logged against what later proved the attempt right or wrong, and triggers a review only once the log shows it means something.
- **Keep reviews logged.** Replayed over logged benchmark attempts, an Opus reviewer given the criteria called 6 of 8 wrong attempts unfinished, but also 16 of 35 right ones. Acting on it would send back about two good attempts for every bad one, so reviews stay logged only, on a quarter of turns. In #37 the Element review found 11 of 12 criteria met and one untested. The task passed its hidden tests.

### 3.7 Judge: whose fault?

A failed check is not yet a reason to pay for a stronger model. Tests fail because of the environment, because they were already failing, or because the request cannot be done. So the judge answers one narrow question: not "is this correct?" but "was the model at fault?". `judged_fail` counts against the model and moves the work up. `judged_excused` counts for nothing and leaves the work where it is.

- **Failed checks** are judged by the strongest Opus available, since that verdict decides whether to pay for Opus. It is never asked about work on its own tier.
- **Unchecked work** on a standard model or stronger is judged by the model that did it. Opus costs twice what Sonnet does per token,[2](https://platform.claude.com/docs/en/about-claude/pricing) so judging Sonnet's work on Opus can cost more than the work itself.
- **A clean run** pays for no judge at all.

In #37 six Sonnet turns ended with their own tests failing. The Opus judge excused all six, none moved up, and all six passed the hidden tests. One turn ended with nothing checked, and Sonnet's judge found a real bug:

> An empty string, a bare unit such as `MB`, or a lone `.` still passes the new regex, because the number part can be empty. Those inputs then fail at `float()` with `can't interpret following number`, not the required `can't interpret following string`.

Judging and reviewing across the 20 tasks cost $0.82 over 16 calls.

### 3.8 Escalate

Blamed work continues in the same conversation, with the files as the failed attempt left them, on the cheapest model of the next tier up. Its first message carries the judge's findings, as in Reflexion,[3](https://arxiv.org/abs/2303.11366) and tells it that it is a stronger model taking over. The task above moved from Sonnet to Opus at high effort, fixed the regex, and passed. It cost $0.35 on GATE against $0.30 on Opus alone, the only one of the 20 where GATE cost more.

Each escalation buys a full pass on a dearer model, so it has to be rare:

- Effort is raised only on the strongest model, and only after a judge finds its work unfinished there.
- A subtask gets one retry, and it starts from where the subtask started, not where it failed. Files are restored from the attempt's checkpoint, or from a git snapshot when the subtask had the workspace to itself.

### 3.9 Learn

There is no training run. The table is a fold over the record:

- Each prompt counts once, with its latest outcome. A later verdict, such as the judge's, replaces the earlier one. An excused failure takes the prompt out of the table.
- Escalated work does not count against the stronger model, which only ever sees work that has already failed once.
- Outcomes can arrive in any order and more than once, so the startup scan and the live feed can overlap. Which outcome counts depends only on record sequence numbers, so replaying the same record always gives the same table.

A model proven on 10 tries can still fail on the 11th, and the cheapest router that passes an audit can still break its contract later.[4](https://arxiv.org/abs/2611.20417) GATE's defence is that proven models stay under the same checks: every turn is verified and judged, and the row keeps moving.

## 4. Evaluation

### 4.1 Method

SWE-Bench Pro is a benchmark of long-horizon changes to large production codebases.[5](https://arxiv.org/abs/2509.16941) We use the 51-task HARD-51 subset of its V2 release.[6](https://github.com/scaleapi/SWE-bench_Pro-os) Each task runs in its own container image. The agent works on a copy of the repository and runs commands in a fresh container without network. Grading follows SWE-Bench Pro: the changes are applied as one patch in a fresh container, and every hidden test must pass, including those that passed before.

A comparison (`/compare` in AURA) runs each task once per arm, in its own git worktree, with no one approving calls. Neither arm sees the hidden tests.

- **GATE arm:** routes as a user's turns would, with exploration off, and is followed up, judged and escalated as usual.
- **Opus arm:** every turn and subtask on Opus 5.5.
- **Cost:** list prices[2](https://platform.claude.com/docs/en/about-claude/pricing) applied to each call's recorded token usage, including cache reads and writes. GATE's cost includes its classifier, criteria, judge and review calls. The figures are generated from the run logs by a script in the AURA repository, which also checks that per-call prices add up to each run's recorded cost.

### 4.2 Results

```chart
gate-savings
```

Both arms passed all 20 tasks. GATE cost 48% less and took 13% less wall time. It was cheaper on 19 of the 20 tasks, at 0.26× to 0.88× of Opus's cost per task.

```chart
gate-swe-tasks
```

Every task started on Sonnet 5.5 at high effort, because the classifier rated all of them hard and no model was proven on hard work yet. Thirteen ended with their own tests passing, six with failing tests the judge excused, and one moved up to Opus. So in #37, GATE's saving is close to the per-token price gap between Sonnet and Opus. What the router adds is knowing when Sonnet's work can stand. Here is what knowing cost:

```chart
gate-spend
```

GATE's own calls were 15% of its spend, about two thirds of it on judging and reviewing. That is the price of checking results, and the obvious next place to save, since most verdicts left the work where it was.

## 5. Threats to validity

- **Small samples.** #37 is 20 tasks run once per arm. A 48% saving on 20 tasks is a result, not a constant.
- **A pass-rate ceiling.** Both arms passed every task, so #37 cannot show GATE keeping quality on work Opus can do and Sonnet cannot, only that it lost none.
- **One provider.** Every model was a Claude model on one plan (Haiku, Sonnet, Opus). Other providers have different price gaps and different cheap-tier failure modes.
- **List prices, not plan usage.** On a subscription, what matters is the share of the plan's usage window a run consumes. AURA's comparison view reports that too. This post uses list prices because readers can check them.
- **One build.** #37 ran on commit `d07d3e3a`. A few rules described here, such as when a standard model hands its work up and showing the worker its criteria, came after it and are not yet measured on these tasks.
- **Hidden tests are not all of quality.** AURA's comparisons also run a blind judge over both arms' diffs and replies. That verdict for #37 is not reported here.

The next evaluation is GATE against other routers on the same tasks, using public router leaderboards that report cost per task[7](https://openrouter.ai/benchmarks/routers) and step-level benchmarks such as TwinRouterBench.[8](https://arxiv.org/abs/2605.18859)

## 6. Limits and next steps

- **Classifier mistakes cost twice.** A hard task labelled easy starts on the fast tier, and since fast models' own tests pass on work they got wrong, the mistake may never surface. Starting all work that is not easy on the standard tier limits the damage, at the price of rarely using the fast tier for code.
- **Turns with nothing to go on teach nothing.** They count for their cost only.
- **Thresholds are global.** The 85% target and 10 tries apply to every category, and nothing decays, so a model that improves or regresses is noticed only as fast as new outcomes outweigh old ones.
- **The judge is a model too.** Its excusals in #37 were right six times out of six, but every verdict should be checked against what later proved the work right or wrong. That is what GATE's attempt log and its `aura gate eval` report are for.

GATE saves money by letting a cheaper model's work stand, and loses it by misreading the evidence and paying a stronger model to redo work that was already right. The work ahead is making the evidence cheaper to read and harder to misread.

## Appendix: settings

| Setting | Default | What it does |
|---|---|---|
| `AURA_GATE_TARGET` | `0.85` | Success rate a model needs to be proven on a kind of work |
| `AURA_GATE_MIN_TRIES` | `10` | Counted outcomes before a model can be proven or ruled out |
| `AURA_GATE_EXPLORE` | `0.05` | Share of routed turns that try a cheaper model to keep learning |
| `AURA_GATE_DELEGATE` | `on` | Lets led turns hand edits to routed subtasks |
| `AURA_GATE_JUDGE` | `on` | Asks the judge about failed and unchecked work |
| `AURA_GATE_NUDGE` | `on` | Asks a turn that checked nothing to check its change |
| `AURA_GATE_CHECK` | `on` | Runs the project's tests on a change nothing checked |
| `AURA_GATE_CRITERIA` | `log` | Writes acceptance criteria and shows them to the worker; `on` also acts on reviews against them |
| `AURA_GATE_REVIEW` | `log` | Reviews work before it stands; `log` records the verdict, `on` acts on it |
| `AURA_GATE_REVIEW_SAMPLE` | `0.25` | Share of turns that get a logged review |

## Related research

Model routing is now a field of its own, and an industry. OpenAI describes GPT-5 as "a unified system" with "a real-time router that quickly decides which to use based on conversation type, complexity, tool needs, and your explicit intent", trained on signals such as when users switch models.[9](https://openai.com/index/introducing-gpt-5/) OpenRouter sells a router for coding agents that rates each turn with a fast decision model and weighs measured pass rate, speed and cost per solved task.[10](https://openrouter.ai/docs/guides/routing/routers/auto-code.md) Not Diamond sells routing for coding agents on the promise of frontier quality at a fraction of the price.[11](https://www.notdiamond.ai/) The research falls into five threads.

**Cascades: try cheap first, defer on doubt.** FrugalGPT sends a query through models from cheap to dear and stops once a learned scorer trusts the answer, matching GPT-4 at up to 98% lower cost.[12](https://arxiv.org/abs/2305.05176) Later work studies the deferral signal: whether a weaker model's sampled answers agree,[13](https://arxiv.org/abs/2310.03094) or token-level uncertainty, since uncertainty over a whole sequence is biased by its length.[14](https://arxiv.org/abs/2404.10136) AutoMix has the small model verify its own answer and routes on that noisy signal, reporting over 50% lower cost at comparable quality.[15](https://arxiv.org/abs/2310.12963)

**Learned routers: decide before the work.** Hybrid LLM predicts a query's difficulty and makes up to 40% fewer calls to the large model.[16](https://arxiv.org/abs/2404.14618) RouteLLM trains routers on Chatbot Arena preference data to choose between a strong and a weak model,[17](https://arxiv.org/abs/2406.18665) and reports over 85% lower cost on MT Bench at 95% of GPT-4's quality.[18](https://www.lmsys.org/blog/2024-07-01-routellm/) RouterBench compares such routers over 405,000 inference outcomes,[19](https://arxiv.org/abs/2403.12031) and a 2025 survey maps strategies by when they decide and what they look at.[20](https://arxiv.org/abs/2502.00409)

**Routing as a policy.** Router-R1 makes the router an LLM, trained with reinforcement learning to call models over several rounds and combine their answers.[21](https://arxiv.org/abs/2506.09033) Arch-Router routes on preferences the user writes down ("code review goes here") instead of benchmark scores.[22](https://arxiv.org/abs/2506.16655) Anthropic's guide to agent design treats routing as a basic workflow that "classifies an input and directs it to a specialized followup task", and works well "where classification can be handled accurately".[23](https://www.anthropic.com/research/building-effective-agents)

**Routing agents, not prompts.** MasRouter routes multi-agent systems, choosing collaboration modes and roles as well as models.[24](https://arxiv.org/abs/2502.11133) ProgRouter notes that "existing cascade routing methods make one-shot, query-level decisions" and routes each step of a workflow by its progress.[25](https://arxiv.org/abs/2608.25992) TwinRouterBench points out that router benchmarks "never test whether a cheaper replacement preserves downstream task success", and scores routers on SWE-bench by real task resolution and real API spend.[8](https://arxiv.org/abs/2605.18859) Triage is closest to GATE: it routes software engineering tasks across light, standard and heavy tiers ("e.g., Haiku, Sonnet, Opus") to "the cheapest model tier whose output passes the same verification gate as the expensive model".[26](https://arxiv.org/abs/2604.07494)

**When cheap routing goes wrong.** An audit across 19 RouterBench task families found that the cheapest router that passed its audit violated its service contract on new requests in 32% of deployments.[4](https://arxiv.org/abs/2611.20417) Online formulations treat routing as an ongoing experiment with regret bounds, learning only from the answer actually deployed.[27](https://arxiv.org/abs/2606.07392) That is the contextual-bandit setting, where exploration choices are logged with their probabilities so other policies can be evaluated offline on the same data.[1](https://arxiv.org/abs/1003.0146)

GATE also leans on two older ideas: strong models can judge other models' work,[28](https://arxiv.org/abs/2306.05685) and an agent retried with written feedback on what went wrong does better than one simply retried.[3](https://arxiv.org/abs/2303.11366)

| Router | Decides | Learns from | Checks the result with |
|---|---|---|---|
| FrugalGPT, AutoMix | after each answer | labelled queries | a scorer or self-check |
| RouteLLM, Hybrid LLM | before the work | preference data | nothing |
| Router-R1 | over several rounds | reinforcement learning | a rule-based reward |
| GPT-5's router | before each reply | user signals | not stated |
| OpenRouter Auto Code | each agent turn | measured runs | failing tests |
| Triage | before the task | code health metrics | a verification gate |
| **GATE** | **before and after each turn** | **its own record** | **tests and a judge** |

The right-hand column is the difference that matters. A router that decides only before the work has to be right the first time, so it leans towards the expensive model whenever it is unsure. A router that checks the result can afford to be wrong cheaply, as long as the check is good and escalating is cheap. Most of GATE's design is about making that check good.

## Sources

1. Li, Chu, Langford and Schapire, [A Contextual-Bandit Approach to Personalized News Article Recommendation](https://arxiv.org/abs/1003.0146), WWW 2010.
2. Anthropic, [Pricing](https://platform.claude.com/docs/en/about-claude/pricing), Claude documentation.
3. Shinn et al., [Reflexion: Language Agents with Verbal Reinforcement Learning](https://arxiv.org/abs/2303.11366), arXiv, Mar 2023.
4. Hu et al., [When the Cheapest Feasible Router Fails: Auditing Deployment Commitments in Cost-Aware LLM Routing](https://arxiv.org/abs/2611.20417), arXiv, Nov 2026.
5. Deng et al., [SWE-Bench Pro: Can AI Agents Solve Long-Horizon Software Engineering Tasks?](https://arxiv.org/abs/2509.16941), arXiv, Sep 2025.
6. Scale AI, [SWE-bench_Pro-os](https://github.com/scaleapi/SWE-bench_Pro-os), GitHub.
7. OpenRouter, [Model routing benchmarks](https://openrouter.ai/benchmarks/routers).
8. Yang et al., [TwinRouterBench: Fast Static and Live Dynamic Evaluation for Realistic Agentic LLM Routing](https://arxiv.org/abs/2605.18859), arXiv, May 2026.
9. OpenAI, [Introducing GPT-5](https://openai.com/index/introducing-gpt-5/).
10. OpenRouter, [Auto Code](https://openrouter.ai/docs/guides/routing/routers/auto-code.md), documentation.
11. Not Diamond, [Model Routing for Coding Agents](https://www.notdiamond.ai/).
12. Chen, Zaharia and Zou, [FrugalGPT: How to Use Large Language Models While Reducing Cost and Improving Performance](https://arxiv.org/abs/2305.05176), arXiv, May 2023.
13. Yue et al., [Large Language Model Cascades with Mixture of Thoughts Representations for Cost-efficient Reasoning](https://arxiv.org/abs/2310.03094), ICLR 2024.
14. Gupta et al., [Language Model Cascades: Token-level uncertainty and beyond](https://arxiv.org/abs/2404.10136), arXiv, Apr 2024.
15. Aggarwal et al., [AutoMix: Automatically Mixing Language Models](https://arxiv.org/abs/2310.12963), arXiv, Oct 2023.
16. Ding et al., [Hybrid LLM: Cost-Efficient and Quality-Aware Query Routing](https://arxiv.org/abs/2404.14618), arXiv, Apr 2024.
17. Ong et al., [RouteLLM: Learning to Route LLMs with Preference Data](https://arxiv.org/abs/2406.18665), arXiv, Jun 2024.
18. LMSYS, [RouteLLM: An Open-Source Framework for Cost-Effective LLM Routing](https://www.lmsys.org/blog/2024-07-01-routellm/), Jul 1, 2024.
19. Hu et al., [RouterBench: A Benchmark for Multi-LLM Routing System](https://arxiv.org/abs/2403.12031), arXiv, Mar 2024.
20. Varangot-Reille et al., [Doing More with Less: A Survey on Routing Strategies for Resource Optimisation in Large Language Model-Based Systems](https://arxiv.org/abs/2502.00409), arXiv, Feb 2025.
21. Zhang, Feng and You, [Router-R1: Teaching LLMs Multi-Round Routing and Aggregation via Reinforcement Learning](https://arxiv.org/abs/2506.09033), arXiv, Jun 2025.
22. Tran et al., [Arch-Router: Aligning LLM Routing with Human Preferences](https://arxiv.org/abs/2506.16655), arXiv, Jun 2025.
23. Anthropic, [Building effective agents](https://www.anthropic.com/research/building-effective-agents).
24. Yue et al., [MasRouter: Learning to Route LLMs for Multi-Agent Systems](https://arxiv.org/abs/2502.11133), arXiv, Feb 2025.
25. Li, Abdelmoniem and Wang, [ProgRouter: Online Progress-Guided Orchestration for Multi-Agent LLM Workflows under Quality-Cost Tradeoffs](https://arxiv.org/abs/2608.25992), arXiv, Aug 2026.
26. Madeyski, [Triage: Routing Software Engineering Tasks to Cost-Effective LLM Tiers via Code Quality Signals](https://arxiv.org/abs/2604.07494), arXiv, Apr 2026.
27. Belloni, Chen and Wei, [Online Pandora's Box for Contextual LLM Cascading](https://arxiv.org/abs/2606.07392), arXiv, Jun 2026.
28. Zheng et al., [Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena](https://arxiv.org/abs/2306.05685), arXiv, Jun 2023.
