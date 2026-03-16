/**
 * AWS service icon configuration and naming conventions.
 *
 * Each entry maps a service slug (matching AWSService.id) to:
 *   - abbr:      Short abbreviation displayed inside the coloured icon badge.
 *   - color:     Background colour drawn from the official AWS category palette.
 *   - textColor: Foreground colour (always white for contrast).
 *
 * A reverse mapping from official service names to IDs is also exported so
 * that the AnswerPanel (which stores full names) can resolve icons without
 * duplicating slug logic.
 */

// ---------------------------------------------------------------------------
// Icon config type
// ---------------------------------------------------------------------------

export interface AwsIconConfig {
  abbr: string;
  color: string;
  textColor: string;
}

// ---------------------------------------------------------------------------
// AWS category brand colours
// (from the official AWS Architecture Icons colouring guidelines)
// ---------------------------------------------------------------------------

export const CATEGORY_COLORS: Record<string, string> = {
  compute:       "#ED7100",
  storage:       "#569A31",
  databases:     "#C925D1",
  integration:   "#E7157B",
  security:      "#DD344C",
  networking:    "#8C4FFF",
  observability: "#E7157B",
  analytics:     "#1A9C3E",
};

// ---------------------------------------------------------------------------
// Per-service icon config  (keyed by AWSService.id)
// ---------------------------------------------------------------------------

export const SERVICE_ICONS: Record<string, AwsIconConfig> = {
  // Compute
  lambda:               { abbr: "λ",    color: "#ED7100", textColor: "#fff" },
  "ecs-fargate":        { abbr: "ECS",  color: "#ED7100", textColor: "#fff" },
  ec2:                  { abbr: "EC2",  color: "#ED7100", textColor: "#fff" },
  batch:                { abbr: "BAT",  color: "#ED7100", textColor: "#fff" },
  mediaconvert:         { abbr: "MC",   color: "#ED7100", textColor: "#fff" },

  // Storage
  s3:                   { abbr: "S3",   color: "#569A31", textColor: "#fff" },
  efs:                  { abbr: "EFS",  color: "#569A31", textColor: "#fff" },
  ebs:                  { abbr: "EBS",  color: "#569A31", textColor: "#fff" },

  // Databases
  dynamodb:             { abbr: "DDB",  color: "#C925D1", textColor: "#fff" },
  aurora:               { abbr: "AU",   color: "#C925D1", textColor: "#fff" },
  elasticache:          { abbr: "EC$",  color: "#C925D1", textColor: "#fff" },
  timestream:           { abbr: "TS",   color: "#C925D1", textColor: "#fff" },
  rds:                  { abbr: "RDS",  color: "#C925D1", textColor: "#fff" },

  // Integration
  sqs:                  { abbr: "SQS",  color: "#E7157B", textColor: "#fff" },
  sns:                  { abbr: "SNS",  color: "#E7157B", textColor: "#fff" },
  eventbridge:          { abbr: "EB",   color: "#E7157B", textColor: "#fff" },
  "step-functions":     { abbr: "SF",   color: "#E7157B", textColor: "#fff" },
  "api-gateway":        { abbr: "APIG", color: "#E7157B", textColor: "#fff" },
  appsync:              { abbr: "AS",   color: "#E7157B", textColor: "#fff" },
  "iot-core":           { abbr: "IoT",  color: "#E7157B", textColor: "#fff" },

  // Security
  iam:                  { abbr: "IAM",  color: "#DD344C", textColor: "#fff" },
  cognito:              { abbr: "COG",  color: "#DD344C", textColor: "#fff" },
  kms:                  { abbr: "KMS",  color: "#DD344C", textColor: "#fff" },
  "secrets-manager":    { abbr: "SM",   color: "#DD344C", textColor: "#fff" },
  waf:                  { abbr: "WAF",  color: "#DD344C", textColor: "#fff" },
  acm:                  { abbr: "ACM",  color: "#DD344C", textColor: "#fff" },

  // Networking
  vpc:                  { abbr: "VPC",  color: "#8C4FFF", textColor: "#fff" },
  route53:              { abbr: "R53",  color: "#8C4FFF", textColor: "#fff" },
  "global-accelerator": { abbr: "GA",   color: "#8C4FFF", textColor: "#fff" },
  privatelink:          { abbr: "PL",   color: "#8C4FFF", textColor: "#fff" },
  cloudfront:           { abbr: "CF",   color: "#8C4FFF", textColor: "#fff" },

  // Observability
  cloudwatch:           { abbr: "CW",   color: "#E7157B", textColor: "#fff" },
  xray:                 { abbr: "X-R",  color: "#E7157B", textColor: "#fff" },
  cloudtrail:           { abbr: "CT",   color: "#E7157B", textColor: "#fff" },
  config:               { abbr: "CFG",  color: "#E7157B", textColor: "#fff" },

  // Analytics
  "kinesis-data-streams": { abbr: "KDS", color: "#1A9C3E", textColor: "#fff" },
  "kinesis-firehose":   { abbr: "KDF",  color: "#1A9C3E", textColor: "#fff" },
  glue:                 { abbr: "GL",   color: "#1A9C3E", textColor: "#fff" },
  athena:               { abbr: "ATH",  color: "#1A9C3E", textColor: "#fff" },
  redshift:             { abbr: "RS",   color: "#1A9C3E", textColor: "#fff" },
  opensearch:           { abbr: "ES",   color: "#1A9C3E", textColor: "#fff" },
};

