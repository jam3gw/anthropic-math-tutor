#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CalculatorStack } from './stacks/calculator-stack';
import { UIStack } from './stacks/ui-stack';

// Create the CDK app
const app = new cdk.App();

// Get the API endpoint from the environment if available
// This allows us to deploy the UI stack independently
const apiEndpointFromEnv = process.env.API_ENDPOINT;

// Custom domain configuration
const customDomain = 'calculator.jake-moses.com';
const hostedZoneName = 'jake-moses.com';

// Deploy API stack
const calculatorStack = new CalculatorStack(app, 'CalculatorStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-west-2'
  }
});

// Deploy UI stack with API endpoint and custom domain
const uiStack = new UIStack(app, 'UIStack', {
  apiEndpoint: apiEndpointFromEnv || calculatorStack.apiEndpoint,
  customDomain: customDomain,
  hostedZoneName: hostedZoneName,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-west-2'
  }
});

// Add explicit dependency only if we're deploying both stacks together
if (!apiEndpointFromEnv) {
  uiStack.addDependency(calculatorStack);
}

// Add tags to stacks
const tags = {
  Project: 'JakesCalculatorBuddy',
  Environment: 'Production',
  Owner: 'Jake'
};

// Apply tags to stacks
cdk.Tags.of(calculatorStack).add('Project', tags.Project);
cdk.Tags.of(calculatorStack).add('Environment', tags.Environment);
cdk.Tags.of(calculatorStack).add('Owner', tags.Owner);

cdk.Tags.of(uiStack).add('Project', tags.Project);
cdk.Tags.of(uiStack).add('Environment', tags.Environment);
cdk.Tags.of(uiStack).add('Owner', tags.Owner);

app.synth(); 