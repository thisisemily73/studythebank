
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import Groq from 'groq-sdk';

import {
    prepareQuestions,
    findDuplicateQuestions,
} from './auditRules.mjs';

if (!process.env.GROQ_API_KEY) {
    console.error('❌ GROQ_API_KEY is missing from your .env file!');
    process.exit(1);
}

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
    maxRetries: 0,
});

const REPAIR_MODEL = 'openai/gpt-oss-20b';
const REVIEW_MODEL = 'openai/gpt-oss-120b';
const REPAIR_CONCURRENCY = 1;
const AUDIT_BATCH_SIZE = 6;

const REPORT_DIR = './audit-reports';
const configuredLimit = Number(process.env.QUESTION_AUDIT_LIMIT ?? 5);
const AI_TEST_LIMIT = process.argv.includes('--all')
    ? null
    : configuredLimit;
const AUDIT_ONLY = process.argv.includes('--audit-only');
const CHECKPOINT_PATH = `${REPORT_DIR}/questionAudit.checkpoint.json`;
const CHECKPOINT_VERSION = 6;
let dailyQuotaExceeded = false;

if (AI_TEST_LIMIT !== null && (!Number.isInteger(AI_TEST_LIMIT) || AI_TEST_LIMIT < 1)) {
    throw new Error('QUESTION_AUDIT_LIMIT must be a positive integer.');
}
if (process.argv.includes('--apply') && !process.argv.includes('--all')) {
    throw new Error('Use --apply only together with --all.');
}

function loadQuestionBank() {
    const filePath = './src/data/questionBank.js';

    if (!fs.existsSync(filePath)) {
        throw new Error(`Question bank not found: ${filePath}`);
    }

    const result = spawnSync(
        process.execPath,
        [
            '--input-type=module',
            '-e',
            `
                import { pathToFileURL } from 'node:url';
                const mod = await import(pathToFileURL(process.argv[1]));
                const data = mod.default ?? mod.questionBank ?? mod.questions;

                if (!Array.isArray(data)) {
                    throw new Error('Expected an exported question array.');
                }

                process.stdout.write(JSON.stringify(data));
            `,
            filePath,
        ],
        {
            encoding: 'utf8',
            maxBuffer: 100 * 1024 * 1024,
        }
    );

    if (result.error || result.status !== 0) {
        throw new Error(
            result.error?.message ||
            result.stderr ||
            'Could not load the question bank.'
        );
    }

    return JSON.parse(result.stdout);
}

async function auditQuestion(question) {
    const response = await withRateLimitRetry(() => groq.chat.completions.create({
        model: REVIEW_MODEL,
        temperature: 0,
        max_completion_tokens: 1500,
        response_format: { type: 'json_object' },
        messages: [
            {
                role: 'system',
                content: `
You are an SAT question quality auditor.

Briefly evaluate whether:
1. The question is clear and sufficiently specified.
2. The four choices are distinct and valid.
3. Exactly one choice is correct.
4. The answer key is correct.
5. The explanation is accurate.

Return ONLY a valid JSON object:
{"is_valid": true, "error_found": ""}

Use false only for a clear flaw. If uncertain, use true and set error_found to "Needs human review" with a brief reason. Never classify uncertainty as a confirmed fault.
`,
            },
            {
                role: 'user',
                content: JSON.stringify({
                    question: question.question,
                    choices: question.choices,
                    answer_key: question.correct_answer,
                    explanation: question.explanation,
                }),
            },
        ],
    }));

    const choice = response.choices?.[0];
    const content = choice?.message?.content;

    if (!content) {
        throw new Error(
            `No response content; finish reason: ${choice?.finish_reason ?? 'unknown'}.`
        );
    }

    const cleanedContent = content
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/, '')
        .trim();

    let audit;

    try {
        audit = JSON.parse(cleanedContent);
    } catch (error) {
        throw new Error(
            `Groq returned invalid JSON: ${error.message}\n` +
            `Response: ${content.slice(0, 1000)}`
        );
    }

    if (
        typeof audit.is_valid !== 'boolean' ||
        typeof audit.error_found !== 'string'
    ) {
        throw new Error('Groq returned an invalid audit response.');
    }

    return audit;
}

