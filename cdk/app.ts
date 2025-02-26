#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CalculatorStack } from './stacks/calculator-stack';
import { UIStack } from './stacks/ui-stack';
import { DnsStack } from './stacks/dns-stack';

// Create app with cross-region references enabled
const app = new cdk.App({
  context: {
    '@aws-cdk/core:enableCrossRegionReferences': true
  }
});

// Define the domain name (lowercase)
const domainName = 'jakescalculatorbuddy.com';

// Create the DNS stack first (in us-east-1 for CloudFront compatibility)
const dnsStack = new DnsStack(app, 'JakesCalculatorDnsStack', {
  domainName,
  env: { region: 'us-east-1' }
});

// Create the calculator stack with API Gateway
const calculatorStack = new CalculatorStack(app, 'JakesCalculatorStack', {
  hostedZone: dnsStack.hostedZone,
  apiCertificate: dnsStack.apiCertificate,
  apiDomainName: dnsStack.apiDomainName,
  useCustomDomain: true,
  env: { region: 'us-west-2' }, // API and Lambda can be in any region
  crossRegionReferences: true // Enable cross-region references for this stack
});

// Create the UI stack with CloudFront and S3
const uiStack = new UIStack(app, 'JakesCalculatorUIStack', {
  apiEndpoint: calculatorStack.apiEndpoint,
  hostedZone: dnsStack.hostedZone,
  certificate: dnsStack.certificate,
  domainName: dnsStack.domainName,
  env: { region: 'us-west-2' }, // UI resources can be in any region
  crossRegionReferences: true // Enable cross-region references for this stack
});

// Add dependencies to ensure proper deployment order
uiStack.addDependency(calculatorStack);
calculatorStack.addDependency(dnsStack);

// Add tags to all stacks
const tags = {
  Project: 'JakesCalculatorBuddy',
  Environment: 'Production',
  Owner: 'Jake'
};

// Apply tags to all stacks
for (const stack of [dnsStack, calculatorStack, uiStack]) {
  cdk.Tags.of(stack).add('Project', tags.Project);
  cdk.Tags.of(stack).add('Environment', tags.Environment);
  cdk.Tags.of(stack).add('Owner', tags.Owner);
}

app.synth(); 