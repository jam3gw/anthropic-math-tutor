# Jake's Calculator Buddy

A cloud-based intelligent math tutor application with Google authentication and custom domain support.

## Overview

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