async function auditQuestions(questions) {
    const response = await withRateLimitRetry(() => groq.chat.completions.create({
        model: REVIEW_MODEL,
        temperature: 0,
        max_completion_tokens: 1200,
        response_format: { type: 'json_object' },
        messages: [
            {
                role: 'system',
                content: 'Audit every SAT question independently. Check clarity, four distinct valid choices, exactly one defensible correct answer, the answer key, and explanation accuracy. Return only JSON shaped as {"results":[{"source_index":0,"is_valid":true,"error_found":""}]}. Include exactly one result for each input source_index. Use false only for a clear flaw. If uncertain, use true and set error_found to "Needs human review" with a brief reason.',
            },
            {
                role: 'user',
                content: JSON.stringify({
                    questions: questions.map((question) => ({
                        source_index: question.source_index,
                        id: question.id,
                        question: question.question,
                        choices: question.choices,
                        answer_key: question.correct_answer,
                        explanation: question.explanation,
                    })),
                }),
            },
        ],
    }));

    const content = response.choices?.[0]?.message?.content;
    if (!content) throw new Error('No batch audit response content.');
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed.results)) {
        throw new Error('Batch audit response did not include a results array.');
    }
    const byIndex = new Map();
    for (const result of parsed.results) {
        if (
            !Number.isInteger(result.source_index) ||
            typeof result.is_valid !== 'boolean' ||
            typeof result.error_found !== 'string'
        ) {
            throw new Error('Batch audit returned an invalid result entry.');
        }
        byIndex.set(result.source_index, result);
    }
    return questions.map((question) => {
        const result = byIndex.get(question.source_index);
        if (!result) throw new Error(`Batch audit omitted source index ${question.source_index}.`);
        return result;
    });
}

function createAuditBatches(questions, maxItems = 6, maxChars = 16000) {
    const batches = [];
    let current = [];
    let currentChars = 0;
    for (const question of questions) {
        const chars = JSON.stringify(question).length;
        if (current.length && (current.length >= maxItems || currentChars + chars > maxChars)) {
            batches.push(current);
            current = [];
            currentChars = 0;
        }
        current.push(question);
        currentChars += chars;
    }
    if (current.length) batches.push(current);
    return batches;
}

async function withRateLimitRetry(request) {
    for (let attempt = 0; ; attempt++) {
        try {
            return await request();
        } catch (error) {
            const message = String(error.message || error);
            if (!message.includes('rate_limit_exceeded') || attempt >= 4) throw error;
            if (/on tokens per day \(TPD\)/i.test(message)) {
                dailyQuotaExceeded = true;
                throw error;
            }
            const retryMatch = message.match(/try again in (?:(\d+)m)?([\d.]+)s/i);
            const retryAfter = retryMatch
                ? Number(retryMatch[1] || 0) * 60 + Number(retryMatch[2])
                : NaN;
            if (retryAfter > 60) throw error;
            const waitMs = Number.isFinite(retryAfter)
                ? Math.ceil(retryAfter * 1000) + 500
                : Math.min(30000, 2000 * (2 ** attempt));
            console.warn(`⏳ Groq rate limit; retrying in ${(waitMs / 1000).toFixed(1)}s.`);
            await new Promise((resolve) => setTimeout(resolve, waitMs));
        }
    }
}

function needsHumanReview(audit) {
    return audit.error_found.toLowerCase().includes('needs human review');
}

