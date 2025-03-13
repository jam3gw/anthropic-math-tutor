#!/usr/bin/env python3
"""
Manual test script for Claude validation functionality.
This script allows you to test the Claude validation with real API calls.

Usage:
    python test_claude_validation.py "2 + 2"
    python test_claude_validation.py "tell me a joke"
    python test_claude_validation.py "5/0"
    
    # With explicit API key:
    python test_claude_validation.py "2 + 2" "sk-ant-your-api-key"
"""

import sys
import os
import json
from anthropic import Anthropic
from lambda_function import validate_with_claude, basic_validation

def validate_api_key(api_key):
    """Validate the API key format and print helpful information."""
    if not api_key:
        return False, "No API key provided"
    
    if not api_key.startswith("sk-ant-"):
        return False, f"API key doesn't start with 'sk-ant-'. Got: {api_key[:7]}..."
    
    if len(api_key) < 20:  # Arbitrary minimum length
        return False, f"API key seems too short ({len(api_key)} chars)"
    
    # Key looks valid in format
    return True, f"API key format looks valid: {api_key[:7]}...{api_key[-4:]}"

def test_expression(expression, api_key=None):
    """Test an expression with both Claude validation and basic validation."""
    print(f"\n{'='*50}")
    print(f"Testing expression: '{expression}'")
    print(f"{'='*50}")
    
    # First, test with basic validation
    print("\n--- Basic Validation ---")
    is_valid, is_math, error_msg = basic_validation(expression)
    print(f"Is math problem: {is_math}")
    print(f"Is solvable: {is_valid}")
    if error_msg:
        print(f"Error message: {error_msg}")
    
    # Then, test with Claude if API key is provided
    if api_key:
        print("\n--- Claude Validation ---")
        
        # Validate API key format
        is_valid_key, key_message = validate_api_key(api_key)
        print(f"API key check: {key_message}")
        
        if not is_valid_key:
            print("Skipping Claude validation due to invalid API key format")
            return
        
        try:
            print(f"Initializing Anthropic client with API key: {api_key[:7]}...{api_key[-4:]}")
            client = Anthropic(api_key=api_key)
            
            print("Sending validation request to Claude...")
            is_valid, is_math, error_msg = validate_with_claude(client, expression)
            print(f"Is math problem: {is_math}")
            print(f"Is solvable: {is_valid}")
            if error_msg:
                print(f"Error message: {error_msg}")
        except Exception as e:
            print(f"Error with Claude validation: {str(e)}")
            print("\nTroubleshooting tips:")
            print("1. Check that your API key is correct and active")
            print("2. Ensure you have proper network connectivity")
            print("3. Check if your Anthropic account has sufficient quota")
            print("4. Try using a different API key")
    else:
        print("\n--- Claude Validation ---")
        print("Skipped: No API key provided")
    
    print(f"\n{'='*50}\n")

def main():
    # Check if an expression was provided
    if len(sys.argv) < 2:
        print("Please provide an expression to test.")
        print("Usage: python test_claude_validation.py \"2 + 2\"")
        print("       python test_claude_validation.py \"2 + 2\" \"sk-ant-your-api-key\"")
        return
    
    # Get the expression from command line arguments
    expression = sys.argv[1]
    
    # Check if API key was provided as argument (highest priority)
    api_key = None
    if len(sys.argv) >= 3:
        api_key = sys.argv[2]
        print("Using API key provided as command line argument")
    else:
        # Check for API key in environment variables
        api_key = os.environ.get('ANTHROPIC_API_KEY')
        if api_key:
            print("Using API key from ANTHROPIC_API_KEY environment variable")
        else:
            print("Warning: ANTHROPIC_API_KEY environment variable not set.")
            print("Only basic validation will be performed.")
            print("To use Claude validation, set the ANTHROPIC_API_KEY environment variable:")
            print("  export ANTHROPIC_API_KEY=sk-ant-your-api-key")
            print("Or provide it as a command line argument:")
            print("  python test_claude_validation.py \"2 + 2\" \"sk-ant-your-api-key\"")
    
    # Test the expression
    test_expression(expression, api_key)
    
    # Provide some predefined test cases if the user wants to try them
    if len(sys.argv) == 2:  # Only the expression was provided
        print("Here are some additional test cases you can try:")
        print("  python test_claude_validation.py \"2 + 2\"")
        print("  python test_claude_validation.py \"5 * (3 + 2)\"")
        print("  python test_claude_validation.py \"tell me a joke\"")
        print("  python test_claude_validation.py \"5/0\"")
        print("  python test_claude_validation.py \"(2 + 3\"")
        print("  python test_claude_validation.py \"5 + * 3\"")

if __name__ == "__main__":
    main() 