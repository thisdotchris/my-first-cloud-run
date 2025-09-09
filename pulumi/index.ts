import * as gcp from '@pulumi/gcp';
import * as pulumi from '@pulumi/pulumi';

const provider = new gcp.Provider('gcp', {
  credentials: process.env.GCP_CREDENTIALS,
  project: process.env.PROJECT_ID,
  region: process.env.REGION,
});

const artifactRegistry = new gcp.artifactregistry.Repository(
  'repository',
  {
    format: 'DOCKER',
    location: process.env.REGION,
    repositoryId: 'my-first-cloud-run-repo',
  },
  { provider },
);

export const repoUrl = pulumi.interpolate`${artifactRegistry.repositoryId}`;

const cloudRunService = new gcp.cloudrun.Service(
  'cloud-run-service',
  {
    location: process.env.REGION || 'asia-southeast1',
    name: process.env.SERVICE || 'my-cloud-run-service',
    template: {
      spec: {
        containers: [
          {
            image: process.env.IMAGE_URI || '',
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
