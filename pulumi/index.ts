import * as gcp from '@pulumi/gcp';
import * as pulumi from '@pulumi/pulumi';
// import { readFileSync } from 'fs';

const PROJECT_ID = 'my-terraform-project-471305';
const REGION = 'asia-southeast1';
const SERVICE = 'my-cloud-run-service';
// const REPO_OWNER = 'thisdotchris';
// const REPO = 'my-first-cloud-run-repo';
// const IMAGE = 'my-cloud-run-image';

// const credentials = readFileSync(
//   '/home/dev/terraform/my-first-cloud-run/my-terraform-project.json',
// ).toString();

const provider = new gcp.Provider('gcp', {
  //   credentials: process.env.GCP_CREDENTIALS,
  credentials: process.env.GCP_CREDENTIALS,
  project: process.env.PROJECT_ID || PROJECT_ID,
  region: process.env.REGION || REGION,
});

const artifactRegistry = new gcp.artifactregistry.Repository(
  'repository',
  {
    format: 'DOCKER',
    location: process.env.REGION || REGION,
    repositoryId: 'my-first-cloud-run-repo',
  },
  { provider },
);

export const repoUrl = pulumi.interpolate`${artifactRegistry.repositoryId}`;

const cloudRunService = new gcp.cloudrun.Service(
  'cloud-run-service',
  {
    location: process.env.REGION || REGION,
    name: process.env.SERVICE || SERVICE,
    template: {
      spec: {
        containers: [
          {
            // image: process.env.IMAGE_URI || '',
            image:
              'asia-southeast1-docker.pkg.dev/my-terraform-project-471305/my-first-cloud-run-repo/my-cloud-run-image:46c72e919c1986dd2eb55029c54ede80461a5750',
            ports: [{ containerPort: 3000 }],
          },
        ],
      },
    },
  },
  { provider },
);

new gcp.cloudrun.IamMember(
  'cloud-run-invoker',
  {
    service: cloudRunService.name,
    location: cloudRunService.location,
    role: 'roles/run.invoker',
    member: 'allUsers',
  },
  { provider },
);

export const serviceUrl = cloudRunService.statuses.apply(
  (statuses) => statuses[0].url,
);
