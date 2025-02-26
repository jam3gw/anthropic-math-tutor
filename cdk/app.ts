#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CalculatorStack } from './stacks/calculator-stack';
import { UIStack } from './stacks/ui-stack';

const app = new cdk.App();

// Deploy API stack
const calculatorStack = new CalculatorStack(app, 'CalculatorStack');

// Deploy UI stack with API endpoint
new UIStack(app, 'UIStack', {
  apiEndpoint: calculatorStack.apiEndpoint
});

app.synth(); 