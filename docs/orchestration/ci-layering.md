# CI Layering

<!-- TODO: Document the CI responsibility split between formal repositories and the fourth-repo. -->

## Overview

This document describes how CI responsibilities are divided between the three formal repositories and the fourth-repo orchestration layer.

## Formal Repository CI

The three formal repositories own standalone CI:

- install
- build
- test
- release

## Fourth-Repository CI

This repository owns only combination validity:

- submodule SHA integrity
- cross-repo workspace install
- Nx graph and affected evaluation
- boundary validation
- contract checks
- source integration checks
- change bundle validation

## Job Definitions

<!-- TODO: Document each CI job in detail with configuration and expected outputs. -->
