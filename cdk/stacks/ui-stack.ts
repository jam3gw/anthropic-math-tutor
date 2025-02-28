import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53Targets from 'aws-cdk-lib/aws-route53-targets';
import * as path from 'path';
import { Construct } from 'constructs';

export interface UIStackProps extends cdk.StackProps {
    apiEndpoint: string;
    customDomain?: string;
    hostedZoneId?: string;
    hostedZoneName?: string;
}

export class UIStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: UIStackProps) {
        super(scope, id, props);

        // Determine if this is a development stack
        const isDev = id.includes('-dev');

        // Debug the API endpoint - we're not using it anymore but keeping for reference
        console.log('API Endpoint received in UIStack (not used):', props.apiEndpoint);

        // S3 bucket to host website
        const websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
            websiteIndexDocument: 'index.html',
            publicReadAccess: true,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ACLS,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
        });

        // Variables for CloudFront distribution
        let certificate: acm.ICertificate | undefined;
        let domainNames: string[] | undefined;

        // If custom domain is provided, set up certificate and alternate domain names
        if (props.customDomain && (props.hostedZoneId || props.hostedZoneName)) {
            console.log(`Setting up custom domain: ${props.customDomain}`);

            // Format domain names (main domain and www subdomain)
            const domainName = props.customDomain.toLowerCase();
            const wwwDomainName = domainName.startsWith('www.') ? domainName : `www.${domainName}`;

            // Import the hosted zone
            let hostedZone: route53.IHostedZone;
            if (props.hostedZoneId) {
                hostedZone = route53.HostedZone.fromHostedZoneId(this, 'HostedZone', props.hostedZoneId);
            } else if (props.hostedZoneName) {
                hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
                    domainName: props.hostedZoneName
                });
            } else {
                throw new Error('Either hostedZoneId or hostedZoneName must be provided with customDomain');
            }

            // Create certificate in us-east-1 (required for CloudFront)
            const certificateArn = new acm.DnsValidatedCertificate(this, 'Certificate', {
                domainName: domainName,
                subjectAlternativeNames: [wwwDomainName],
                hostedZone,
                region: 'us-east-1', // CloudFront requires certificates in us-east-1
            }).certificateArn;

            // Set certificate and domain names for CloudFront
            certificate = acm.Certificate.fromCertificateArn(this, 'DistCertificate', certificateArn);
            domainNames = [domainName, wwwDomainName];
        }

        // Create CloudFront distribution
        const distribution = new cloudfront.Distribution(this, 'Distribution', {
            defaultBehavior: {
                origin: new origins.S3Origin(websiteBucket),
                viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            },
            defaultRootObject: 'index.html',
            errorResponses: [
                {
                    httpStatus: 404,
                    responseHttpStatus: 200,
                    responsePagePath: '/index.html',
                },
            ],
            certificate,
            domainNames,
        });

        // Deploy website files
        new s3deploy.BucketDeployment(this, 'DeployWebsite', {
            sources: [s3deploy.Source.asset(path.join(__dirname, '../../ui/build'))],
            destinationBucket: websiteBucket,
            distribution,
            distributionPaths: ['/*'],
        });

        // If custom domain is provided, create DNS records
        if (props.customDomain && (props.hostedZoneId || props.hostedZoneName)) {
            const domainName = props.customDomain.toLowerCase();
            const wwwDomainName = domainName.startsWith('www.') ? domainName : `www.${domainName}`;

            // Import the hosted zone
            let hostedZone: route53.IHostedZone;
            if (props.hostedZoneId) {
                hostedZone = route53.HostedZone.fromHostedZoneId(this, 'HostedZoneForRecords', props.hostedZoneId);
            } else if (props.hostedZoneName) {
                hostedZone = route53.HostedZone.fromLookup(this, 'HostedZoneForRecords', {
                    domainName: props.hostedZoneName
                });
            } else {
                throw new Error('Either hostedZoneId or hostedZoneName must be provided with customDomain');
            }

            // Create A record for the apex domain (IPv4)
            new route53.ARecord(this, 'ApexRecord', {
                recordName: domainName,
                target: route53.RecordTarget.fromAlias(new route53Targets.CloudFrontTarget(distribution)),
                zone: hostedZone
            });

            // Create AAAA record for the apex domain (IPv6)
            new route53.AaaaRecord(this, 'ApexAaaaRecord', {
                recordName: domainName,
                target: route53.RecordTarget.fromAlias(new route53Targets.CloudFrontTarget(distribution)),
                zone: hostedZone
            });

            // Create A record for the www subdomain (IPv4)
            new route53.ARecord(this, 'WwwRecord', {
                recordName: wwwDomainName,
                target: route53.RecordTarget.fromAlias(new route53Targets.CloudFrontTarget(distribution)),
                zone: hostedZone
            });

            // Create AAAA record for the www subdomain (IPv6)
            new route53.AaaaRecord(this, 'WwwAaaaRecord', {
                recordName: wwwDomainName,
                target: route53.RecordTarget.fromAlias(new route53Targets.CloudFrontTarget(distribution)),
                zone: hostedZone
            });
        }

        // Output the CloudFront URL
        new cdk.CfnOutput(this, 'DistributionDomainName', {
            value: distribution.distributionDomainName,
            description: 'The CloudFront distribution domain name',
        });

        // Output the API endpoint for reference
        new cdk.CfnOutput(this, 'ApiEndpoint', {
            value: props.apiEndpoint,
            description: 'API Gateway endpoint URL (for reference)',
        });

        // Output the custom domain if provided
        if (props.customDomain) {
            new cdk.CfnOutput(this, 'CustomDomain', {
                value: props.customDomain,
                description: 'Custom domain for the application',
            });
        }
    }
} 