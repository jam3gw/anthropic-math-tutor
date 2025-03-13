import React, { useState } from 'react';
import './App.css';

// Hardcoded API endpoint - replace with your actual API endpoint
const API_ENDPOINT = 'https://40bfeqva02.execute-api.us-west-2.amazonaws.com/prod/calculate';

function App() {
    const [expression, setExpression] = useState('');
    const [result, setResult] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [validationMessage, setValidationMessage] = useState('');
    const [validating, setValidating] = useState(false);
    const [showUserGuide, setShowUserGuide] = useState(true);
    const [enlargedImage, setEnlargedImage] = useState(false);

    // Basic client-side validation before sending to API
    const basicValidateExpression = (expr) => {
        if (!expr.trim()) {
            return { valid: false, message: 'Please enter an expression' };
        }

        // Very basic check - just to filter out obviously non-math inputs
        // eslint-disable-next-line no-useless-escape
        const hasMathChars = /[\d\+\-\*\/\^\(\)\[\]\{\}\=\<\>\%]/.test(expr);

        if (!hasMathChars) {
            return {
                valid: false,
                message: 'This doesn\'t look like a math problem. Please enter a mathematical expression.'
            };
        }

        return { valid: true, message: '' };
    };

    const calculateResult = async () => {
        // Clear previous results and errors
        setError('');
        setResult('');
        setValidationMessage('');

        // Basic client-side validation
        const validation = basicValidateExpression(expression);
        if (!validation.valid) {
            setValidationMessage(validation.message);
            return;
        }

        setLoading(true);
        setValidating(true);

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
            setValidating(false);

            if (response.ok) {
                setResult(data.explanation || data.result);
            } else {
                // Handle different types of errors
                if (data.error && data.error.includes('does not appear to be a math problem')) {
                    setValidationMessage(data.error);
                } else if (data.error && data.error.includes('appears to be invalid')) {
                    setValidationMessage(data.error);
                } else {
                    setError(data.error || 'An error occurred');
                }
            }
        } catch (error) {
            console.error('Error:', error);
            setError('Failed to connect to the server. Please try again.');
            setValidating(false);
        } finally {
            setLoading(false);
        }
    };

    const toggleUserGuide = () => {
        setShowUserGuide(!showUserGuide);
    };

    const toggleEnlargedImage = () => {
        setEnlargedImage(!enlargedImage);
    };

    return (
        <div className="App">
            <header className="App-header">
                <h1>Jake's Calculator Buddy</h1>
            </header>

            {/* User Guide Section - Always open by default */}
            <div className="user-guide-container">
                <div className="user-guide-header" onClick={toggleUserGuide}>
                    <h2>About Calculator Buddy</h2>
                    <span className="toggle-icon">{showUserGuide ? '▼' : '►'}</span>
                </div>

                {showUserGuide && (
                    <div className="user-guide-content">
                        <h3>What is Calculator Buddy?</h3>
                        <p>
                            Calculator Buddy is an intelligent calculator powered by Claude AI that not only solves
                            mathematical expressions but also provides detailed step-by-step explanations of the solution process.
                        </p>

                        <h3>Features</h3>
                        <ul>
                            <li><strong>Smart Validation:</strong> Ensures your input is a valid mathematical expression before processing</li>
                            <li><strong>Detailed Explanations:</strong> Provides step-by-step breakdowns of how the problem was solved</li>
                            <li><strong>Wide Range of Operations:</strong> Handles basic arithmetic, algebra, calculus, and more</li>
                            <li><strong>AI-Powered:</strong> Leverages Claude AI to understand and solve complex problems</li>
                        </ul>

                        <h3>How to Use</h3>
                        <ol>
                            <li>Enter a mathematical expression in the input field (e.g., "2 + 2", "5 * (3 + 2)", "solve for x: 2x + 3 = 7")</li>
                            <li>Click the "Calculate" button or press Enter</li>
                            <li>View the result and detailed explanation below</li>
                        </ol>

                        <h3>Example Expressions</h3>
                        <ul>
                            <li>Basic arithmetic: <code>3 + 4 * 2</code></li>
                            <li>Equations: <code>solve for x: 2x + 3 = 15</code></li>
                            <li>Calculus: <code>derivative of x^2 + 3x</code></li>
                            <li>Word problems: <code>If a train travels at 60 mph for 2 hours, how far does it go?</code></li>
                        </ul>

                        <p className="note">
                            <strong>Note:</strong> Calculator Buddy uses advanced AI to interpret your input, so you can phrase
                            questions in natural language. However, for best results, try to be clear and specific in your expressions.
                        </p>
                    </div>
                )}
            </div>

            {/* System Architecture Diagram */}
            <div className="system-diagram-container">
                <h2>System Architecture</h2>
                <p className="diagram-description">
                    This diagram shows how Calculator Buddy processes mathematical expressions using multiple Claude AI interactions.
                    <span className="click-hint">(Click on the image to enlarge)</span>
                </p>
                <div className="diagram-image-container">
                    <img
                        src="/images/system_diagram.png"
                        alt="Calculator Buddy System Architecture"
                        className={`system-diagram-image ${enlargedImage ? 'enlarged' : ''}`}
                        onClick={toggleEnlargedImage}
                    />
                </div>
            </div>

            {/* Enlarged Image Modal */}
            {enlargedImage && (
                <div className="image-modal-overlay" onClick={toggleEnlargedImage}>
                    <div className="image-modal-content">
                        <span className="close-modal" onClick={toggleEnlargedImage}>&times;</span>
                        <img
                            src="/images/system_diagram.png"
                            alt="Calculator Buddy System Architecture"
                            className="enlarged-image"
                        />
                    </div>
                </div>
            )}

            <main>
                <div className="calculator-container">
                    <div className="input-group">
                        <input
                            type="text"
                            value={expression}
                            onChange={(e) => {
                                setExpression(e.target.value);
                                // Clear validation message when user starts typing
                                if (validationMessage) setValidationMessage('');
                            }}
                            placeholder="Enter a mathematical expression (e.g., 2 + 2 or 5 * (3 + 2))"
                            className="expression-input"
                            onKeyPress={(e) => e.key === 'Enter' && calculateResult()}
                        />
                        <button
                            onClick={calculateResult}
                            disabled={loading || !expression.trim()}
                            className="calculate-button"
                        >
                            {loading ? (validating ? 'Validating...' : 'Calculating...') : 'Calculate'}
                        </button>
                    </div>

                    {validationMessage && <div className="validation-message">{validationMessage}</div>}
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