// ---------------------------------------------------------------------------
// Name → ID reverse lookup
//
// Maps the official service names used in Answer.coreServices back to the
// canonical slug so AnswerPanel can resolve icons without special-casing.
// ---------------------------------------------------------------------------

export const SERVICE_NAME_TO_ID: Record<string, string> = {
  // Compute
  "aws lambda":                         "lambda",
  "aws fargate":                        "ecs-fargate",
  "aws fargate (ecs)":                  "ecs-fargate",
  "amazon ecs":                         "ecs-fargate",
  "amazon ec2":                         "ec2",
  "aws batch":                          "batch",
  "aws elemental mediaconvert":         "mediaconvert",

  // Storage
  "amazon s3":                          "s3",
  "amazon efs":                         "efs",
  "amazon ebs":                         "ebs",

  // Databases
  "amazon dynamodb":                    "dynamodb",
  "amazon aurora":                      "aurora",
  "amazon elasticache":                 "elasticache",
  "amazon timestream":                  "timestream",
  "amazon rds":                         "rds",

  // Integration
  "amazon sqs":                         "sqs",
  "amazon sns":                         "sns",
  "amazon eventbridge":                 "eventbridge",
  "aws step functions":                 "step-functions",
  "amazon api gateway":                 "api-gateway",
  "aws appsync":                        "appsync",
  "aws iot core":                       "iot-core",

  // Security
  "aws iam":                            "iam",
  "amazon cognito":                     "cognito",
  "aws kms":                            "kms",
  "aws secrets manager":                "secrets-manager",
  "aws waf":                            "waf",
  "aws certificate manager":            "acm",

  // Networking
  "amazon vpc":                         "vpc",
  "amazon route 53":                    "route53",
  "aws global accelerator":             "global-accelerator",
  "aws privatelink":                    "privatelink",
  "amazon cloudfront":                  "cloudfront",

  // Observability
  "amazon cloudwatch":                  "cloudwatch",
  "aws x-ray":                          "xray",
  "aws cloudtrail":                     "cloudtrail",
  "aws config":                         "config",

  // Analytics
  "amazon kinesis data streams":        "kinesis-data-streams",
  "amazon kinesis data firehose":       "kinesis-firehose",
  "aws glue":                           "glue",
  "aws glue data catalog":              "glue",
  "amazon athena":                      "athena",
  "amazon redshift":                    "redshift",
  "amazon opensearch service":          "opensearch",
};

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/** Resolve icon config by service slug (AWSService.id). */
export function getIconById(serviceId: string): AwsIconConfig {
  return (
    SERVICE_ICONS[serviceId] ?? {
      abbr: serviceId.slice(0, 3).toUpperCase(),
      color: "#232F3E",
      textColor: "#fff",
    }
  );
}

/**
 * Resolve icon config by official service name (as used in Answer.coreServices).
 * Falls back to a dark AWS-branded badge if the name is not in the lookup.
 */
export function getIconByName(serviceName: string): AwsIconConfig {
  const id = SERVICE_NAME_TO_ID[serviceName.toLowerCase()];
  if (id) return getIconById(id);

  // Derive a 2–3 character abbreviation from the last word(s) of the name.
  const words = serviceName.trim().split(/\s+/);
  const abbr =
    words.length >= 2
      ? (words[words.length - 2][0] + words[words.length - 1].slice(0, 2)).toUpperCase()
      : words[0].slice(0, 3).toUpperCase();

  return { abbr, color: "#232F3E", textColor: "#fff" };
}
