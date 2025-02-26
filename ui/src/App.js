import React, { useState, useEffect } from 'react';
import { GoogleOAuthProvider, GoogleLogin, googleLogout } from '@react-oauth/google';
import './App.css';

// Replace with your Google Client ID
const GOOGLE_CLIENT_ID = '679895792700-ru2un7hjac3baail4b31kh0kkk0bgnal.apps.googleusercontent.com';

// Hardcoded API endpoint - replace with your actual API endpoint
const API_ENDPOINT = 'https://40bfeqva02.execute-api.us-west-2.amazonaws.com/prod/calculate';

function App() {
    const [expression, setExpression] = useState('');
    const [result, setResult] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState(null);
    const [token, setToken] = useState('');

    // Check for existing token in localStorage on component mount
    useEffect(() => {
        const savedUser = localStorage.getItem('calculator_user');
        const savedToken = localStorage.getItem('calculator_token');

        if (savedUser && savedToken) {
            try {
                setUser(JSON.parse(savedUser));
                setToken(savedToken);
            } catch (e) {
                console.error('Error parsing saved user:', e);
                localStorage.removeItem('calculator_user');
                localStorage.removeItem('calculator_token');
            }
        }
    }, []);

    const handleGoogleSuccess = async (credentialResponse) => {
        // Get token from response
        const token = credentialResponse.credential;

        // Decode the JWT token to get user info
        const decodedToken = parseJwt(token);

        const userInfo = {
            name: decodedToken.name,
            email: decodedToken.email,
            picture: decodedToken.picture
        };

        // Save user info and token
        setUser(userInfo);
        setToken(token);

        // Store in localStorage for persistence
        localStorage.setItem('calculator_user', JSON.stringify(userInfo));
        localStorage.setItem('calculator_token', token);
    };

    const handleGoogleError = () => {
        setError('Google Sign-In failed. Please try again.');
    };

    const handleLogout = () => {
        // Clear user data
        setUser(null);
        setToken('');
        setExpression('');
        setResult('');

        // Remove from localStorage
        localStorage.removeItem('calculator_user');
        localStorage.removeItem('calculator_token');

        // Call Google logout
        googleLogout();
    };

    // Function to parse JWT token
    const parseJwt = (token) => {
        try {
            return JSON.parse(atob(token.split('.')[1]));
        } catch (e) {
            return null;
        }
    };

    const calculateResult = async () => {
        if (!expression.trim()) {
            setError('Please enter an expression');
            return;
        }

        if (!user) {
            setError('Please log in to use the calculator');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
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
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
            <div className="App">
                <header className="App-header">
                    <h1>Jake's Calculator Buddy</h1>
                </header>
                <main>
                    {!user ? (
                        <div className="login-container">
                            <h2>Sign in to use the calculator</h2>
                            <div className="google-login-button">
                                <GoogleLogin
                                    onSuccess={handleGoogleSuccess}
                                    onError={handleGoogleError}
                                    useOneTap
                                />
                            </div>
                            {error && <div className="error-message">{error}</div>}
                        </div>
                    ) : (
                        <>
                            <div className="user-info">
                                <img src={user.picture} alt={user.name} className="user-avatar" />
                                <div className="user-details">
                                    <p className="user-name">Welcome, {user.name}</p>
                                    <button onClick={handleLogout} className="logout-button">
                                        Sign Out
                                    </button>
                                </div>
                            </div>

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
                                        <div className="result">{result}</div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </main>
                <footer className="App-footer">
                    <p>© {new Date().getFullYear()} Jake's Calculator Buddy</p>
                </footer>
            </div>
        </GoogleOAuthProvider>
    );
}

export default App; 