#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CalculatorStack } from './stacks/calculator-stack';

const app = new cdk.App();
new CalculatorStack(app, 'CalculatorStack');
app.synth(); 