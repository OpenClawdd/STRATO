name: Feature Request
description: Suggest an idea for this project
labels: ["enhancement"]
body:
  - type: markdown
    attributes:
      value: |
        Thanks for taking the time to fill out this feature request!
  - type: textarea
    id: problem-statement
    attributes:
      label: Problem Statement
      description: Is your feature request related to a problem? Please describe. (e.g. I'm always frustrated when...)
    validations:
      required: true
  - type: textarea
    id: proposed-solution
    attributes:
      label: Proposed Solution
      description: A clear and concise description of what you want to happen.
    validations:
      required: true
  - type: textarea
    id: alternatives
    attributes:
      label: Alternatives Considered
      description: A clear and concise description of any alternative solutions or features you've considered.
    validations:
      required: false
