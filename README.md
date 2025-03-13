# Jake's Calculator Buddy

A cloud-based intelligent math tutor application with Google authentication and custom domain support.

## Overview

_Deployment of a domain name is still ongoing_

Jake's Calculator Buddy is a serverless web application that helps users solve and understand mathematical expressions. The application leverages Claude AI to provide step-by-step explanations of mathematical concepts and calculations.

## Features

- **Intelligent Math Explanations**: Powered by Anthropic's Claude AI to provide detailed explanations of mathematical expressions
- **Secure Authentication**: Google Sign-In integration for user authentication
- **Custom Domain Support**: Professional branding with a custom domain (jakescalculatorbuddy.com)
- **User Tracking**: Analytics for tracking user engagement and popular calculations
- **Serverless Architecture**: Built on AWS services for scalability and reliability
- **Cross-Region Infrastructure**: Optimized deployment across multiple AWS regions

## Technical Architecture

The application is built using a modern serverless architecture on AWS:

### Frontend
- React.js single-page application
- Google OAuth integration
- Hosted on Amazon S3 and delivered via CloudFront CDN

### Backend
- AWS Lambda functions (Python) for processing calculations
- API Gateway for RESTful API endpoints
- DynamoDB for user tracking and analytics
- AWS Certificate Manager for SSL/TLS certificates
- Route 53 for DNS management

### Infrastructure as Code
- AWS CDK for infrastructure definition
- Modular stack design (DNS, API, UI)
- Cross-region resource management

## Deployment

The application uses a multi-stack deployment approach:

1. **DNS Stack**: Manages domain configuration and SSL certificates
2. **Calculator Stack**: Handles the API Gateway and Lambda functions
3. **UI Stack**: Manages the frontend hosting and distribution

## Getting Started

### Prerequisites
- AWS Account
- Node.js and npm
- AWS CDK CLI
- Python 3.9+
- Anthropic API key

### Setup and Deployment
1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Bootstrap AWS CDK:
   ```
   cdk bootstrap aws://ACCOUNT_ID/us-east-1 aws://ACCOUNT_ID/us-west-2
   ```
4. Deploy the stacks:
   ```
   cdk deploy --all
   ```

## Security

- All API requests require authentication via Google Sign-In
- HTTPS enforced for all communications
- API keys stored securely in AWS SSM Parameter Store
- CORS configured to restrict access to approved domains

## License

[MIT License](LICENSE)

## Acknowledgements

- Anthropic for the Claude AI API
- Google for authentication services
- AWS for cloud infrastructure

# Calculator Buddy - Math Validation Testing

This repository contains the code for Jake's Calculator Buddy, a web application that helps users solve and understand mathematical expressions. The application uses Claude AI to validate and solve math problems.

## Validation Features

The application includes validation to ensure:
1. The input is a mathematical problem/expression
2. The problem is solvable using standard mathematical rules

## Project Rules

This project follows a set of standardized rules and guidelines located in the `.cursor/rules` directory. These rules ensure consistency, quality, and best practices across the codebase.

Key rule categories include:
- [Rule Format Guidelines](.cursor/rules/rule_format.mdc)
- [Math Validation Rules](.cursor/rules/math_validation.mdc)
- [API Key Handling Rules](.cursor/rules/api_key_handling.mdc)
- [Testing Requirements Rules](.cursor/rules/testing_requirements.mdc)
- [Test Execution Rules](.cursor/rules/test_execution.mdc)

For more information, see the [Rules README](.cursor/rules/README.mdc).

## Testing the Validation Functionality

### Automated Tests

To run all automated tests (both backend and frontend):

```bash
python run_tests.py
```

This script will:
1. Install necessary dependencies
2. Run backend tests for the Lambda function
3. Run frontend tests for the React application
4. Report if all tests passed

### Backend Tests

To run only the backend tests:

```bash
cd lambda
python -m pytest test_lambda_function.py -v
```

These tests use mocking to test the validation functionality without making actual API calls to Claude.

### Frontend Tests

To run only the frontend tests:

```bash
cd ui
npm test -- --watchAll=false
```

These tests verify that the UI correctly handles validation messages and API responses.

### Manual Testing with Claude API

To test the Claude validation functionality with real API calls:

#### Checking Your API Key

First, verify that your API key is set correctly:

```bash
cd lambda
python check_api_key.py
```

This will check if the `ANTHROPIC_API_KEY` environment variable is set correctly and provide troubleshooting tips if there are issues.

#### Testing with Environment Variable

1. Set your Anthropic API key as an environment variable:
   ```bash
   export ANTHROPIC_API_KEY=your_api_key_here
   ```

2. Run the test script with an expression:
   ```bash
   cd lambda
   python test_claude_validation.py "2 + 2"
   ```

#### Testing with Direct API Key

If you're having trouble with environment variables, you can use the Python test runner:

```bash
cd lambda
python run_test_with_key.py "sk-ant-your-api-key" "2 + 2"
```

#### Test Cases

Try different expressions to test various scenarios:
```bash
python test_claude_validation.py "tell me a joke"  # Not a math problem
python test_claude_validation.py "5/0"             # Unsolvable (division by zero)
python test_claude_validation.py "(2 + 3"          # Unsolvable (unbalanced parentheses)
```

### Troubleshooting API Key Issues

If you're experiencing authentication errors:

1. **Check API Key Format**: Ensure your key starts with `sk-ant-`
2. **Verify Environment Variable**: Run `echo $ANTHROPIC_API_KEY` to see if it's set correctly
3. **Try Direct Method**: Use the `run_test_with_key.py` script to bypass environment variable issues
4. **Restart Terminal**: Sometimes you need to restart your terminal after setting environment variables
5. **Check API Key Validity**: Verify your API key is active in the Anthropic console
6. **Update Library**: Ensure you have the latest version of the Anthropic library with `pip install --upgrade anthropic`

## Deployment

Before deploying, always run the full test suite to ensure everything is working correctly:

```bash
python run_tests.py
```

If all tests pass, you can proceed with deployment.

## Implementation Details

### Claude-based Validation

The application uses Claude to validate math expressions by:
1. Sending a specialized prompt asking Claude to determine if the input is a math problem and if it's solvable
2. Requesting a structured JSON response with validation results
3. Using a smaller model (claude-3-haiku) with minimal tokens for efficiency

### Fallback Validation

If the Claude API call fails, the system falls back to regex-based validation that checks:
1. For mathematical operators, functions, and numbers
2. Balanced parentheses, brackets, and braces
3. Division by zero
4. Invalid syntax like consecutive operators

### Frontend Validation

The frontend provides:
1. Basic client-side validation for immediate feedback
2. Clear validation messages with different styling for validation vs. error messages
3. Loading states that indicate when validation is happening
