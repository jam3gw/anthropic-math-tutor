#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CalculatorStack } from './stacks/calculator-stack';
import { UIStack } from './stacks/ui-stack';

// Create the CDK app
const app = new cdk.App();

// Deploy API stack
const calculatorStack = new CalculatorStack(app, 'CalculatorStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-west-2'
  }
});

// Deploy UI stack with API endpoint
const uiStack = new UIStack(app, 'UIStack', {
  apiEndpoint: calculatorStack.apiEndpoint,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-west-2'
  }
});

// Add explicit dependency
uiStack.addDependency(calculatorStack);

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