async function proposeFix(original, issue, comparisonQuestion = null, attempt = 0) {
    const response = await withRateLimitRetry(() => groq.chat.completions.create({
        model: REPAIR_MODEL,
        temperature: 0,
        max_completion_tokens: 2000,
        messages: [
            {
                role: 'system',
                content: 'Repair the SAT question while preserving its domain and difficulty. When asked to resolve a duplicate, make a meaningfully distinct question testing the same skill; do not merely paraphrase. Return only JSON with question, choices, paragraph, explanation, correct_answer. question and explanation must be strings; choices must contain non-empty A, B, C, D strings; paragraph must be a string (empty is allowed); correct_answer must be A, B, C, or D. If you cannot confidently repair it, return {"cannot_repair":true,"reason":"..."}.',
            },
            {
                role: 'user',
                content: JSON.stringify({
                    issue,
                    source: original,
                    question_to_avoid: comparisonQuestion,
                }),
            },
        ],
    }));
    const content = response.choices?.[0]?.message?.content;
    if (!content) throw new Error('No repair response content.');
    const repaired = JSON.parse(
        content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    );
    if (repaired.cannot_repair) {
        return { status: 'needs_human_review', reason: repaired.reason || issue };
    }

    const corrected = {
        ...original,
        question: { ...original.question, ...repaired },
    };
    delete corrected.question.cannot_repair;
    const structuralCheck = prepareQuestions([corrected]);
    if (structuralCheck.rejected.length) {
        return {
            status: 'needs_human_review',
            reason: `Proposed fix failed structural checks: ${structuralCheck.rejected[0].reason_for_fault}`,
            proposed_question: corrected,
        };
    }

    const finalCheck = await auditQuestion(structuralCheck.structurallySound[0]);
    if (finalCheck.is_valid && !needsHumanReview(finalCheck)) {
        return { status: 'verified_fix', corrected_question: corrected };
    }

    const reviewIssue = finalCheck.error_found || 'Proposed fix did not pass review.';
    if (attempt === 0) {
        return proposeFix(
            corrected,
            `Your previous correction was judged flawed: ${reviewIssue}. Revise it so exactly one answer is defensibly correct.`,
            comparisonQuestion,
            1
        );
    }
    return {
        status: 'needs_human_review',
        retryable: true,
        reason: reviewIssue,
        proposed_question: corrected,
    };
}

