import React, { useState } from 'react';
import { CheckCircle2, XCircle, HelpCircle } from 'lucide-react';

export default function QuestionCard({ question }) {
  const [selectedOption, setSelectedOption] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // question prop structure expected:
  // { questionText, options: { A: "...", B: "...", C: "...", D: "..." }, correctOption: "A", explanation: "..." }

  const handleSelect = (optionKey) => {
    if (isSubmitted) return; // Prevent changing answer after submission
    setSelectedOption(optionKey);
  };

  const handleSubmit = () => {
    if (!selectedOption) return;
    setIsSubmitted(true);
  };

  const isCorrect = selectedOption === question.correctOption;

  return (
    <div className="max-w-2xl mx-auto bg-white p-6 rounded-xl shadow-md border border-gray-100 my-4">
      {/* Question Text */}
      <p className="text-lg font-semibold text-gray-800 mb-6">
        {question.questionText}
      </p>

      {/* Options List (A, B, C, D) */}
      <div className="space-y-3 mb-6">
        {Object.entries(question.options).map(([key, value]) => {
          let optionStyle = "border-gray-200 hover:bg-gray-50 text-gray-700";

          if (selectedOption === key) {
            optionStyle = "border-blue-500 bg-blue-50 text-blue-700 font-medium";
          }

          if (isSubmitted) {
            if (key === question.correctOption) {
              optionStyle = "border-green-500 bg-green-50 text-green-800 font-medium";
            } else if (selectedOption === key && !isCorrect) {
              optionStyle = "border-red-500 bg-red-50 text-red-800 font-medium";
            }
          }

          return (
            <button
              key={key}
              onClick={() => handleSelect(key)}
              disabled={isSubmitted}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all flex items-center ${optionStyle}`}
            >
              <span className="w-8 h-8 rounded-full bg-white border border-gray-300 flex items-center justify-center font-bold mr-4 text-sm shadow-xs">
                {key}
              </span>
              <span className="flex-1">{value}</span>
            </button>
          );
        })}
      </div>

      {/* Action Button */}
      {!isSubmitted ? (
        <button
          onClick={handleSubmit}
          disabled={!selectedOption}
          className={`w-full py-3 rounded-lg font-semibold text-white transition-all ${
            selectedOption ? 'bg-blue-600 hover:bg-blue-700 cursor-pointer' : 'bg-gray-300 cursor-not-allowed'
          }`}
        >
          Check Answer
        </button>
      ) : (
        <div className={`p-4 rounded-lg mt-4 ${isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <div className="flex items-center font-bold mb-2">
            {isCorrect ? (
              <span className="text-green-700 flex items-center"><CheckCircle2 className="w-5 h-5 mr-2" /> Correct!</span>
            ) : (
              <span className="text-red-700 flex items-center"><XCircle className="w-5 h-5 mr-2" /> Incorrect. The correct answer was {question.correctOption}.</span>
            )}
          </div>
          <p className="text-sm text-gray-700 mt-2">
            <span className="font-semibold block mb-1">Explanation:</span>
            {question.explanation}
          </p>
        </div>
      )}
    </div>
  );
}