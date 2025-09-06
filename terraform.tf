terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# Artifact Registry to store Docker images
resource "google_artifact_registry_repository" "my_repo" {
  location      = var.region
  repository_id = "myapp-repo"
  description   = "Docker repo for my Cloud Run app"
  format        = "DOCKER"
}

# Cloud Build to build and push image
resource "google_cloudbuild_trigger" "my_build" {
  name        = "myapp-build-trigger"
  description = "Build & push Docker image to Artifact Registry"

  github {
    owner = var.github_owner
    name  = var.github_repo
    push {
      branch = "^main$"
    }
  }

  build {
    step {
      name = "gcr.io/cloud-builders/docker"
      args = [
        "build",
        "-t", "${google_artifact_registry_repository.my_repo.location}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.my_repo.repository_id}/myapp:latest",
        "."
      ]
    }
    step {
      name = "gcr.io/cloud-builders/docker"
      args = [
        "push",
        "${google_artifact_registry_repository.my_repo.location}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.my_repo.repository_id}/myapp:latest"
      ]
    }
    images = [
      "${google_artifact_registry_repository.my_repo.location}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.my_repo.repository_id}/myapp:latest"
    ]
  }
}

# Cloud Run service
resource "google_cloud_run_service" "my_service" {
  name     = "myapp-service"
  location = var.region

  template {
    spec {
      containers {
        image = "${google_artifact_registry_repository.my_repo.location}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.my_repo.repository_id}/myapp:latest"
        ports {
          container_port = 8080
        }
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }
}

# Allow unauthenticated access
resource "google_cloud_run_service_iam_member" "noauth" {
  location = google_cloud_run_service.my_service.location
  service  = google_cloud_run_service.my_service.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# Variables
variable "project_id" {}
variable "region" {
  default = "us-central1"
}
variable "github_owner" {}
variable "github_repo" {}