async function runScanner() {
    console.log('🚀 Loading question bank...');

    let questionBank;

    try {
        questionBank = loadQuestionBank();
    } catch (error) {
        console.error(`❌ FILE ERROR: ${error.message}`);
        process.exitCode = 1;
        return;
    }

    console.log(`📊 Loaded ${questionBank.length} questions.`);

    const { structurallySound, rejected } =
        prepareQuestions(questionBank);
    // Local checks run on the entire bank.
    const duplicates = findDuplicateQuestions(structurallySound);

    console.log(
        `✅ Structural checks passed: ${structurallySound.length}`
    );
    console.log(`❌ Structural checks failed: ${rejected.length}`);
    console.log(`🔁 Potential duplicate questions: ${duplicates.length}`);

    // Only a small sample is sent to Groq during testing.
    const questionsToAudit =
        AI_TEST_LIMIT === null
            ? structurallySound
            : structurallySound.slice(0, AI_TEST_LIMIT);

    console.log(
        `🤖 Questions selected for AI review: ${questionsToAudit.length}`
    );

    fs.mkdirSync(REPORT_DIR, { recursive: true });
    const fingerprint = createHash('sha256')
        .update(JSON.stringify(questionBank))
        .digest('hex');
    let checkpoint = {
        version: CHECKPOINT_VERSION,
        fingerprint,
        auditResults: {},
        structuralResults: {},
        duplicateResults: {},
    };
    if (!process.argv.includes('--fresh') && fs.existsSync(CHECKPOINT_PATH)) {
        try {
            const saved = JSON.parse(fs.readFileSync(CHECKPOINT_PATH, 'utf8'));
            if (saved.version === CHECKPOINT_VERSION && saved.fingerprint === fingerprint) {
                checkpoint = saved;
                checkpoint.duplicateResults ||= {};
            }
            else console.log('♻️ Existing checkpoint is outdated or for a different bank; starting fresh.');
        } catch {
            console.log('♻️ Existing checkpoint is unreadable; starting fresh.');
        }
    }
    const saveCheckpoint = () => fs.writeFileSync(
        CHECKPOINT_PATH,
        JSON.stringify(checkpoint, null, 2)
    );

    // Repair structurally invalid questions first and save after each one.
    const structuralItems = questionBank
        .map((original, source_index) => ({ original, source_index }))
        .filter(({ original }) => prepareQuestions([original]).rejected.length);
    const structuralLimit = AUDIT_ONLY ? 0 : AI_TEST_LIMIT === null
        ? structuralItems.length
        : Math.min(AI_TEST_LIMIT, structuralItems.length);
    for (let start = 0; start < structuralLimit; start += REPAIR_CONCURRENCY) {
        const batch = structuralItems.slice(
            start,
            Math.min(start + REPAIR_CONCURRENCY, structuralLimit)
        );
        await Promise.all(batch.map(async ({ original, source_index }, offset) => {
            const position = start + offset;
            if (
                checkpoint.structuralResults[source_index] &&
                checkpoint.structuralResults[source_index].status !== 'needs_human_review' &&
                !checkpoint.structuralResults[source_index].retryable
            ) return;
            const issue = prepareQuestions([original]).rejected[0].reason_for_fault;
            const id = original?.id || `q_${source_index + 1}`;
            console.log(`🛠️ [STRUCTURAL FIX ${position + 1}/${structuralLimit}] ${id}`);
            try {
                checkpoint.structuralResults[source_index] = {
                    id,
                    source_index,
                    issue,
                    ...(await proposeFix(original, issue)),
                };
            } catch (error) {
                checkpoint.structuralResults[source_index] = {
                    id,
                    source_index,
                    issue,
                    status: 'needs_human_review',
                    retryable: true,
                    reason: `Could not produce or verify a fix: ${error.message}`,
                };
            }
            saveCheckpoint();
        }));
        if (dailyQuotaExceeded) {
            console.error('⛔ Daily Groq token quota reached. Checkpoint saved; stopping without applying changes.');
            process.exitCode = 1;
            return;
        }
    }

    const duplicateLimit = AUDIT_ONLY ? 0 : AI_TEST_LIMIT === null
        ? duplicates.length
        : Math.min(AI_TEST_LIMIT, duplicates.length);
    for (let start = 0; start < duplicateLimit; start += REPAIR_CONCURRENCY) {
        const batch = duplicates.slice(
            start,
            Math.min(start + REPAIR_CONCURRENCY, duplicateLimit)
        );
        await Promise.all(batch.map(async (duplicate, offset) => {
            const position = start + offset;
            const source_index = duplicate.source_index;
            if (
                checkpoint.duplicateResults[source_index] &&
                checkpoint.duplicateResults[source_index].status !== 'needs_human_review' &&
                !checkpoint.duplicateResults[source_index].retryable
            ) return;
            const original = questionBank[source_index];
            const comparison = questionBank[duplicate.duplicate_source_index];
            const issue = `Duplicate of question ${duplicate.duplicate_of}; rewrite this as a distinct question with the same domain and difficulty.`;
            console.log(`🔁 [DUPLICATE FIX ${position + 1}/${duplicateLimit}] ${duplicate.id}`);
            try {
                checkpoint.duplicateResults[source_index] = {
                    id: duplicate.id,
                    source_index,
                    issue,
                    ...(await proposeFix(original, issue, comparison)),
                };
            } catch (error) {
                checkpoint.duplicateResults[source_index] = {
                    id: duplicate.id,
                    source_index,
                    issue,
                    status: 'needs_human_review',
                    retryable: true,
                    reason: `Could not produce or verify a fix: ${error.message}`,
                };
            }
            saveCheckpoint();
        }));
        if (dailyQuotaExceeded) {
            console.error('⛔ Daily Groq token quota reached. Checkpoint saved; stopping without applying changes.');
            process.exitCode = 1;
            return;
        }
    }

    const pendingQuestions = questionsToAudit.filter((question) => {
        const result = checkpoint.auditResults[question.source_index];
        return !result || result.status === 'api_error' || result.fix?.retryable;
    });
    const auditBatches = createAuditBatches(pendingQuestions, AUDIT_BATCH_SIZE, 16000);
    for (let batchIndex = 0; batchIndex < auditBatches.length; batchIndex++) {
        const batch = auditBatches[batchIndex];
        console.log(
            `🤖 [AUDIT BATCH ${batchIndex + 1}/${auditBatches.length}] ` +
            `questions ${batch.map((question) => question.id).join(', ')}`
        );
        try {
            const audits = await auditQuestions(batch);
            for (let i = 0; i < batch.length; i++) {
                const question = batch[i];
                const source_index = question.source_index;
                const audit = audits[i];
                if (audit.is_valid && !needsHumanReview(audit)) {
                    checkpoint.auditResults[source_index] = { status: 'passed', question };
                    continue;
                }
                if (audit.is_valid) {
                    checkpoint.auditResults[source_index] = {
                        status: 'needs_human_review', question, issue: audit.error_found,
                    };
                    continue;
                }

                let fix;
                if (needsHumanReview(audit)) {
                    fix = { status: 'needs_human_review', reason: audit.error_found };
                } else if (AUDIT_ONLY) {
                    fix = {
                        status: 'needs_human_review',
                        retryable: true,
                        reason: 'Repair skipped by --audit-only.',
                    };
                } else {
                    try {
                        fix = await proposeFix(questionBank[source_index], audit.error_found);
                    } catch (error) {
                        fix = {
                            status: 'needs_human_review',
                            retryable: true,
                            reason: `Could not produce or verify a fix: ${error.message}`,
                        };
                    }
                }
                checkpoint.auditResults[source_index] = {
                    status: 'flagged', question, issue: audit.error_found, fix,
                };
            }
        } catch (error) {
            for (const question of batch) {
                checkpoint.auditResults[question.source_index] = {
                    status: 'api_error',
                    question,
                    issue: error.message,
                    retryable: true,
                };
            }
            console.error(`⚠️ Batch audit failed: ${error.message}`);
        }
        saveCheckpoint();
        if (dailyQuotaExceeded) {
            console.error('⛔ Daily Groq token quota reached. Checkpoint saved; stopping without applying changes.');
            process.exitCode = 1;
            return;
        }
        console.log(
            `💾 Checkpoint saved after ${Object.keys(checkpoint.auditResults).length} question reviews.`
        );
    }

    const auditEntries = Object.entries(checkpoint.auditResults);
    const passed = auditEntries.filter(([, result]) => result.status === 'passed')
        .map(([, result]) => result.question);
    const aiRejected = auditEntries.filter(([, result]) => result.status === 'flagged')
        .map(([, result]) => ({ ...result.question, reason_for_fault: result.issue }));
    const apiErrors = auditEntries.filter(([, result]) => result.status === 'api_error')
        .map(([, result]) => ({ ...result.question, reason_for_fault: result.issue }));
    const structuralSuggestions = structuralItems.map(({ original, source_index }) =>
        checkpoint.structuralResults[source_index] || {
            id: original?.id || `q_${source_index + 1}`,
            source_index,
            issue: prepareQuestions([original]).rejected[0].reason_for_fault,
            status: 'needs_human_review',
            reason: 'Not attempted in this scan limit.',
        }
    );
    const duplicateSuggestions = duplicates.map((duplicate) =>
        checkpoint.duplicateResults[duplicate.source_index] || {
            ...duplicate,
            status: 'needs_human_review',
            reason: 'Not attempted in this scan limit.',
        }
    );
    const fixSuggestions = [
        ...structuralSuggestions,
        ...duplicateSuggestions,
        ...auditEntries.filter(([, result]) => result.fix).map(([source_index, result]) => ({
            id: result.question.id,
            source_index: Number(source_index),
            issue: result.issue,
            ...result.fix,
        })),
        ...auditEntries.filter(([, result]) => result.status === 'needs_human_review').map(([source_index, result]) => ({
            id: result.question.id,
            source_index: Number(source_index),
            issue: result.issue,
            status: 'needs_human_review',
            reason: result.issue,
        })),
    ];
    saveCheckpoint();

    // Reports stay separate from the question bank; source questions are never overwritten.
    fs.writeFileSync(
        `${REPORT_DIR}/cleanQuestions.test.json`,
        JSON.stringify(passed, null, 2)
    );

    fs.writeFileSync(
        `${REPORT_DIR}/faultyQuestions.test.json`,
        JSON.stringify(
            [...rejected, ...aiRejected],
            null,
            2
        )
    );

    fs.writeFileSync(
        `${REPORT_DIR}/questionAuditErrors.test.json`,
        JSON.stringify(apiErrors, null, 2)
    );

    fs.writeFileSync(
        `${REPORT_DIR}/duplicateQuestions.test.json`,
        JSON.stringify(duplicates, null, 2)
    );

    fs.writeFileSync(
        `${REPORT_DIR}/questionFixes.test.json`,
        JSON.stringify(fixSuggestions, null, 2)
    );

    if (AI_TEST_LIMIT === null) {
        const candidateBank = [...questionBank];
        const verifiedRepairs = fixSuggestions.filter(
            (suggestion) => suggestion.status === 'verified_fix'
        );
        for (const suggestion of verifiedRepairs) {
            candidateBank[suggestion.source_index] = suggestion.corrected_question;
        }
        const candidateStructure = prepareQuestions(candidateBank);
        const candidateDuplicates = findDuplicateQuestions(candidateStructure.structurallySound);
        const allAuditsFinished = questionsToAudit.every(
            (question) => checkpoint.auditResults[question.source_index]
        );
        const allStructuralAndDuplicateFixesVerified = [
            ...structuralSuggestions,
            ...duplicateSuggestions,
        ].every((suggestion) => suggestion.status === 'verified_fix');
        const allFlaggedQuestionsResolved = auditEntries.every(([, result]) =>
            result.status === 'passed' || result.fix?.status === 'verified_fix'
        );
        const candidateReady =
            allAuditsFinished &&
            allStructuralAndDuplicateFixesVerified &&
            allFlaggedQuestionsResolved &&
            candidateStructure.rejected.length === 0 &&
            candidateDuplicates.length === 0;

        fs.writeFileSync(
            `${REPORT_DIR}/questionBank.candidate.json`,
            JSON.stringify(candidateBank, null, 2)
        );
        fs.writeFileSync(
            `${REPORT_DIR}/questionBank.candidate.summary.json`,
            JSON.stringify({
                original_count: questionBank.length,
                candidate_count: candidateBank.length,
                structural_issues: candidateStructure.rejected.length,
                potential_duplicates: candidateDuplicates.length,
                unresolved_ai_reviews: auditEntries.filter(([, result]) =>
                    result.status !== 'passed' && result.fix?.status !== 'verified_fix'
                ).length,
                candidate_ready_to_apply: candidateReady,
            }, null, 2)
        );

        if (process.argv.includes('--apply')) {
            if (!candidateReady) {
                console.error('⛔ Candidate is not clean enough to replace the live bank. See candidate summary and review report.');
                process.exitCode = 1;
            } else {
                fs.writeFileSync(
                    './src/data/questionBank.js',
                    `export const questionBank = ${JSON.stringify(candidateBank, null, 2)};\n`
                );
                console.log('✅ Verified candidate is now the live question bank.');
            }
        }
    }

    console.log('\n🎉 Question audit finished.');
    console.log(`✅ AI passed: ${passed.length}`);
    console.log(`❌ AI flagged: ${aiRejected.length}`);
    console.log(`⚠️ API errors: ${apiErrors.length}`);
    console.log(`📋 Structural issues: ${rejected.length}`);
    console.log(`🔁 Potential duplicates: ${duplicates.length}`);
    console.log(`🛠️ Fix suggestions: ${fixSuggestions.length}`);
    console.log(`📁 Reports saved in ${REPORT_DIR}/.`);
}

runScanner().catch((error) => {
    console.error(`❌ SCANNER ERROR: ${error.message}`);
    process.exitCode = 1;
});
