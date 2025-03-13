import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';

// Mock fetch API
global.fetch = jest.fn();

describe('Calculator App', () => {
    beforeEach(() => {
        fetch.mockClear();
    });

    test('renders calculator interface', () => {
        render(<App />);

        // Check if main elements are rendered
        expect(screen.getByText(/Jake's Calculator Buddy/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/Enter a mathematical expression/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Calculate/i })).toBeInTheDocument();
    });

    test('shows validation message for empty input', () => {
        render(<App />);

        // Try to calculate with empty input
        const calculateButton = screen.getByRole('button', { name: /Calculate/i });
        fireEvent.click(calculateButton);

        // Check if validation message is shown
        expect(screen.getByText(/Please enter an expression/i)).toBeInTheDocument();
    });

    test('shows validation message for non-math input', () => {
        render(<App />);

        // Enter non-math text
        const input = screen.getByPlaceholderText(/Enter a mathematical expression/i);
        fireEvent.change(input, { target: { value: 'hello world' } });

        // Click calculate
        const calculateButton = screen.getByRole('button', { name: /Calculate/i });
        fireEvent.click(calculateButton);

        // Check if validation message is shown
        expect(screen.getByText(/This doesn't look like a math problem/i)).toBeInTheDocument();
    });

    test('clears validation message when user starts typing', () => {
        render(<App />);

        // Enter non-math text and trigger validation
        const input = screen.getByPlaceholderText(/Enter a mathematical expression/i);
        fireEvent.change(input, { target: { value: 'hello world' } });

        const calculateButton = screen.getByRole('button', { name: /Calculate/i });
        fireEvent.click(calculateButton);

        // Verify validation message appears
        expect(screen.getByText(/This doesn't look like a math problem/i)).toBeInTheDocument();

        // Start typing again
        fireEvent.change(input, { target: { value: 'hello world2' } });

        // Validation message should be gone
        expect(screen.queryByText(/This doesn't look like a math problem/i)).not.toBeInTheDocument();
    });

    test('shows loading state during calculation', async () => {
        // Mock successful API response
        fetch.mockImplementationOnce(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ explanation: '<p>The answer is 4</p>' })
            })
        );

        render(<App />);

        // Enter valid math expression
        const input = screen.getByPlaceholderText(/Enter a mathematical expression/i);
        fireEvent.change(input, { target: { value: '2 + 2' } });

        // Click calculate
        const calculateButton = screen.getByRole('button', { name: /Calculate/i });
        fireEvent.click(calculateButton);

        // Check if loading state is shown
        expect(screen.getByText(/Validating.../i)).toBeInTheDocument();

        // Wait for calculation to complete
        await waitFor(() => {
            expect(screen.queryByText(/Validating.../i)).not.toBeInTheDocument();
        });
    });

    test('displays result when calculation is successful', async () => {
        // Mock successful API response
        fetch.mockImplementationOnce(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ explanation: '<p>The answer is 4</p>' })
            })
        );

        render(<App />);

        // Enter valid math expression
        const input = screen.getByPlaceholderText(/Enter a mathematical expression/i);
        fireEvent.change(input, { target: { value: '2 + 2' } });

        // Click calculate
        const calculateButton = screen.getByRole('button', { name: /Calculate/i });
        fireEvent.click(calculateButton);

        // Wait for result to be displayed
        await waitFor(() => {
            expect(screen.getByText(/Result:/i)).toBeInTheDocument();
        });
    });

    test('displays server validation error for non-math input', async () => {
        // Mock API response for non-math input
        fetch.mockImplementationOnce(() =>
            Promise.resolve({
                ok: false,
                json: () => Promise.resolve({
                    error: 'The input does not appear to be a math problem. Please enter a valid mathematical expression.'
                })
            })
        );

        render(<App />);

        // Enter something that passes client validation but fails server validation
        const input = screen.getByPlaceholderText(/Enter a mathematical expression/i);
        fireEvent.change(input, { target: { value: '2 + two' } });

        // Click calculate
        const calculateButton = screen.getByRole('button', { name: /Calculate/i });
        fireEvent.click(calculateButton);

        // Wait for error message to be displayed
        await waitFor(() => {
            expect(screen.getByText(/does not appear to be a math problem/i)).toBeInTheDocument();
        });
    });

    test('displays server validation error for unsolvable math', async () => {
        // Mock API response for unsolvable math
        fetch.mockImplementationOnce(() =>
            Promise.resolve({
                ok: false,
                json: () => Promise.resolve({
                    error: 'The math problem appears to be invalid: Division by zero is undefined.'
                })
            })
        );

        render(<App />);

        // Enter unsolvable expression
        const input = screen.getByPlaceholderText(/Enter a mathematical expression/i);
        fireEvent.change(input, { target: { value: '5/0' } });

        // Click calculate
        const calculateButton = screen.getByRole('button', { name: /Calculate/i });
        fireEvent.click(calculateButton);

        // Wait for error message to be displayed
        await waitFor(() => {
            expect(screen.getByText(/Division by zero is undefined/i)).toBeInTheDocument();
        });
    });

    test('displays general error for server failures', async () => {
        // Mock API failure
        fetch.mockImplementationOnce(() =>
            Promise.reject(new Error('Network error'))
        );

        render(<App />);

        // Enter valid expression
        const input = screen.getByPlaceholderText(/Enter a mathematical expression/i);
        fireEvent.change(input, { target: { value: '2 + 2' } });

        // Click calculate
        const calculateButton = screen.getByRole('button', { name: /Calculate/i });
        fireEvent.click(calculateButton);

        // Wait for error message to be displayed
        await waitFor(() => {
            expect(screen.getByText(/Failed to connect to the server/i)).toBeInTheDocument();
        });
    });
}); 