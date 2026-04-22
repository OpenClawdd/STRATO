name: Bug Report
description: Create a report to help us improve
labels: ["bug"]
body:
  - type: markdown
    attributes:
      value: |
        Thanks for taking the time to fill out this bug report!
  - type: textarea
    id: bug-description
    attributes:
      label: Bug Description
      description: A clear and concise description of what the bug is.
    validations:
      required: true
  - type: textarea
    id: steps-to-reproduce
    attributes:
      label: Steps to Reproduce
      description: Steps to reproduce the behavior.
      placeholder: |
        1. Go to '...'
        2. Click on '....'
        3. Scroll down to '....'
        4. See error
    validations:
      required: true
  - type: textarea
    id: expected-vs-actual
    attributes:
      label: Expected vs Actual Behavior
      description: A clear and concise description of what you expected to happen vs what actually happened.
    validations:
      required: true
  - type: input
    id: browser-os
    attributes:
      label: Browser and OS
      description: What browser and operating system are you using? (e.g. Chrome 114 on ChromeOS)
    validations:
      required: true
  - type: dropdown
    id: deployment
    attributes:
      label: Hosting Info
      description: Where is the app deployed?
      options:
        - Self-hosted (Docker/Node)
        - HF Spaces
        - Local setup
    validations:
      required: true
