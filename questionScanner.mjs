
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
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
});

const MODEL = 'openai/gpt-oss-20b';
const BATCH_SIZE = 5;
const PAUSE_BETWEEN_BATCHES_MS = 25000;

// Keep this at 5 while testing.
// Change to null later to audit every structurally valid question with AI.
const AI_TEST_LIMIT = 5;

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
    const response = await groq.chat.completions.create({
        model: MODEL,
        temperature: 0,
        max_completion_tokens: 3000,
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

Use false if the question is flawed, ambiguous, has multiple or no correct answers, has a wrong answer key, or has a materially inaccurate explanation. Explain the issue briefly. If uncertain, use false and explain why.
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
    });

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

    const passed = [];
    const aiRejected = [];
    const apiErrors = [];

    for (
        let i = 0;
        i < questionsToAudit.length;
        i += BATCH_SIZE
    ) {
        const chunk = questionsToAudit.slice(i, i + BATCH_SIZE);

        console.log(
            `\n⏳ Batch ${Math.floor(i / BATCH_SIZE) + 1}: ` +
            `questions ${i + 1}–${i + chunk.length} ` +
            `of ${questionsToAudit.length}`
        );

        // Sequential calls help avoid bursts of API requests.
        for (const question of chunk) {
            try {
                const audit = await auditQuestion(question);

                if (audit.is_valid) {
                    passed.push(question);
                    console.log(`✅ [PASSED] ${question.id}`);
                } else {
                    aiRejected.push({
                        ...question,
                        reason_for_fault: audit.error_found,
                    });

                    console.log(
                        `❌ [REVIEW FLAG] ${question.id}: ${audit.error_found}`
                    );
                }
            } catch (error) {
                apiErrors.push({
                    ...question,
                    reason_for_fault: error.message,
                });

                console.error(
                    `⚠️ [API ERROR] ${question.id}: ${error.message}`
                );
            }
        }

        if (i + BATCH_SIZE < questionsToAudit.length) {
            console.log('💤 Waiting before the next batch...');

            await new Promise((resolve) =>
                setTimeout(resolve, PAUSE_BETWEEN_BATCHES_MS)
            );
        }
    }

    // Test files are separate from your previous production reports.
    fs.writeFileSync(
        './src/data/cleanQuestions.test.json',
        JSON.stringify(passed, null, 2)
    );

    fs.writeFileSync(
        './faultyQuestionsLog.test.json',
        JSON.stringify(
            [...rejected, ...aiRejected],
            null,
            2
        )
    );

    fs.writeFileSync(
        './questionAuditErrors.test.json',
        JSON.stringify(apiErrors, null, 2)
    );

    fs.writeFileSync(
        './duplicateQuestions.json',
        JSON.stringify(duplicates, null, 2)
    );

    console.log('\n🎉 Test scan finished.');
    console.log(`✅ AI passed: ${passed.length}`);
    console.log(`❌ AI flagged: ${aiRejected.length}`);
    console.log(`⚠️ API errors: ${apiErrors.length}`);
    console.log(`📋 Structural issues: ${rejected.length}`);
    console.log(`🔁 Potential duplicates: ${duplicates.length}`);
    console.log('📁 Results saved to test files.');
}

runScanner().catch((error) => {
    console.error(`❌ SCANNER ERROR: ${error.message}`);
    process.exitCode = 1;
});