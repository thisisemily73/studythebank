
const ANSWER_KEYS = ['A', 'B', 'C', 'D'];

function normalizeText(value) {
    return String(value)
        .normalize('NFKC')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}

function normalizeChoiceText(value) {
    return String(value)
        .normalize('NFKC')
        .replace(/\s+/g, ' ')
        .trim();
}

export function prepareQuestions(questionBank) {
    const structurallySound = [];
    const rejected = [];

    for (let i = 0; i < questionBank.length; i++) {
        const item = questionBank[i];
        const innerQ = item?.question;
        const id = item?.id || `q_${i + 1}`;

        if (
            !item ||
            !innerQ ||
            typeof innerQ !== 'object' ||
            Array.isArray(innerQ)
        ) {
            rejected.push({
                id,
                reason_for_fault: 'Missing or invalid question object.',
            });
            continue;
        }

        const prompt = innerQ.question;
        const choices = innerQ.choices;
        const answer = String(innerQ.correct_answer ?? '')
            .trim()
            .toUpperCase();

        if (
            typeof prompt !== 'string' ||
            !prompt.trim() ||
            !choices ||
            typeof choices !== 'object' ||
            !ANSWER_KEYS.every(
                (key) =>
                    typeof choices[key] === 'string' &&
                    choices[key].trim()
            ) ||
            !ANSWER_KEYS.includes(answer)
        ) {
            rejected.push({
                ...item,
                id,
                reason_for_fault:
                    'Missing question text, choices, or valid answer key.',
            });
            continue;
        }

        const duplicateChoices = [];
        const seenChoices = new Map();

        for (const key of ANSWER_KEYS) {
            const normalized = normalizeChoiceText(choices[key]);

            if (seenChoices.has(normalized)) {
                duplicateChoices.push(
                    `${seenChoices.get(normalized)} and ${key}`
                );
            } else {
                seenChoices.set(normalized, key);
            }
        }

        if (duplicateChoices.length > 0) {
            rejected.push({
                ...item,
                id,
                reason_for_fault:
                    `Duplicate answer choices: ${duplicateChoices.join("; ")}.`,
            });
            continue;
        }

        const paragraph =
            typeof innerQ.paragraph === 'string' &&
                innerQ.paragraph.trim() &&
                innerQ.paragraph.trim().toLowerCase() !== 'null'
                ? `${innerQ.paragraph.trim()}\n\n`
                : '';

        const explanation =
            typeof innerQ.explanation === 'string'
                ? innerQ.explanation.trim()
                : '';

        structurallySound.push({
            id,
            source_index: i,
            section: String(item.domain || 'general').toLowerCase(),
            question: `${paragraph}${prompt.trim()}`,
            choices: ANSWER_KEYS.map(
                (key) => `${key}) ${choices[key].trim()}`
            ),
            correct_answer: answer,
            explanation: explanation || 'No explanation provided.',
            audit_flags: explanation ? [] : ['Missing explanation.'],
        });
    }

    return { structurallySound, rejected };
}

export function findDuplicateQuestions(questions) {
    const seen = new Map();
    const duplicates = [];

    for (const question of questions) {
        const normalizedPrompt = normalizeText(question.question);
        const normalizedChoices = question.choices
            .map(normalizeChoiceText)
            .join('|');
        const signature = `${normalizedPrompt}|${normalizedChoices}`;

        if (seen.has(signature)) {
            duplicates.push({
                id: question.id,
                source_index: question.source_index,
                duplicate_source_index: seen.get(signature).source_index,
                duplicate_of: seen.get(signature).id,
                reason_for_fault: 'Potential duplicate question and choices.',
            });
        } else {
            seen.set(signature, question);
        }
    }

    return duplicates;
}
