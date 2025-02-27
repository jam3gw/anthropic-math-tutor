import React, { useState, useCallback, KeyboardEvent, ChangeEvent } from 'react';
import './App.css';

// Hardcoded API endpoint - replace with your actual API endpoint
const API_ENDPOINT: string = 'https://40bfeqva02.execute-api.us-west-2.amazonaws.com/prod/calculate';

// Define types for our components
interface CalculatorInputProps {
    expression: string;
    setExpression: (expression: string) => void;
    onCalculate: () => void;
    isLoading: boolean;
}

interface ResultDisplayProps {
    result: string;
}

interface ApiResponse {
    explanation?: string;
    result?: string;
    error?: string;
    success?: boolean;
    formatted?: boolean;
}

// Calculator input component
const CalculatorInput: React.FC<CalculatorInputProps> = ({
    expression,
    setExpression,
    onCalculate,
    isLoading
}) => {
    const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>): void => {
        if (e.key === 'Enter') {
            onCalculate();
        }
    };

    const handleInputChange = (e: ChangeEvent<HTMLInputElement>): void => {
        setExpression(e.target.value);
    };

    return (
        <div className="input-group">
            <input
                type="text"
                value={expression}
                onChange={handleInputChange}
                placeholder="Enter a mathematical expression"
                className="expression-input"
                onKeyPress={handleKeyPress}
            />
            <button
                onClick={onCalculate}
                disabled={isLoading || !expression.trim()}
                className="calculate-button"
            >
                {isLoading ? 'Calculating...' : 'Calculate'}
            </button>
        </div>
    );
};

// Result display component
const ResultDisplay: React.FC<ResultDisplayProps> = ({ result }) => {
    if (!result) return null;

    return (
        <div className="result-container">
            <h2>Result:</h2>
            <div
                className="result"
                dangerouslySetInnerHTML={{ __html: result }}
            />
        </div>
    );
};

const App: React.FC = () => {
    const [expression, setExpression] = useState<string>('');
    const [result, setResult] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);

    const calculateResult = useCallback(async (): Promise<void> => {
        if (!expression.trim()) {
            setError('Please enter an expression');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    expression: expression
                }),
            });

            const data: ApiResponse = await response.json();

            if (response.ok) {
                setResult(data.explanation || data.result || '');
            } else {
                setError(data.error || 'An error occurred');
            }
        } catch (error) {
            console.error('Error:', error);
            setError('Failed to connect to the server. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [expression]);

    return (
        <div className="App">
            <header className="App-header">
                <h1>Jake's Calculator Buddy</h1>
            </header>
            <main>
                <div className="calculator-container">
                    <CalculatorInput
                        expression={expression}
                        setExpression={setExpression}
                        onCalculate={calculateResult}
                        isLoading={loading}
                    />

                    {error && <div className="error-message">{error}</div>}

                    <ResultDisplay result={result} />
                </div>
            </main>
            <footer className="App-footer">
                <p>© {new Date().getFullYear()} Jake's Calculator Buddy</p>
            </footer>
        </div>
    );
};

export default App; 