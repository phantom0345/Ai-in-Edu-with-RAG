import { QuizQuestion } from './src/types';

export const MOCK_DIAGNOSTIC_QUIZ: QuizQuestion[] = [
  {
    id: 1,
    question: "What is the derivative of x^2?",
    options: ["x", "2x", "x^2", "2"],
    correctAnswer: "2x",
    topic: "Derivatives",
  },
  {
    id: 2,
    question: "Evaluate the integral of 2x dx.",
    options: ["x^2 + C", "2x^2 + C", "x + C", "2 + C"],
    correctAnswer: "x^2 + C",
    topic: "Integrals",
  },
  {
    id: 3,
    question: "What is the limit of 1/x as x approaches infinity?",
    options: ["Infinity", "1", "0", "Undefined"],
    correctAnswer: "0",
    topic: "Limits",
  },
  {
    id: 4,
    question: "Which rule is used to differentiate a composition of functions?",
    options: ["Product Rule", "Quotient Rule", "Chain Rule", "Power Rule"],
    correctAnswer: "Chain Rule",
    topic: "Derivatives",
  },
  {
    id: 5,
    question: "What represents the area under a curve?",
    options: ["Derivative", "Integral", "Limit", "Slope"],
    correctAnswer: "Integral",
    topic: "Integrals",
  },
];

export const INITIAL_TOPICS = ["Derivatives", "Integrals", "Limits", "Functions", "Trigonometry"];

export const APP_NAME = "ClassMate AI";