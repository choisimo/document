# Preparing for a Database Exam with an AI Tutor

This guide provides prompt templates for practising database concepts. An AI response is a study aid, not an authoritative answer key. Check SQL syntax against the DBMS and version named in your course, and check conceptual answers against the syllabus or assigned textbook.

## Define the study contract

Before requesting questions, provide these boundaries:

- **Course or exam**: exact name and, if applicable, exam date or syllabus revision.
- **Scope**: included chapters, SQL dialect, and explicitly excluded topics.
- **Current level**: concepts already understood and recent mistakes.
- **Task**: generate questions, explain a concept, review an answer, or run a timed simulation.
- **Format**: question count, answer type, difficulty progression, and feedback timing.
- **Evidence rule**: identify the source for disputed claims and mark uncertainty instead of inventing an answer.
- **Completion condition**: for example, two independent attempts scoring at least 80% with every wrong answer explained.

## Reusable prompt

```text
ROLE
Act as a database instructor for [COURSE OR EXAM].

SCOPE
- Syllabus revision: [REVISION OR DATE]
- DBMS and version: [FOR EXAMPLE, PostgreSQL 17]
- Included topics: [EXACT LIST]
- Excluded topics: [EXACT LIST]
- My current level: [BEGINNER / INTERMEDIATE / ADVANCED]

TASK
[CREATE QUESTIONS / EXPLAIN A CONCEPT / REVIEW SQL / RUN A MOCK EXAM]

OUTPUT
- Use [QUESTION COUNT] questions at [DIFFICULTY].
- Present one question at a time and wait for my answer.
- Do not reveal the answer before I respond.
- After each response, separate: observed error, governing rule, corrected reasoning,
  and one transfer question.
- For SQL, state the expected schema and dialect before judging correctness.
- If an answer depends on an unstated assumption, ask for it or show the alternatives.

COMPLETION
End with a table of topics tested, correct/incorrect results, recurring error patterns,
and the next three topics to review.
```

## Relational-model practice

```text
Use the study contract above. Test only entity relationships, keys, functional
dependencies, and normalization through 3NF. Create five scenario-based questions.
For each answer, distinguish a candidate key from a chosen primary key and show the
functional dependencies used in any normalization judgment. Wait for my response
after each question.
```

## SQL practice

```text
Use [DBMS VERSION]. Define two or three related tables with keys, nullability, and
five sample rows per table. Give me three tasks covering joins, grouping, and a
subquery. For each of my attempts:
1. Check the result against the supplied rows.
2. Identify dialect-specific syntax.
3. Explain null and duplicate-row behaviour.
4. Offer an alternative only when it changes clarity, correctness, or measured cost.
5. Do not call a query faster without an execution plan or stated assumptions.
```

## Timed mock exam

```text
Create a [MINUTES]-minute mock exam from [TOPIC LIST] with [QUESTION COUNT]
questions. Match this weighting: [WEIGHTS]. Do not provide hints during the exam.
After I submit all answers, score them against an explicit rubric. Separate facts,
dialect-dependent answers, and ambiguous questions. Re-score any ambiguous item only
after stating the assumption used.
```

## Review loop

1. Attempt each item without asking for the answer.
2. Record the reason for the chosen answer, not only the option or query.
3. Compare feedback with the course source when a claim affects scoring.
4. Turn each error into one rule and one new example.
5. Repeat with changed data or wording; memorising the original answer is not mastery.

The session is complete when the agreed score threshold is met on unseen questions and the remaining uncertainties are listed with sources to check.
