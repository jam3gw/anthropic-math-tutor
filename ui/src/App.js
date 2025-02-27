import React, { useState } from 'react';
import './App.css';

// Hardcoded API endpoint - replace with your actual API endpoint
const API_ENDPOINT = 'https://40bfeqva02.execute-api.us-west-2.amazonaws.com/prod/calculate';

function App() {
    const [expression, setExpression] = useState('');
    const [result, setResult] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const calculateResult = async () => {
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

            const data = await response.json();

            if (response.ok) {
                setResult(data.explanation || data.result);
            } else {
                setError(data.error || 'An error occurred');
            }
        } catch (error) {
            console.error('Error:', error);
            setError('Failed to connect to the server. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="App">
            <header className="App-header">
                <h1>Jake's Calculator Buddy</h1>
            </header>
            <main>
                <div className="calculator-container">
                    <div className="input-group">
                        <input
                            type="text"
                            value={expression}
                            onChange={(e) => setExpression(e.target.value)}
                            placeholder="Enter a mathematical expression"
                            className="expression-input"
                            onKeyPress={(e) => e.key === 'Enter' && calculateResult()}
                        />
                        <button
                            onClick={calculateResult}
                            disabled={loading || !expression.trim()}
                            className="calculate-button"
                        >
                            {loading ? 'Calculating...' : 'Calculate'}
                        </button>
                    </div>

                    {error && <div className="error-message">{error}</div>}

                    {result && (
                        <div className="result-container">
                            <h2>Result:</h2>
                            <div
                                className="result"
                                dangerouslySetInnerHTML={{ __html: result }}
                            ></div>
                        </div>
                    )}
                </div>
            </main>
            <footer className="App-footer">
                <p>© {new Date().getFullYear()} Jake's Calculator Buddy</p>
            </footer>
        </div>
    );
}

export default App; 