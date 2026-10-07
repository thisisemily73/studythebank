import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

function formatOpenSATText(text) {
    if (!text) return '';

    return text.replace(
        /(?<![`$\\])(\d+(?:\.\d+)?\\(?:pi|sqrt|leq|geq|neq|times|cdot|pm))/g,
        '$$$1$'
    );
}

export default function FormattedText({ children }) {
    const formattedText = formatOpenSATText(children);

    return (
        <ReactMarkdown
            remarkPlugins={[remarkMath]}
            rehypePlugins={[rehypeKatex]}
        >
            {formattedText}
        </ReactMarkdown>
    );
}