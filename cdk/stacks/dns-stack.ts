import * as cdk from 'aws-cdk-lib';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import { Construct } from 'constructs';

export interface DnsStackProps extends cdk.StackProps {
    domainName: string;
}

export class DnsStack extends cdk.Stack {
    public readonly hostedZone: route53.IHostedZone;
    public readonly certificate: acm.ICertificate;
    public readonly apiCertificate: acm.ICertificate;
    public readonly domainName: string;
    public readonly apiDomainName: string;

    constructor(scope: Construct, id: string, props: DnsStackProps) {
        super(scope, id, {
            ...props,
            // DNS resources should be in us-east-1 for CloudFront compatibility
            env: { region: 'us-east-1' }
        });

        // Ensure domain name is lowercase
        this.domainName = props.domainName.toLowerCase();
        this.apiDomainName = `api.${this.domainName}`;

        console.log(`Using domain: ${this.domainName}`);
        console.log(`Using API domain: ${this.apiDomainName}`);

        // Create or import the hosted zone
        try {
            // Try to import an existing hosted zone
            this.hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
                domainName: this.domainName,
            });

            console.log(`Found existing hosted zone for ${this.domainName}`);
        } catch (error) {
            // If it doesn't exist, create a new one
            console.log(`Creating new hosted zone for ${this.domainName}`);
            this.hostedZone = new route53.HostedZone(this, 'HostedZone', {
                zoneName: this.domainName,
            });
        }

        // Create certificate for the main domain (for CloudFront)
        this.certificate = new acm.DnsValidatedCertificate(this, 'SiteCertificate', {
            domainName: this.domainName,
            subjectAlternativeNames: [`www.${this.domainName}`],
            hostedZone: this.hostedZone,
            region: 'us-east-1', // CloudFront requires certificates in us-east-1
        });

        // Create certificate for the API subdomain
        this.apiCertificate = new acm.DnsValidatedCertificate(this, 'ApiCertificate', {
            domainName: this.apiDomainName,
            hostedZone: this.hostedZone,
            region: 'us-east-1',
        });

        // Output the name servers (needed if you registered the domain elsewhere)
        new cdk.CfnOutput(this, 'NameServers', {
            value: cdk.Fn.join(', ', this.hostedZone.hostedZoneNameServers || []),
            description: 'Name servers for the hosted zone',
        });

        // Output the certificate ARNs
        new cdk.CfnOutput(this, 'CertificateArn', {
            value: this.certificate.certificateArn,
            description: 'ARN of the main domain certificate',
            exportName: 'MainCertificateArn',
        });

        new cdk.CfnOutput(this, 'ApiCertificateArn', {
            value: this.apiCertificate.certificateArn,
            description: 'ARN of the API domain certificate',
            exportName: 'ApiCertificateArn',
        });
    }
} 