
const ANSWER_KEYS = ['A', 'B', 'C', 'D'];

function normalizeText(value) {
    return String(value)
        .normalize('NFKC')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
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

        const choiceTexts = ANSWER_KEYS.map((key) =>
            normalizeText(choices[key])
        );

        if (new Set(choiceTexts).size !== choiceTexts.length) {
            rejected.push({
                ...item,
                id,
                reason_for_fault: 'Duplicate answer choices.',
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
        const signature = normalizeText(
            question.question + '|' + question.choices.join('|')
        );

        if (seen.has(signature)) {
            duplicates.push({
                id: question.id,
                duplicate_of: seen.get(signature),
                reason_for_fault: 'Potential duplicate question and choices.',
            });
        } else {
            seen.set(signature, question.id);
        }
    }

    return duplicates;
}